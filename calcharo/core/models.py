# Yeah, these are the data models. You know, the boring stuff that holds all the data
# but somehow takes 300 lines because we need to be fuking sure

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set, Tuple, Union, FrozenSet
from enum import Enum, auto
import copy
import json
import types as _types
from datetime import datetime


class StepType(Enum):
    # Because apparently we need to categorize every single thing that happens
    ASSIGNMENT = auto()
    FUNCTION_CALL = auto()
    FUNCTION_RETURN = auto()
    CONDITION = auto()
    LOOP_START = auto()
    LOOP_ITERATION = auto()
    LOOP_END = auto()
    EXPRESSION = auto()
    IMPORT = auto()
    EXCEPTION = auto()
    PRINT = auto()


class VariableType(Enum):
    # In case you forgot what types Python has... here's a reminder
    PRIMITIVE = auto()
    LIST = auto()
    DICT = auto()
    SET = auto()
    TUPLE = auto()
    OBJECT = auto()
    FUNCTION = auto()
    CLASS = auto()
    MODULE = auto()
    NONE = auto()  # Yes, None gets its own type. Deal with it.


@dataclass(frozen=True)
class HeapObject:
    # For when you absolutely MUST track every single object in memory
    # because "memory leaks are bad" or whatever
    object_id: int
    type_name: str
    value: Any
    size: int
    references: FrozenSet[int] = field(default_factory=frozenset)
    
    def __post_init__(self):
        # Deep copy everything because mutability is the root of all evil
        # (and also because we don't trust anyone)
        if isinstance(self.value, (list, dict, set)):
            object.__setattr__(self, 'value', copy.deepcopy(self.value))
    
    def to_json(self) -> Dict[str, Any]:
        # JSON serialization because someone will inevitably want to 
        # send this over the network or save it to a file
        try:
            json_value = json.dumps(self.value)
            serializable_value = self.value
        except (TypeError, ValueError):
            # Oh, your object isn't JSON serializable? 
            # Too bad, you get a string representation instead
            serializable_value = str(self.value)
        
        return {
            "object_id": self.object_id,
            "type_name": self.type_name,
            "value": serializable_value,
            "size": self.size,
            "references": list(self.references)
        }


@dataclass(frozen=True)
class CallFrame:
    # Stack frames - because recursion needs to be complicated
    function_name: str
    module_name: str
    line_number: int
    local_variables: Dict[str, Any] = field(default_factory=dict)
    arguments: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        # More deep copying because we're paranoid
        object.__setattr__(self, 'local_variables', copy.deepcopy(self.local_variables))
        object.__setattr__(self, 'arguments', copy.deepcopy(self.arguments))
    
    def to_json(self) -> Dict[str, Any]:
        # Convert to JSON because REST APIs are still a thing apparently
        def safe_serialize(obj):
            try:
                json.dumps(obj)
                return obj
            except (TypeError, ValueError):
                # Your weird custom object broke JSON? Here's a string.
                return str(obj)
        
        return {
            "function_name": self.function_name,
            "module_name": self.module_name,
            "line_number": self.line_number,
            "local_variables": {k: safe_serialize(v) for k, v in self.local_variables.items()},
            "arguments": {k: safe_serialize(v) for k, v in self.arguments.items()}
        }


@dataclass(frozen=True)
class ExecutionStep:
    # The main event - this bad boy holds EVERYTHING about a single step
    # Yes, it's huge. No, we can't make it smaller. We tried.
    step_number: int
    timestamp: datetime
    line_number: int
    column_number: int
    step_type: StepType
    source_code: str
    variables_state: Dict[str, Any]
    stdout_snapshot: str
    stderr_snapshot: str
    call_stack: Tuple[CallFrame, ...]
    heap_state: Dict[int, HeapObject]
    expression_value: Optional[Any] = None
    condition_result: Optional[bool] = None
    memory_usage: int = 0  # In bytes, because why not
    cpu_time_ns: int = 0   # Nanoseconds for the win
    
    def __post_init__(self):
        # Triple-check everything is immutable
        # because someone WILL try to modify this later
        object.__setattr__(self, 'variables_state', copy.deepcopy(self.variables_state))
        object.__setattr__(self, 'heap_state', copy.deepcopy(self.heap_state))
        if not isinstance(self.call_stack, tuple):
            # Oh you passed a list? Let me fix that for you...
            object.__setattr__(self, 'call_stack', tuple(self.call_stack))
    
    def get_variable(self, name: str) -> Optional[Any]:
        # Convenience method because dict.get() is too mainstream
        return self.variables_state.get(name)
    
    def get_heap_object(self, obj_id: int) -> Optional[HeapObject]:
        # Another convenience method. You're welcome.
        return self.heap_state.get(obj_id)
    
    def to_json(self) -> Dict[str, Any]:
        # The mother of all JSON serializations
        # This thing converts EVERYTHING
        def safe_serialize(obj):
            try:
                json.dumps(obj)
                return obj
            except (TypeError, ValueError):
                # When in doubt, stringify it out
                return str(obj)
        
        return {
            "step_number": self.step_number,
            "timestamp": self.timestamp.isoformat(),
            "line_number": self.line_number,
            "column_number": self.column_number,
            "step_type": self.step_type.name,
            "source_code": self.source_code,
            "variables_state": {k: safe_serialize(v) for k, v in self.variables_state.items()},
            "stdout_snapshot": self.stdout_snapshot,
            "stderr_snapshot": self.stderr_snapshot,
            "call_stack": [frame.to_json() for frame in self.call_stack],
            "heap_state": {str(k): v.to_json() for k, v in self.heap_state.items()},
            "expression_value": safe_serialize(self.expression_value),
            "condition_result": self.condition_result,
            "memory_usage": self.memory_usage,
            "cpu_time_ns": self.cpu_time_ns
        }


@dataclass
class ExecutionContext:
    # The mutable mess that tracks everything during execution
    # This is where the magic happens (and by magic, I mean state mutation)
    current_line: int = 0
    current_column: int = 0
    step_count: int = 0
    call_stack: List[CallFrame] = field(default_factory=list)
    global_namespace: Dict[str, Any] = field(default_factory=dict)
    local_namespace: Dict[str, Any] = field(default_factory=dict)
    heap_tracker: Dict[int, HeapObject] = field(default_factory=dict)
    stdout_buffer: str = ""
    stderr_buffer: str = ""
    memory_usage: int = 0
    total_cpu_time_ns: int = 0
    max_recursion_depth: int = 1000  # Because Python's default is "not enough"
    max_steps: int = 1000000  # Million steps ought to be enough for anybody
    max_memory_mb: int = 1024  # A whole gigabyte! Living large!
    
    def push_frame(self, frame: CallFrame) -> None:
        # Push it real good (onto the stack)
        if len(self.call_stack) >= self.max_recursion_depth:
            raise RecursionError(f"Stack overflow at {self.max_recursion_depth} frames. Maybe try iteration?")
        self.call_stack.append(frame)
    
    def pop_frame(self) -> Optional[CallFrame]:
        # What goes up must come down
        return self.call_stack.pop() if self.call_stack else None
    
    def track_heap_object(self, obj: Any) -> int:
        # Big Brother is watching your objects
        obj_id = id(obj)
        if obj_id not in self.heap_tracker:
            type_name = type(obj).__name__
            try:
                size = obj.__sizeof__()
            except:
                size = 0  # Size doesn't matter... right?
            
            # Find all the references because we're thorough like that
            references = set()
            if isinstance(obj, (list, tuple)):
                for item in obj:
                    if isinstance(item, (list, dict, set, tuple)):
                        references.add(id(item))
            elif isinstance(obj, dict):
                for value in obj.values():
                    if isinstance(value, (list, dict, set, tuple)):
                        references.add(id(value))
            
            self.heap_tracker[obj_id] = HeapObject(
                object_id=obj_id,
                type_name=type_name,
                value=obj,
                size=size,
                references=frozenset(references)
            )
        return obj_id
    
    def create_step(self, 
                   step_type: StepType,
                   source_code: str = "",
                   expression_value: Optional[Any] = None,
                   condition_result: Optional[bool] = None) -> ExecutionStep:
        # Factory method because constructors are so last decade
        from datetime import datetime
        import time
        
        self.step_count += 1
        
        if self.step_count > self.max_steps:
            # You've had enough steps. Go home.
            raise RuntimeError(f"Exceeded {self.max_steps} steps. Your code is probably stuck in a loop.")
        
        # Filter out the junk nobody wants to see
        current_vars = {**self.global_namespace, **self.local_namespace}
        filtered_vars = {}
        current_heap = {}
        
        for name, value in current_vars.items():
            if (not name.startswith('__')
                    and not callable(value)
                    and not isinstance(value, _types.ModuleType)):
                filtered_vars[name] = value
                if isinstance(value, (list, dict, set)):
                    # Track the mutable stuff because it might change
                    obj_id = self.track_heap_object(value)
                    current_heap[obj_id] = self.heap_tracker[obj_id]
        
        return ExecutionStep(
            step_number=self.step_count,
            timestamp=datetime.now(),
            line_number=self.current_line,
            column_number=self.current_column,
            step_type=step_type,
            source_code=source_code,
            variables_state=filtered_vars,
            stdout_snapshot=self.stdout_buffer,
            stderr_snapshot=self.stderr_buffer,
            call_stack=tuple(self.call_stack),
            heap_state=current_heap,
            expression_value=expression_value,
            condition_result=condition_result,
            memory_usage=self.memory_usage,
            cpu_time_ns=time.perf_counter_ns()
        )