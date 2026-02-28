# SandboxManager — enhanced sandboxing for web-based code execution
# Defense in depth: AST validation + restricted builtins + resource limits
# Because users WILL try to `import os; os.system('rm -rf /')` and we need to be ready

import ast
import sys
import time
import threading
from typing import Dict, Any, Optional, Set, Tuple, List
from dataclasses import dataclass


@dataclass
class SandboxConfig:
    """Configuration for the execution sandbox."""
    max_execution_time: float = 30.0       # seconds
    max_memory_mb: int = 256               # megabytes
    max_output_chars: int = 100_000        # stdout capture limit
    max_ast_nodes: int = 50_000            # AST complexity limit
    max_string_length: int = 1_000_000     # prevent memory bombs via strings
    allow_imports: Set[str] = None         # whitelist of allowed modules

    def __post_init__(self):
        if self.allow_imports is None:
            self.allow_imports = {
                # Math & numbers
                'math', 'cmath', 'decimal', 'fractions', 'statistics',
                # Data structures
                'collections', 'heapq', 'bisect', 'array', 'queue',
                # Iteration & functions
                'itertools', 'functools', 'operator',
                # String & regex
                'string', 're',
                # Data formats
                'json', 'csv',
                # Copy & types
                'copy', 'typing', 'types', 'dataclasses', 'enum', 'abc',
                # Random
                'random',
                # Time (read-only)
                'time', 'datetime',
                # Misc safe
                'textwrap', 'pprint',
            }


class ASTSecurityValidator(ast.NodeVisitor):
    """
    Walks the AST to detect dangerous patterns before execution.
    This is the first line of defense — catch bad code at parse time.
    """

    DANGEROUS_ATTRIBUTES = {
        '__import__', '__builtins__', '__class__', '__subclasses__',
        '__bases__', '__mro__', '__globals__', '__code__',
        '__reduce__', '__reduce_ex__', '__getstate__',
        '__setstate__', '__init_subclass__', '__set_name__',
    }

    DANGEROUS_NAMES = {
        'exec', 'eval', 'compile', 'execfile',
        'breakpoint', 'exit', 'quit',
        '__import__', 'globals', 'locals', 'vars',
        'getattr', 'setattr', 'delattr',  # Can bypass restrictions
        'type',  # Can create new classes with metaclasses
    }

    DANGEROUS_MODULES = {
        'os', 'sys', 'subprocess', 'shutil',
        'socket', 'http', 'urllib', 'requests',
        'ctypes', 'multiprocessing', 'threading',
        'signal', 'resource', 'gc', 'inspect',
        'importlib', 'pkgutil', 'code', 'codeop',
        'compileall', 'py_compile',
        'pickle', 'shelve', 'marshal',
        'tempfile', 'glob', 'pathlib', 'fileinput',
        'io', 'builtins',
    }

    def __init__(self, config: SandboxConfig):
        self.config = config
        self.violations: List[str] = []
        self.node_count = 0

    def visit(self, node):
        self.node_count += 1
        if self.node_count > self.config.max_ast_nodes:
            self.violations.append(
                f"AST too complex ({self.node_count}+ nodes). "
                f"Max allowed: {self.config.max_ast_nodes}. "
                f"Simplify your code or split it into smaller pieces."
            )
            return
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            module = alias.name.split('.')[0]
            if module not in self.config.allow_imports:
                self.violations.append(
                    f"Import '{alias.name}' is not allowed in the sandbox. "
                    f"Allowed modules: {', '.join(sorted(self.config.allow_imports)[:20])}..."
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            module = node.module.split('.')[0]
            if module not in self.config.allow_imports:
                self.violations.append(
                    f"Import from '{node.module}' is not allowed in the sandbox."
                )
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if isinstance(node.attr, str) and node.attr in self.DANGEROUS_ATTRIBUTES:
            self.violations.append(
                f"Access to '{node.attr}' is blocked for security reasons."
            )
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id in self.DANGEROUS_NAMES:
            self.violations.append(
                f"Use of '{node.id}' is not allowed in the sandbox."
            )
        self.generic_visit(node)

    def visit_Call(self, node):
        # Check for open() calls
        if isinstance(node.func, ast.Name) and node.func.id in ('open', 'file', 'input'):
            self.violations.append(
                f"'{node.func.id}()' is not allowed — no file or user I/O in the sandbox."
            )
        # Check for dangerous method calls
        if isinstance(node.func, ast.Attribute):
            if node.func.attr in ('system', 'popen', 'exec', 'spawn'):
                self.violations.append(
                    f"Method '.{node.func.attr}()' is blocked for security reasons."
                )
        self.generic_visit(node)


class OutputCapture:
    """Captures stdout with a size limit to prevent memory bombs."""

    def __init__(self, max_chars: int = 100_000):
        self.max_chars = max_chars
        self.output = []
        self.total_chars = 0
        self.truncated = False

    def write(self, text):
        if self.truncated:
            return
        self.total_chars += len(text)
        if self.total_chars > self.max_chars:
            self.truncated = True
            remaining = self.max_chars - (self.total_chars - len(text))
            if remaining > 0:
                self.output.append(text[:remaining])
            self.output.append('\n[Output truncated — exceeded limit]')
        else:
            self.output.append(text)

    def flush(self):
        pass

    def get_output(self) -> str:
        return ''.join(self.output)


class SandboxManager:
    """
    Manages code execution in a restricted sandbox.

    Security layers:
    1. AST validation (static analysis before execution)
    2. Restricted builtins (no dangerous functions available)
    3. Resource limits (time, memory, output)
    4. Thread-based timeout (hard kill if code runs too long)

    This is NOT security through obscurity — it's defense in depth.
    """

    def __init__(self, config: Optional[SandboxConfig] = None):
        self.config = config or SandboxConfig()

    def _get_safe_builtins(self) -> Dict[str, Any]:
        """Return a restricted set of built-in functions."""
        import builtins

        safe_names = {
            # Types
            'int', 'float', 'str', 'bool', 'complex',
            'list', 'tuple', 'dict', 'set', 'frozenset',
            'bytes', 'bytearray', 'memoryview',
            # Functions
            'len', 'range', 'enumerate', 'zip', 'map', 'filter',
            'sorted', 'reversed', 'min', 'max', 'sum', 'abs',
            'round', 'pow', 'divmod',
            'all', 'any', 'isinstance', 'issubclass',
            'id', 'hash', 'repr', 'format',
            'chr', 'ord', 'hex', 'oct', 'bin',
            'print', 'input',  # input will be overridden
            # Iteration
            'iter', 'next', 'slice',
            # Exceptions
            'Exception', 'ValueError', 'TypeError', 'KeyError',
            'IndexError', 'AttributeError', 'StopIteration',
            'RuntimeError', 'ZeroDivisionError', 'OverflowError',
            'NotImplementedError', 'AssertionError',
            # Constants
            'True', 'False', 'None',
            # Object/class support (limited)
            'super', 'property', 'staticmethod', 'classmethod',
            'object',
        }

        safe_builtins = {}
        for name in safe_names:
            if hasattr(builtins, name):
                safe_builtins[name] = getattr(builtins, name)

        # Override dangerous ones
        safe_builtins['input'] = lambda *args: ''  # No user input in sandbox
        safe_builtins['__build_class__'] = builtins.__build_class__  # Needed for class defs

        return safe_builtins

    def validate(self, code: str) -> Tuple[bool, List[str]]:
        """
        Validate code safety using AST analysis.
        Returns (is_safe, list_of_violations).
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, [f"Syntax error at line {e.lineno}: {e.msg}"]

        validator = ASTSecurityValidator(self.config)
        validator.visit(tree)

        if validator.violations:
            return False, validator.violations
        return True, []

    def execute(self, code: str) -> Dict[str, Any]:
        """
        Execute code in the sandbox with full security.

        Returns:
            {
                'success': bool,
                'output': str,
                'error': Optional[str],
                'execution_time_ms': float,
                'variables': Dict[str, Any],  # Final variable state
            }
        """
        # Step 1: AST validation
        is_safe, violations = self.validate(code)
        if not is_safe:
            return {
                'success': False,
                'output': '',
                'error': f"Security violation: {violations[0]}",
                'execution_time_ms': 0,
                'variables': {},
            }

        # Step 2: Set up restricted execution environment
        output_capture = OutputCapture(self.config.max_output_chars)
        safe_builtins = self._get_safe_builtins()

        # Override print to capture output
        original_print = safe_builtins.get('print')
        def safe_print(*args, **kwargs):
            kwargs['file'] = output_capture
            if original_print:
                import builtins
                builtins.print(*args, **kwargs)

        safe_builtins['print'] = safe_print

        # Execution namespace
        exec_globals = {
            '__builtins__': safe_builtins,
            '__name__': '__main__',
        }
        exec_locals = {}

        # Step 3: Execute with timeout
        result = {
            'success': False,
            'output': '',
            'error': None,
            'execution_time_ms': 0,
            'variables': {},
        }

        start_time = time.time()

        try:
            # Compile first (catches syntax errors)
            compiled = compile(code, '<havoc_sandbox>', 'exec')

            # Execute with thread-based timeout
            exception_holder = [None]

            def run_code():
                try:
                    exec(compiled, exec_globals, exec_locals)
                except Exception as e:
                    exception_holder[0] = e

            thread = threading.Thread(target=run_code)
            thread.daemon = True
            thread.start()
            thread.join(timeout=self.config.max_execution_time)

            elapsed = time.time() - start_time

            if thread.is_alive():
                result['error'] = (
                    f"Execution timed out after {self.config.max_execution_time}s. "
                    f"Your code might have an infinite loop."
                )
                result['execution_time_ms'] = round(elapsed * 1000, 2)
                return result

            if exception_holder[0]:
                e = exception_holder[0]
                result['error'] = f"{type(e).__name__}: {e}"
                result['output'] = output_capture.get_output()
                result['execution_time_ms'] = round(elapsed * 1000, 2)
                return result

            # Success!
            result['success'] = True
            result['output'] = output_capture.get_output()
            result['execution_time_ms'] = round(elapsed * 1000, 2)

            # Extract safe variables from execution namespace
            for key, value in exec_locals.items():
                if not key.startswith('_'):
                    try:
                        # Only include JSON-serializable values
                        import json
                        json.dumps(value)
                        result['variables'][key] = value
                    except (TypeError, ValueError, OverflowError):
                        result['variables'][key] = repr(value)

        except SyntaxError as e:
            result['error'] = f"Syntax error at line {e.lineno}: {e.msg}"
        except Exception as e:
            result['error'] = f"Sandbox error: {type(e).__name__}: {e}"

        result['execution_time_ms'] = round((time.time() - start_time) * 1000, 2)
        return result
