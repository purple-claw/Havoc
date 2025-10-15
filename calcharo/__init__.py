# Calcharo - Where Python code goes to be watched
# Every. Single. Step. We see it all.

from calcharo.core import (
    ExecutionTracer,
    ExecutionStep,
    CallFrame,
    HeapObject,
    ExecutionContext,
    TracerError,
    ExecutionError,
    ParseError,
    TracerConfig,
)
from calcharo.core.tracer import execute_and_trace
from calcharo.core.config import ConfigPresets

__version__ = "1.0.0"
__all__ = [
    "execute_and_trace",  # The main event
    "ExecutionTracer",    # For the control freaks
    "ExecutionStep",      # What we capture
    "CallFrame",          # Stack stuff
    "HeapObject",         # Memory tracking
    "ExecutionContext",   # Runtime state
    "TracerError",        # When things go wrong
    "ExecutionError",     # When execution fails
    "ParseError",         # When parsing fails
    "TracerConfig",       # All the knobs
    "ConfigPresets",      # For the lazy
]