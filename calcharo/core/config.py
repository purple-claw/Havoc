# Config file because hardcoding values is for amateurs
# Also because we need 50 different knobs to tune everything

from dataclasses import dataclass, field
from typing import Set, Optional, Dict, Any, List
from enum import Enum, auto
import json
import os


class TracingMode(Enum):
    # How much do you want to know about your code's execution?
    FULL = auto()          # EVERYTHING. Every. Single. Thing.
    MINIMAL = auto()       # Just the highlights, please
    PERFORMANCE = auto()   # Make it fast, don't care about details
    DEBUG = auto()         # I need to know why everything is broken


class OptimizationLevel(Enum):
    # How badly do you want performance?
    NONE = 0          # Raw, unfiltered, slow as molasses
    BASIC = 1         # Some speed, still mostly readable
    AGGRESSIVE = 2    # SPEED! Details? What details?


@dataclass
class TracerConfig:
    # All the knobs and switches you could ever want
    # Warning: Changing these might break things. Or make them better. Who knows?
    
    # Don't let it run forever
    max_steps: int = 1000000  # Million steps before we give up
    max_recursion_depth: int = 1000  # Stack overflow protection
    max_execution_time_seconds: float = 60.0  # One minute max, we have lives
    max_memory_mb: int = 1024  # 1GB should be enough for anyone™
    max_output_size_mb: int = 100  # Don't flood the output
    
    # What do you actually want to track?
    tracing_mode: TracingMode = TracingMode.FULL
    capture_stdout: bool = True  # Those print statements you debug with
    capture_stderr: bool = True  # The error messages you ignore
    capture_heap_state: bool = True  # Track ALL the objects!
    capture_call_stack: bool = True  # Who called who?
    capture_line_execution: bool = True  # Every. Single. Line.
    capture_expressions: bool = True  # Even the boring ones
    
    # Speed vs detail trade-offs
    optimization_level: OptimizationLevel = OptimizationLevel.BASIC
    use_caching: bool = True  # Cache all the things!
    lazy_evaluation: bool = False  # Procrastination mode
    batch_size: int = 1000  # Process in chunks for efficiency
    
    # Stuff to ignore because it's boring
    ignored_modules: Set[str] = field(default_factory=lambda: {'__pycache__', '.git'})
    ignored_variables: Set[str] = field(default_factory=lambda: {'__builtins__', '__loader__', '__spec__'})
    traced_functions: Optional[Set[str]] = None  # None = trace everything (brave)
    
    # How pretty do you want the output?
    pretty_print: bool = True  # Make it readable
    include_source_code: bool = True  # Show what broke
    include_timestamps: bool = True  # When did it break?
    compression_enabled: bool = False  # Zip it up
    
    # Security theater
    allow_imports: bool = False  # No importing random stuff
    allow_file_operations: bool = False  # No touching the filesystem
    allow_network_operations: bool = False  # Definitely no network calls
    allow_subprocess: bool = False  # And absolutely no shell commands
    sandboxed: bool = True  # Wrap it all in bubble wrap
    
    # For the power users
    custom_handlers: Dict[str, Any] = field(default_factory=dict)
    plugins: List[str] = field(default_factory=list)
    
    @classmethod
    def from_json(cls, json_str: str) -> "TracerConfig":
        # Parse JSON config because YAML is too mainstream
        data = json.loads(json_str)
        
        # Convert string enums back to real enums
        if 'tracing_mode' in data:
            data['tracing_mode'] = TracingMode[data['tracing_mode']]
        if 'optimization_level' in data:
            data['optimization_level'] = OptimizationLevel[data['optimization_level']]
        
        # Lists to sets because we're fancy
        if 'ignored_modules' in data:
            data['ignored_modules'] = set(data['ignored_modules'])
        if 'ignored_variables' in data:
            data['ignored_variables'] = set(data['ignored_variables'])
        if 'traced_functions' in data:
            data['traced_functions'] = set(data['traced_functions']) if data['traced_functions'] else None
        
        return cls(**data)
    
    @classmethod
    def from_file(cls, file_path: str) -> "TracerConfig":
        # Load from file for the organized folks
        with open(file_path, 'r') as f:
            return cls.from_json(f.read())
    
    @classmethod
    def from_env(cls) -> "TracerConfig":
        # Environment variables for the Docker crowd
        config = cls()
        
        # Check ALL the env vars
        if max_steps := os.getenv('CALCHARO_MAX_STEPS'):
            config.max_steps = int(max_steps)
        if max_time := os.getenv('CALCHARO_MAX_TIME'):
            config.max_execution_time_seconds = float(max_time)
        if max_memory := os.getenv('CALCHARO_MAX_MEMORY'):
            config.max_memory_mb = int(max_memory)
        if mode := os.getenv('CALCHARO_MODE'):
            config.tracing_mode = TracingMode[mode.upper()]
        if sandboxed := os.getenv('CALCHARO_SANDBOXED'):
            config.sandboxed = sandboxed.lower() in ('true', '1', 'yes')
        
        return config
    
    def to_json(self) -> str:
        # Serialize to JSON for saving/sending/whatever
        data = {
            'max_steps': self.max_steps,
            'max_recursion_depth': self.max_recursion_depth,
            'max_execution_time_seconds': self.max_execution_time_seconds,
            'max_memory_mb': self.max_memory_mb,
            'max_output_size_mb': self.max_output_size_mb,
            'tracing_mode': self.tracing_mode.name,
            'capture_stdout': self.capture_stdout,
            'capture_stderr': self.capture_stderr,
            'capture_heap_state': self.capture_heap_state,
            'capture_call_stack': self.capture_call_stack,
            'capture_line_execution': self.capture_line_execution,
            'capture_expressions': self.capture_expressions,
            'optimization_level': self.optimization_level.name,
            'use_caching': self.use_caching,
            'lazy_evaluation': self.lazy_evaluation,
            'batch_size': self.batch_size,
            'ignored_modules': list(self.ignored_modules),
            'ignored_variables': list(self.ignored_variables),
            'traced_functions': list(self.traced_functions) if self.traced_functions else None,
            'pretty_print': self.pretty_print,
            'include_source_code': self.include_source_code,
            'include_timestamps': self.include_timestamps,
            'compression_enabled': self.compression_enabled,
            'allow_imports': self.allow_imports,
            'allow_file_operations': self.allow_file_operations,
            'allow_network_operations': self.allow_network_operations,
            'allow_subprocess': self.allow_subprocess,
            'sandboxed': self.sandboxed,
            'custom_handlers': self.custom_handlers,
            'plugins': self.plugins
        }
        return json.dumps(data, indent=2 if self.pretty_print else None)
    
    def validate(self) -> List[str]:
        # Sanity check the config because users do weird things
        warnings = []
        
        if self.max_steps > 10000000:
            warnings.append(f"Really? {self.max_steps} steps? Your RAM is crying.")
        
        if self.max_memory_mb > 4096:
            warnings.append(f"{self.max_memory_mb}MB? That's a lot of memory for Python code...")
        
        if self.optimization_level == OptimizationLevel.NONE and self.max_steps > 100000:
            warnings.append("No optimization + huge step count = grab a coffee, this will take a while")
        
        if not self.sandboxed and (self.allow_file_operations or self.allow_network_operations):
            warnings.append("Running unsandboxed with file/network access? Living dangerously I see...")
        
        if self.tracing_mode == TracingMode.DEBUG and self.optimization_level == OptimizationLevel.AGGRESSIVE:
            warnings.append("Debug mode + aggressive optimization = missing details, pick one")
        
        return warnings


# Preset configs for the lazy developers
class ConfigPresets:
    
    @staticmethod
    def minimal() -> TracerConfig:
        # Just the basics, nothing fancy
        return TracerConfig(
            tracing_mode=TracingMode.MINIMAL,
            capture_heap_state=False,
            capture_expressions=False,
            optimization_level=OptimizationLevel.AGGRESSIVE,
            include_timestamps=False,
            include_source_code=False
        )
    
    @staticmethod
    def performance() -> TracerConfig:
        # GOTTA GO FAST
        return TracerConfig(
            tracing_mode=TracingMode.PERFORMANCE,
            optimization_level=OptimizationLevel.AGGRESSIVE,
            use_caching=True,
            lazy_evaluation=True,
            batch_size=5000,  # Big batches = more speed
            capture_expressions=False,
            include_timestamps=False
        )
    
    @staticmethod
    def debug() -> TracerConfig:
        # When you need to know EVERYTHING
        return TracerConfig(
            tracing_mode=TracingMode.DEBUG,
            optimization_level=OptimizationLevel.NONE,  # Speed? Who needs speed?
            capture_stdout=True,
            capture_stderr=True,
            capture_heap_state=True,
            capture_call_stack=True,
            capture_line_execution=True,
            capture_expressions=True,
            include_source_code=True,
            include_timestamps=True
        )
    
    @staticmethod
    def production() -> TracerConfig:
        # Sensible defaults for production use
        # (as sensible as tracing Python execution can be)
        return TracerConfig(
            tracing_mode=TracingMode.FULL,
            optimization_level=OptimizationLevel.BASIC,
            max_execution_time_seconds=30.0,  # 30 seconds max
            max_memory_mb=512,  # Half a gig is plenty
            sandboxed=True,  # Safety first
            allow_imports=False,  # No funny business
            allow_file_operations=False,
            allow_network_operations=False,
            compression_enabled=True  # Save some space
        )