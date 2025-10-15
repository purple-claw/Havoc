# The core stuff - where the real magic happens
# Import everything so people don't have to dig through our file structure

from .models import ExecutionStep, CallFrame, HeapObject, ExecutionContext
from .tracer import ExecutionTracer
from .errors import TracerError, ExecutionError, ParseError
from .config import TracerConfig

__version__ = "1.0.0"  # Semantic versioning FTW
__all__ = [
    "ExecutionTracer",
    "ExecutionStep",
    "CallFrame",
    "HeapObject",
    "ExecutionContext",
    "TracerError",
    "ExecutionError",
    "ParseError",
    "TracerConfig",
]