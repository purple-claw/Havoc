# Base classes for visualization adapters
# This is where we define what all adapters must do (spoiler: generate animations)

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple, Set
from enum import Enum, auto
import json
from datetime import datetime

from calcharo.core.models import ExecutionStep, StepType


class CommandType(Enum):
    # All the ways we can animate stuff
    HIGHLIGHT = auto()      # Look at me! I'm important!
    SWAP = auto()          # Trading places
    MOVE = auto()          # Going somewhere
    COMPARE = auto()       # Is A bigger than B?
    SET_VALUE = auto()     # Changing a value
    VISIT = auto()         # Graph node visit
    TRAVERSE = auto()      # Edge traversal
    MARK = auto()          # Special marking
    UNMARK = auto()        # Remove marking
    CREATE = auto()        # Birth of an element
    DELETE = auto()        # Death of an element
    PUSH = auto()          # Stack push
    POP = auto()           # Stack pop
    ENQUEUE = auto()       # Queue enqueue
    DEQUEUE = auto()       # Queue dequeue
    COLOR_CHANGE = auto()  # Because colors matter
    PAUSE = auto()         # Dramatic pause
    LABEL = auto()         # Add text label
    CLEAR = auto()         # Clear everything


@dataclass
class AnimationCommand:
    # A single animation command - tells the frontend what to do
    command_type: CommandType
    target_indices: List[int] = None  # Which elements to animate
    target_ids: List[str] = None      # For graph nodes/edges
    values: Dict[str, Any] = None     # Additional data
    duration_ms: int = 300             # How long to animate (milliseconds)
    delay_ms: int = 0                  # Wait before starting
    metadata: Dict[str, Any] = None   # Extra stuff for special cases
    
    def __post_init__(self):
        # Initialize empty collections if needed
        if self.target_indices is None:
            self.target_indices = []
        if self.target_ids is None:
            self.target_ids = []
        if self.values is None:
            self.values = {}
        if self.metadata is None:
            self.metadata = {}
    
    def to_json(self) -> Dict[str, Any]:
        # Convert to JSON for sending to frontend
        return {
            'type': self.command_type.name,
            'indices': self.target_indices,
            'ids': self.target_ids,
            'values': self.values,
            'duration': self.duration_ms,
            'delay': self.delay_ms,
            'metadata': self.metadata
        }


class VisualizationAdapter(ABC):
    # The abstract base - all adapters must follow this contract
    
    def __init__(self):
        # Keep track of what we've generated
        self.animation_sequence: List[AnimationCommand] = []
        self.state_tracker: Dict[str, Any] = {}  # Track current visual state
        self.step_counter = 0
        self.total_duration_ms = 0
    
    @abstractmethod
    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        # Can this adapter handle these execution steps?
        # Return True if we know how to visualize this code
        pass
    
    @abstractmethod
    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        # The main event - convert execution steps to animations
        # This is where the magic happens
        pass
    
    def analyze_code_pattern(self, execution_steps: List[ExecutionStep]) -> Dict[str, Any]:
        # Figure out what kind of algorithm we're dealing with
        # Returns hints about the code's behavior
        pattern_hints = {
            'has_loops': False,
            'has_swaps': False,
            'has_comparisons': False,
            'has_recursion': False,
            'data_structures': set(),
            'algorithm_type': 'unknown'
        }
        
        for step in execution_steps:
            # Look for loops
            if step.step_type in [StepType.LOOP_START, StepType.LOOP_ITERATION]:
                pattern_hints['has_loops'] = True
            
            # Look for recursion (multiple same function in call stack)
            if len(step.call_stack) > 1:
                function_names = [frame.function_name for frame in step.call_stack]
                if len(function_names) != len(set(function_names)):
                    pattern_hints['has_recursion'] = True
            
            # Check data structures in use
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, list):
                    pattern_hints['data_structures'].add('list')
                elif isinstance(var_value, dict):
                    pattern_hints['data_structures'].add('dict')
                elif isinstance(var_value, set):
                    pattern_hints['data_structures'].add('set')
        
        # Convert set to list for JSON serialization
        pattern_hints['data_structures'] = list(pattern_hints['data_structures'])
        
        return pattern_hints
    
    def detect_variable_changes(self, current_step: ExecutionStep, previous_step: Optional[ExecutionStep]) -> Dict[str, Any]:
        # Find what changed between steps
        # Because animations are all about change
        changes = {
            'new_variables': [],
            'modified_variables': [],
            'deleted_variables': [],
            'value_changes': {}
        }
        
        if previous_step is None:
            # First step - everything is new
            changes['new_variables'] = list(current_step.variables_state.keys())
            return changes
        
        current_vars = current_step.variables_state
        previous_vars = previous_step.variables_state
        
        # Find new variables
        changes['new_variables'] = [
            var for var in current_vars 
            if var not in previous_vars
        ]
        
        # Find deleted variables
        changes['deleted_variables'] = [
            var for var in previous_vars 
            if var not in current_vars
        ]
        
        # Find modified variables
        for var_name in current_vars:
            if var_name in previous_vars:
                current_val = current_vars[var_name]
                previous_val = previous_vars[var_name]
                
                # Check if value changed
                if current_val != previous_val:
                    changes['modified_variables'].append(var_name)
                    changes['value_changes'][var_name] = {
                        'from': previous_val,
                        'to': current_val
                    }
        
        return changes
    
    def create_highlight_command(self, indices: List[int], color: str = "#FFD700", duration: int = 300) -> AnimationCommand:
        # Create a highlight animation - make elements glow
        return AnimationCommand(
            command_type=CommandType.HIGHLIGHT,
            target_indices=indices,
            values={'color': color},
            duration_ms=duration
        )
    
    def create_swap_command(self, index1: int, index2: int, duration: int = 500) -> AnimationCommand:
        # Create a swap animation - two elements trade places
        return AnimationCommand(
            command_type=CommandType.SWAP,
            target_indices=[index1, index2],
            duration_ms=duration,
            metadata={'swap_type': 'position'}
        )
    
    def create_compare_command(self, index1: int, index2: int, result: bool, duration: int = 200) -> AnimationCommand:
        # Create a comparison animation - show two elements being compared
        return AnimationCommand(
            command_type=CommandType.COMPARE,
            target_indices=[index1, index2],
            values={'comparison_result': result},
            duration_ms=duration
        )
    
    def create_pause_command(self, duration: int = 100) -> AnimationCommand:
        # Create a pause - for dramatic effect
        return AnimationCommand(
            command_type=CommandType.PAUSE,
            duration_ms=duration
        )
    
    def reset(self):
        # Clear everything and start fresh
        self.animation_sequence = []
        self.state_tracker = {}
        self.step_counter = 0
        self.total_duration_ms = 0
    
    def get_total_duration(self) -> int:
        # Calculate total animation time
        return sum(cmd.duration_ms + cmd.delay_ms for cmd in self.animation_sequence)
    
    def optimize_animations(self):
        # Remove redundant animations, merge similar ones
        # Because efficiency matters, even in animations
        if len(self.animation_sequence) < 2:
            return
        
        optimized_sequence = []
        previous_cmd = None
        
        for cmd in self.animation_sequence:
            # Skip consecutive identical commands
            if previous_cmd and cmd.command_type == previous_cmd.command_type:
                if cmd.target_indices == previous_cmd.target_indices:
                    # Merge durations instead of having two identical animations
                    previous_cmd.duration_ms += cmd.duration_ms
                    continue
            
            optimized_sequence.append(cmd)
            previous_cmd = cmd
        
        self.animation_sequence = optimized_sequence
