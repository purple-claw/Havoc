# The big kahuna - the actual execution tracer
# This is where we play God with Python code execution

from __future__ import annotations
import ast
import sys
import io
import time
import traceback
import threading
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple, Type, Callable, Union
from contextlib import contextmanager
from datetime import datetime
import builtins
import copy
import logging

# resource module is Unix-only, we don't need it on Windows
try:
    import resource as _resource
except ImportError:
    _resource = None  # Windows doesn't have this, and that's okay

from .models import (
    ExecutionStep, ExecutionContext, CallFrame, 
    HeapObject, StepType, VariableType
)
from .errors import (
    TracerError, ParseError, ExecutionError, 
    ValidationError, ResourceError, TimeoutError
)
from .config import TracerConfig, TracingMode, OptimizationLevel


# Set up logging because print debugging is so 2010
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NodeHandler(ABC):
    # Abstract handler for different AST nodes
    # Because switch statements are for languages that have them
    
    @abstractmethod
    def can_handle(self, node: ast.AST) -> bool:
        # Can this handler deal with this node type?
        pass
    
    @abstractmethod
    def handle(self, node: ast.AST, tracer: ExecutionTracer, context: ExecutionContext) -> Any:
        # Actually handle the node (do the thing!)
        pass


class AssignmentHandler(NodeHandler):
    # Handles x = 5, x += 1, and other exciting assignments
    
    def can_handle(self, node: ast.AST) -> bool:
        return isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign))
    
    def handle(self, node: ast.AST, tracer: ExecutionTracer, context: ExecutionContext) -> Any:
        context.current_line = node.lineno
        context.current_column = getattr(node, 'col_offset', 0)
        
        if isinstance(node, ast.Assign):
            # Regular assignment: x = value
            value = tracer._eval_expression(node.value, context)
            for target in node.targets:
                tracer._assign_value(target, value, context)
            
            step = context.create_step(
                StepType.ASSIGNMENT,
                source_code=ast.unparse(node) if hasattr(ast, 'unparse') else "",
                expression_value=value
            )
            tracer.steps.append(step)
            
        elif isinstance(node, ast.AugAssign):
            # Augmented assignment: x += 1 (because x = x + 1 is too verbose)
            target_value = tracer._eval_expression(node.target, context)
            operand_value = tracer._eval_expression(node.value, context)
            result = tracer._apply_operator(node.op, target_value, operand_value)
            tracer._assign_value(node.target, result, context)
            
            step = context.create_step(
                StepType.ASSIGNMENT,
                source_code=ast.unparse(node) if hasattr(ast, 'unparse') else "",
                expression_value=result
            )
            tracer.steps.append(step)


class ControlFlowHandler(NodeHandler):
    # If, while, for - the holy trinity of flow control
    
    def can_handle(self, node: ast.AST) -> bool:
        return isinstance(node, (ast.If, ast.While, ast.For))
    
    def handle(self, node: ast.AST, tracer: ExecutionTracer, context: ExecutionContext) -> Any:
        context.current_line = node.lineno
        context.current_column = getattr(node, 'col_offset', 0)
        
        if isinstance(node, ast.If):
            # The classic if/else
            condition = tracer._eval_expression(node.test, context)
            step = context.create_step(
                StepType.CONDITION,
                source_code=ast.unparse(node.test) if hasattr(ast, 'unparse') else "",
                condition_result=bool(condition)
            )
            tracer.steps.append(step)
            
            if condition:
                for stmt in node.body:
                    result = tracer._execute_node(stmt, context)
                    if isinstance(result, tuple) and result[0] == 'return':
                        return result
            elif node.orelse:
                for stmt in node.orelse:
                    result = tracer._execute_node(stmt, context)
                    if isinstance(result, tuple) and result[0] == 'return':
                        return result
                        
        elif isinstance(node, ast.While):
            # While loops: for when you don't know when to stop
            step = context.create_step(StepType.LOOP_START, source_code=ast.unparse(node.test) if hasattr(ast, 'unparse') else "")
            tracer.steps.append(step)
            
            while tracer._eval_expression(node.test, context):
                for stmt in node.body:
                    result = tracer._execute_node(stmt, context)
                    if isinstance(result, tuple):
                        if result[0] == 'return':
                            return result
                        elif result[0] == 'break':
                            return None
                        elif result[0] == 'continue':
                            break  # Break inner loop, continue outer
                
                step = context.create_step(StepType.LOOP_ITERATION)
                tracer.steps.append(step)
            
            step = context.create_step(StepType.LOOP_END)
            tracer.steps.append(step)
            
        elif isinstance(node, ast.For):
            # For loops: when you know exactly what you're iterating over
            iterable = tracer._eval_expression(node.iter, context)
            if iterable is None:
                return None
            
            step = context.create_step(StepType.LOOP_START, source_code=ast.unparse(node) if hasattr(ast, 'unparse') else "")
            tracer.steps.append(step)
            
            for item in iterable:
                tracer._assign_target(node.target, item, context)
                
                for stmt in node.body:
                    result = tracer._execute_node(stmt, context)
                    if isinstance(result, tuple):
                        if result[0] == 'return':
                            return result
                        elif result[0] == 'break':
                            return None
                        elif result[0] == 'continue':
                            break
                
                step = context.create_step(StepType.LOOP_ITERATION)
                tracer.steps.append(step)
            
            step = context.create_step(StepType.LOOP_END)
            tracer.steps.append(step)


class FunctionHandler(NodeHandler):
    # Functions: because copy-paste is bad
    
    def can_handle(self, node: ast.AST) -> bool:
        return isinstance(node, (ast.FunctionDef, ast.Return))
    
    def handle(self, node: ast.AST, tracer: ExecutionTracer, context: ExecutionContext) -> Any:
        if isinstance(node, ast.FunctionDef):
            # Define a function (but with tracing superpowers)
            def traced_function(*args, **kwargs):
                # Create a new stack frame like a proper language
                frame = CallFrame(
                    function_name=node.name,
                    module_name=context.local_namespace.get('__name__', '__main__'),
                    line_number=node.lineno,
                    arguments={param.arg: args[i] if i < len(args) else None 
                             for i, param in enumerate(node.args.args)}
                )
                context.push_frame(frame)
                
                # New local scope because Python
                old_locals = context.local_namespace
                context.local_namespace = {**context.global_namespace}
                
                # Bind arguments (the fun part)
                for i, param in enumerate(node.args.args):
                    if i < len(args):
                        context.local_namespace[param.arg] = args[i]
                
                # Record the call
                step = context.create_step(
                    StepType.FUNCTION_CALL,
                    source_code=node.name
                )
                tracer.steps.append(step)
                
                # Execute the function body
                return_value = None
                for stmt in node.body:
                    result = tracer._execute_node(stmt, context)
                    if isinstance(result, tuple) and result[0] == 'return':
                        return_value = result[1]
                        break
                
                # Record the return
                step = context.create_step(
                    StepType.FUNCTION_RETURN,
                    expression_value=return_value
                )
                tracer.steps.append(step)
                
                # Clean up our mess
                context.pop_frame()
                context.local_namespace = old_locals
                
                return return_value
            
            # Store the function for later use
            namespace = context.local_namespace if context.local_namespace else context.global_namespace
            namespace[node.name] = traced_function
            
        elif isinstance(node, ast.Return):
            # Return statement: the grand exit
            value = tracer._eval_expression(node.value, context) if node.value else None
            return ('return', value)


class ExecutionTracer:
    # The main event - this bad boy traces Python execution like a detective
    
    def __init__(self, config: Optional[TracerConfig] = None):
        self.config = config or TracerConfig()
        self.steps: List[ExecutionStep] = []
        self.handlers: List[NodeHandler] = [
            AssignmentHandler(),
            ControlFlowHandler(),
            FunctionHandler(),
        ]
        self._start_time: Optional[float] = None
        self._timeout_thread: Optional[threading.Thread] = None
        self._execution_stopped = False
        
        # Warn about questionable config choices
        warnings = self.config.validate()
        for warning in warnings:
            logger.warning(f"Config warning: {warning}")
    
    def trace(self, code: str) -> List[ExecutionStep]:
        # The main entry point - feed it code, get execution steps
        logger.info(f"Starting trace with mode={self.config.tracing_mode.name}")
        
        # Validate the input (garbage in, garbage out)
        if not code or not code.strip():
            raise ValidationError("Empty code provided")
        
        if len(code) > 1000000:  # 1MB of code? Really?
            raise ValidationError("Code size exceeds maximum limit")
        
        # Try to parse it
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            raise ParseError(
                f"Failed to parse code: {e}",
                line_number=e.lineno,
                source_code=code.split('\n')[e.lineno - 1] if e.lineno else None
            )
        
        # Set up the execution context
        context = ExecutionContext(
            max_steps=self.config.max_steps,
            max_recursion_depth=self.config.max_recursion_depth,
            max_memory_mb=self.config.max_memory_mb
        )
        
        # Execute with all the safety measures
        with self._execution_environment(context):
            try:
                self._execute_tree(tree, context)
            except TimeoutError:
                raise  # Timeout is timeout
            except Exception as e:
                raise ExecutionError(
                    f"Execution failed: {str(e)}",
                    line_number=context.current_line,
                    details={"exception_type": type(e).__name__}
                )
        
        logger.info(f"Trace completed with {len(self.steps)} steps")
        return self.steps
    
    @contextmanager
    def _execution_environment(self, context: ExecutionContext):
        # Set up the padded cell for code execution
        
        # Start the timer if needed
        if self.config.max_execution_time_seconds > 0:
            self._start_time = time.time()
            self._execution_stopped = False
            self._timeout_thread = threading.Thread(
                target=self._monitor_timeout,
                args=(self.config.max_execution_time_seconds,)
            )
            self._timeout_thread.daemon = True
            self._timeout_thread.start()
        
        # Hijack stdout/stderr
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()
        
        if self.config.capture_stdout:
            sys.stdout = stdout_buffer
        if self.config.capture_stderr:
            sys.stderr = stderr_buffer
        
        try:
            yield  # Let the magic happen
        finally:
            # Put everything back where we found it
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            
            context.stdout_buffer = stdout_buffer.getvalue()
            context.stderr_buffer = stderr_buffer.getvalue()
            
            self._execution_stopped = True
    
    def _monitor_timeout(self, timeout_seconds: float):
        # The execution watchdog - barks when things take too long
        while not self._execution_stopped:
            if time.time() - self._start_time > timeout_seconds:
                self._execution_stopped = True
                raise TimeoutError(
                    f"Execution exceeded {timeout_seconds} seconds",
                    timeout_seconds=timeout_seconds
                )
            time.sleep(0.1)  # Check every 100ms
    
    def _execute_tree(self, tree: ast.AST, context: ExecutionContext):
        # Execute the whole AST tree
        context.global_namespace = {
            '__name__': '__main__',
            '__builtins__': self._create_safe_builtins(),
        }
        context.local_namespace = context.global_namespace
        
        self._execute_node(tree, context)
    
    def _execute_node(self, node: ast.AST, context: ExecutionContext) -> Any:
        # Execute a single node - the workhorse of the tracer
        
        # Check if we've gone too far
        if context.step_count >= self.config.max_steps:
            raise ResourceError(
                f"Maximum steps ({self.config.max_steps}) exceeded",
                resource_type="steps"
            )
        
        # Find someone who can handle this node
        for handler in self.handlers:
            if handler.can_handle(node):
                return handler.handle(node, self, context)
        
        # Default handling for the orphans
        if isinstance(node, ast.Module):
            for stmt in node.body:
                result = self._execute_node(stmt, context)
                if isinstance(result, tuple):
                    return result
        
        elif isinstance(node, ast.Expr):
            value = self._eval_expression(node.value, context)
            if self.config.capture_expressions:
                step = context.create_step(
                    StepType.EXPRESSION,
                    expression_value=value
                )
                self.steps.append(step)
            return value
        
        elif isinstance(node, ast.Import):
            # Handle: import heapq, import collections, etc.
            namespace = context.local_namespace if context.local_namespace else context.global_namespace
            SAFE_MODULES = {
                'math', 'random', 'collections', 'heapq', 'itertools',
                'functools', 'string', 're', 'json', 'copy', 'bisect',
                'array', 'typing', 'dataclasses', 'enum', 'operator',
            }
            for alias in node.names:
                mod_name = alias.name.split('.')[0]
                if mod_name in SAFE_MODULES:
                    try:
                        mod = __import__(alias.name)
                        local_name = alias.asname if alias.asname else alias.name
                        namespace[local_name] = mod
                    except ImportError:
                        pass
            return None
        
        elif isinstance(node, ast.ImportFrom):
            # Handle: from collections import deque, from heapq import heappush, etc.
            namespace = context.local_namespace if context.local_namespace else context.global_namespace
            SAFE_MODULES = {
                'math', 'random', 'collections', 'heapq', 'itertools',
                'functools', 'string', 're', 'json', 'copy', 'bisect',
                'array', 'typing', 'dataclasses', 'enum', 'operator',
            }
            if node.module and node.module.split('.')[0] in SAFE_MODULES:
                try:
                    mod = __import__(node.module, fromlist=[a.name for a in node.names])
                    for alias in node.names:
                        obj = getattr(mod, alias.name, None)
                        local_name = alias.asname if alias.asname else alias.name
                        if obj is not None:
                            namespace[local_name] = obj
                except ImportError:
                    pass
            return None
        
        return None
    
    def _eval_expression(self, node: ast.AST, context: ExecutionContext) -> Any:
        # Evaluate expressions - where the math happens
        if node is None:
            return None
        
        namespace = context.local_namespace if context.local_namespace else context.global_namespace
        
        if isinstance(node, ast.Constant):
            return node.value  # Easy one
        
        elif isinstance(node, ast.Name):
            return namespace.get(node.id)  # Variable lookup
        
        elif isinstance(node, ast.List):
            return [self._eval_expression(elt, context) for elt in node.elts]
        
        elif isinstance(node, ast.Dict):
            return {
                self._eval_expression(k, context): self._eval_expression(v, context)
                for k, v in zip(node.keys, node.values)
            }
        
        elif isinstance(node, ast.Tuple):
            return tuple(self._eval_expression(elt, context) for elt in node.elts)
        
        elif isinstance(node, ast.Set):
            return {self._eval_expression(elt, context) for elt in node.elts}
        
        elif isinstance(node, ast.BinOp):
            # Binary operations: the bread and butter
            left = self._eval_expression(node.left, context)
            right = self._eval_expression(node.right, context)
            return self._apply_operator(node.op, left, right)
        
        elif isinstance(node, ast.UnaryOp):
            # Unary operations: for the minimalists
            operand = self._eval_expression(node.operand, context)
            return self._apply_unary_operator(node.op, operand)
        
        elif isinstance(node, ast.Compare):
            # Comparisons: because size matters
            left = self._eval_expression(node.left, context)
            for op, comp in zip(node.ops, node.comparators):
                right = self._eval_expression(comp, context)
                if not self._apply_comparison(op, left, right):
                    return False
                left = right
            return True
        
        elif isinstance(node, ast.Subscript):
            # Array/dict access: arr[index]
            obj = self._eval_expression(node.value, context)
            index = self._eval_expression(node.slice, context)
            try:
                return obj[index] if obj is not None else None
            except (KeyError, IndexError, TypeError):
                return None  # Fail silently like JavaScript
        
        elif isinstance(node, ast.Attribute):
            # Attribute access: obj.attr
            obj = self._eval_expression(node.value, context)
            return getattr(obj, node.attr, None) if obj is not None else None
        
        elif isinstance(node, ast.Call):
            return self._handle_call(node, context)  # Function calls get special treatment
        
        elif isinstance(node, ast.JoinedStr):
            # f-strings: because % formatting is dead
            parts = []
            for value in node.values:
                if isinstance(value, ast.Constant):
                    parts.append(str(value.value))
                elif isinstance(value, ast.FormattedValue):
                    val = self._eval_expression(value.value, context)
                    parts.append(str(val))
            return ''.join(parts)
        
        elif isinstance(node, ast.IfExp):
            # Ternary operator: x if condition else y
            condition = self._eval_expression(node.test, context)
            if condition:
                return self._eval_expression(node.body, context)
            else:
                return self._eval_expression(node.orelse, context)
        
        elif isinstance(node, ast.ListComp):
            # List comprehensions: because loops are verbose
            result = []
            iter_obj = self._eval_expression(node.generators[0].iter, context)
            if iter_obj is not None:
                for item in iter_obj:
                    # Temporary binding for the comprehension variable
                    old_val = namespace.get(node.generators[0].target.id) if isinstance(node.generators[0].target, ast.Name) else None
                    if isinstance(node.generators[0].target, ast.Name):
                        namespace[node.generators[0].target.id] = item
                    
                    # Check filters if any
                    pass_filters = True
                    for filter_expr in node.generators[0].ifs:
                        if not self._eval_expression(filter_expr, context):
                            pass_filters = False
                            break
                    
                    # Add to result if it passes
                    if pass_filters:
                        result.append(self._eval_expression(node.elt, context))
                    
                    # Restore old value
                    if isinstance(node.generators[0].target, ast.Name):
                        if old_val is not None:
                            namespace[node.generators[0].target.id] = old_val
                        else:
                            namespace.pop(node.generators[0].target.id, None)
            
            return result
        
        return None  # When all else fails
    
    def _handle_call(self, node: ast.Call, context: ExecutionContext) -> Any:
        # Handle function/method calls - the complicated ones
        namespace = context.local_namespace if context.local_namespace else context.global_namespace
        
        # Method call: obj.method()
        if isinstance(node.func, ast.Attribute):
            obj = self._eval_expression(node.func.value, context)
            if obj is not None:
                method = getattr(obj, node.func.attr, None)
                if callable(method):
                    args = [self._eval_expression(arg, context) for arg in node.args]
                    return method(*args)
        
        # Regular function call
        elif isinstance(node.func, ast.Name):
            func_name = node.func.id
            args = [self._eval_expression(arg, context) for arg in node.args]
            
            # Built-in functions
            if func_name in self._create_safe_builtins():
                func = self._create_safe_builtins()[func_name]
                if func_name == 'print':
                    # Capture print output
                    output = ' '.join(str(arg) for arg in args)
                    context.stdout_buffer += output + '\n'
                    step = context.create_step(StepType.PRINT, expression_value=output)
                    self.steps.append(step)
                    return None
                return func(*args) if callable(func) else None
            
            # User-defined functions
            elif func_name in namespace:
                func = namespace[func_name]
                if callable(func):
                    return func(*args)
        
        return None
    
    def _assign_value(self, target: ast.AST, value: Any, context: ExecutionContext):
        # Assign values to variables - the most basic operation
        namespace = context.local_namespace if context.local_namespace else context.global_namespace
        
        if isinstance(target, ast.Name):
            # Simple assignment: x = value
            namespace[target.id] = value
            if isinstance(value, (list, dict, set)):
                context.track_heap_object(value)  # Track mutable objects
                
        elif isinstance(target, ast.Subscript):
            # Index assignment: arr[i] = value
            obj = self._eval_expression(target.value, context)
            index = self._eval_expression(target.slice, context)
            if obj is not None and index is not None:
                try:
                    obj[index] = value
                except (TypeError, KeyError, IndexError):
                    pass  # Assignment failed? Whatever, move on
                
        elif isinstance(target, (ast.Tuple, ast.List)):
            # Tuple unpacking: x, y = values
            for i, elt in enumerate(target.elts):
                if value is not None and i < len(value):
                    self._assign_value(elt, value[i], context)
    
    def _assign_target(self, target: ast.AST, value: Any, context: ExecutionContext):
        # For-loop target assignment (basically the same as _assign_value)
        self._assign_value(target, value, context)
    
    def _apply_operator(self, op: ast.AST, left: Any, right: Any) -> Any:
        # Apply binary operators - where math meets Python
        if left is None or right is None:
            return None  # Can't operate on None
            
        operations = {
            ast.Add: lambda l, r: l + r,
            ast.Sub: lambda l, r: l - r,
            ast.Mult: lambda l, r: l * r,
            ast.Div: lambda l, r: l / r if r != 0 else 0.0,  # Avoid ZeroDivisionError
            ast.FloorDiv: lambda l, r: l // r if r != 0 else 0,
            ast.Mod: lambda l, r: l % r if r != 0 else 0,
            ast.Pow: lambda l, r: l ** r,
            ast.LShift: lambda l, r: l << r,
            ast.RShift: lambda l, r: l >> r,
            ast.BitOr: lambda l, r: l | r,
            ast.BitXor: lambda l, r: l ^ r,
            ast.BitAnd: lambda l, r: l & r,
        }
        
        op_func = operations.get(type(op))
        if op_func:
            try:
                return op_func(left, right)
            except Exception:
                return None  # Math is hard
        return None
    
    def _apply_unary_operator(self, op: ast.AST, operand: Any) -> Any:
        # Unary operators - the loners
        operations = {
            ast.USub: lambda x: -x,  # Negative
            ast.UAdd: lambda x: +x,  # Positive (why does this exist?)
            ast.Not: lambda x: not x,  # Logical not
            ast.Invert: lambda x: ~x,  # Bitwise not
        }
        
        op_func = operations.get(type(op))
        if op_func:
            try:
                return op_func(operand)
            except:
                return None
        return None
    
    def _apply_comparison(self, op: ast.AST, left: Any, right: Any) -> bool:
        # Comparisons - how we make decisions
        comparisons = {
            ast.Eq: lambda l, r: l == r,
            ast.NotEq: lambda l, r: l != r,
            ast.Lt: lambda l, r: l < r,
            ast.LtE: lambda l, r: l <= r,
            ast.Gt: lambda l, r: l > r,
            ast.GtE: lambda l, r: l >= r,
            ast.Is: lambda l, r: l is r,
            ast.IsNot: lambda l, r: l is not r,
            ast.In: lambda l, r: l in r,
            ast.NotIn: lambda l, r: l not in r,
        }
        
        comp_func = comparisons.get(type(op))
        if comp_func:
            try:
                return comp_func(left, right)
            except:
                return False  # Comparison failed? Must be false then
        return False
    
    def _create_safe_builtins(self) -> Dict[str, Any]:
        # The allowed built-in functions - curated for safety
        safe_builtins = {
            'print': print,  # Everyone's favorite debugger
            'len': len,
            'range': range,
            'int': int,
            'float': float,
            'str': str,
            'bool': bool,
            'list': list,
            'dict': dict,
            'set': set,
            'tuple': tuple,
            'sum': sum,
            'min': min,
            'max': max,
            'abs': abs,
            'round': round,
            'sorted': sorted,
            'reversed': reversed,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'any': any,
            'all': all,
            'isinstance': isinstance,
            'type': type,
        }
        
        if not self.config.sandboxed:
            # Living dangerously? Here's the dangerous stuff
            safe_builtins.update({
                'open': open if self.config.allow_file_operations else None,
                'exec': exec,  # Code that runs code? What could go wrong?
                'eval': eval,  # Same energy as exec
                '__import__': __import__ if self.config.allow_imports else None,
            })
        
        return safe_builtins


def execute_and_trace(code: str, config: Optional[TracerConfig] = None) -> List[ExecutionStep]:
    # The simple API for simple people
    # Just give it code, get back steps. Easy.
    tracer = ExecutionTracer(config)
    return tracer.trace(code)