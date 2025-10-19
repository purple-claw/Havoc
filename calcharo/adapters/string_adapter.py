# String Adapter - Because strings need love too
# Animates string operations, searches, and manipulations character by character

from typing import List, Dict, Any, Optional, Tuple
import difflib

from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class StringAdapter(VisualizationAdapter):
    # Handles string manipulations, pattern matching, and text processing
    # Makes characters dance across the screen
    
    def __init__(self, string_variable_name: Optional[str] = None):
        super().__init__()
        # The string we're watching evolve
        self.tracked_string_name = string_variable_name
        self.string_history = []  # Timeline of string states
        self.character_operations = []  # Track character-level ops
        self.pattern_matches = []  # Track pattern matching results
        
    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        # Can we handle this? Look for string operations
        if not execution_steps:
            return False
        
        # Look for strings being manipulated
        string_found = False
        string_keywords = ['text', 'string', 'str', 'word', 'sentence', 'pattern']
        
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, str):
                    # Check if it's a meaningful string (not just a single char)
                    if len(var_value) > 1:
                        # Check variable name for string-related terms
                        if any(keyword in var_name.lower() for keyword in string_keywords):
                            if self.tracked_string_name is None:
                                self.tracked_string_name = var_name
                            string_found = True
                            break
                        # Also accept any substantial string
                        elif len(var_value) > 5:
                            if self.tracked_string_name is None:
                                self.tracked_string_name = var_name
                            string_found = True
                            break
            
            if string_found:
                break
        
        return string_found
    
    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        # Transform string operations into character-level animations
        self.reset()
        
        # Analyze what kind of string operation we're dealing with
        operation_type = self.detect_string_operation_type(execution_steps)
        
        previous_step = None
        previous_string_state = None
        
        for step_idx, step in enumerate(execution_steps):
            if self.tracked_string_name not in step.variables_state:
                continue
            
            current_string_state = step.variables_state[self.tracked_string_name]
            
            # Skip if not a string
            if not isinstance(current_string_state, str):
                continue
            
            # Detect changes between string states
            if previous_string_state is not None:
                string_mutations = self.detect_string_changes(
                    previous_string_state,
                    current_string_state
                )
                
                # Generate animations for each mutation
                for mutation in string_mutations:
                    if mutation['type'] == 'insert':
                        # Characters inserted
                        for char_idx in mutation['positions']:
                            insert_cmd = AnimationCommand(
                                command_type=CommandType.CREATE,
                                target_indices=[char_idx],
                                values={
                                    'character': current_string_state[char_idx],
                                    'animation': 'fade_in'
                                },
                                duration_ms=300,
                                delay_ms=char_idx * 50  # Cascade effect
                            )
                            self.animation_sequence.append(insert_cmd)
                    
                    elif mutation['type'] == 'delete':
                        # Characters deleted
                        for char_idx in mutation['positions']:
                            delete_cmd = AnimationCommand(
                                command_type=CommandType.DELETE,
                                target_indices=[char_idx],
                                values={'animation': 'fade_out'},
                                duration_ms=300
                            )
                            self.animation_sequence.append(delete_cmd)
                    
                    elif mutation['type'] == 'replace':
                        # Characters replaced
                        for old_idx, new_idx in zip(mutation['old_positions'], mutation['new_positions']):
                            replace_cmd = AnimationCommand(
                                command_type=CommandType.SET_VALUE,
                                target_indices=[old_idx],
                                values={
                                    'old_char': previous_string_state[old_idx] if old_idx < len(previous_string_state) else '',
                                    'new_char': current_string_state[new_idx] if new_idx < len(current_string_state) else '',
                                    'animation': 'flip'
                                },
                                duration_ms=400
                            )
                            self.animation_sequence.append(replace_cmd)
                    
                    elif mutation['type'] == 'move':
                        # Characters moved/rearranged
                        move_cmd = AnimationCommand(
                            command_type=CommandType.MOVE,
                            target_indices=mutation['from_positions'],
                            values={
                                'to_positions': mutation['to_positions'],
                                'animation': 'slide'
                            },
                            duration_ms=500
                        )
                        self.animation_sequence.append(move_cmd)
            
            # Look for pattern matching operations
            pattern_searches = self.detect_pattern_searches(step)
            for search in pattern_searches:
                # Highlight matched patterns
                for match_idx in search['match_positions']:
                    highlight_cmd = AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_indices=list(range(match_idx, match_idx + search['pattern_length'])),
                        values={'color': '#FF69B4', 'pattern': search['pattern']},  # Pink for matches
                        duration_ms=600
                    )
                    self.animation_sequence.append(highlight_cmd)
            
            # Check for string comparisons
            if step.step_type == StepType.CONDITION:
                # Might be comparing strings
                compare_cmd = AnimationCommand(
                    command_type=CommandType.COMPARE,
                    target_indices=list(range(len(current_string_state))),
                    values={'comparison_type': 'equality'},
                    duration_ms=400
                )
                self.animation_sequence.append(compare_cmd)
            
            # Update tracking
            previous_string_state = current_string_state
            previous_step = step
            self.string_history.append(current_string_state)
        
        # Add final animation based on operation type
        self.add_string_operation_finale(operation_type)
        
        # Optimize the sequence
        self.optimize_animations()
        
        return self.animation_sequence
    
    def detect_string_operation_type(self, execution_steps: List[ExecutionStep]) -> str:
        # Figure out what kind of string operation is happening
        operation_hints = {
            'has_concatenation': False,
            'has_slicing': False,
            'has_replacement': False,
            'has_search': False,
            'has_reversal': False,
            'has_case_change': False
        }
        
        for step in execution_steps:
            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                
                # Check for common string operations
                if '+' in code and ('"' in code or "'" in code):
                    operation_hints['has_concatenation'] = True
                if '[' in code and ':' in code:
                    operation_hints['has_slicing'] = True
                if 'replace' in code:
                    operation_hints['has_replacement'] = True
                if 'find' in code or 'index' in code or 'in' in code:
                    operation_hints['has_search'] = True
                if 'reverse' in code or '[::-1]' in code:
                    operation_hints['has_reversal'] = True
                if 'upper' in code or 'lower' in code or 'capitalize' in code:
                    operation_hints['has_case_change'] = True
        
        # Determine primary operation type
        if operation_hints['has_search']:
            return 'pattern_matching'
        elif operation_hints['has_replacement']:
            return 'string_replacement'
        elif operation_hints['has_reversal']:
            return 'string_reversal'
        elif operation_hints['has_concatenation']:
            return 'string_building'
        elif operation_hints['has_case_change']:
            return 'case_transformation'
        else:
            return 'general_manipulation'
    
    def detect_string_changes(self, old_string: str, new_string: str) -> List[Dict[str, Any]]:
        # Detect what changed between two string states
        changes_detected = []
        
        # Use difflib to find the differences
        matcher = difflib.SequenceMatcher(None, old_string, new_string)
        opcodes = matcher.get_opcodes()
        
        for tag, i1, i2, j1, j2 in opcodes:
            if tag == 'insert':
                # Characters were inserted
                changes_detected.append({
                    'type': 'insert',
                    'positions': list(range(j1, j2)),
                    'characters': new_string[j1:j2]
                })
            elif tag == 'delete':
                # Characters were deleted
                changes_detected.append({
                    'type': 'delete',
                    'positions': list(range(i1, i2)),
                    'characters': old_string[i1:i2]
                })
            elif tag == 'replace':
                # Characters were replaced
                changes_detected.append({
                    'type': 'replace',
                    'old_positions': list(range(i1, i2)),
                    'new_positions': list(range(j1, j2)),
                    'old_chars': old_string[i1:i2],
                    'new_chars': new_string[j1:j2]
                })
        
        # Check for simple reversal
        if old_string == new_string[::-1]:
            changes_detected = [{
                'type': 'reverse',
                'full_string': True
            }]
        
        # Check for case changes
        if old_string.lower() == new_string.lower() and old_string != new_string:
            case_changes = []
            for i, (old_char, new_char) in enumerate(zip(old_string, new_string)):
                if old_char != new_char:
                    case_changes.append(i)
            
            if case_changes:
                changes_detected.append({
                    'type': 'case_change',
                    'positions': case_changes
                })
        
        return changes_detected
    
    def detect_pattern_searches(self, step: ExecutionStep) -> List[Dict[str, Any]]:
        # Detect pattern searching operations
        searches = []
        
        # Look for variables that might contain search results
        for var_name, var_value in step.variables_state.items():
            if 'index' in var_name.lower() or 'pos' in var_name.lower() or 'match' in var_name.lower():
                if isinstance(var_value, int) and var_value >= 0:
                    # Might be a match position
                    searches.append({
                        'match_positions': [var_value],
                        'pattern': 'unknown',
                        'pattern_length': 1
                    })
                elif isinstance(var_value, list):
                    # Might be multiple match positions
                    searches.append({
                        'match_positions': var_value,
                        'pattern': 'unknown',
                        'pattern_length': 1
                    })
        
        return searches
    
    def add_string_operation_finale(self, operation_type: str):
        # Add a final animation based on the operation type
        if operation_type == 'pattern_matching':
            # Flash all matched patterns
            finale_cmd = AnimationCommand(
                command_type=CommandType.COLOR_CHANGE,
                target_ids=['all_matches'],
                values={'color': '#00FF00', 'flash': True},
                duration_ms=800
            )
            self.animation_sequence.append(finale_cmd)
        
        elif operation_type == 'string_reversal':
            # Spin animation for reversal
            reverse_cmd = AnimationCommand(
                command_type=CommandType.MOVE,
                target_ids=['all_characters'],
                values={'animation': 'spin_reverse'},
                duration_ms=1000
            )
            self.animation_sequence.append(reverse_cmd)
        
        elif operation_type == 'string_building':
            # Typewriter effect for built string
            typewriter_cmd = AnimationCommand(
                command_type=CommandType.CREATE,
                target_ids=['final_string'],
                values={'animation': 'typewriter'},
                duration_ms=1500
            )
            self.animation_sequence.append(typewriter_cmd)
        
        else:
            # Generic completion
            complete_cmd = AnimationCommand(
                command_type=CommandType.PAUSE,
                duration_ms=500
            )
            self.animation_sequence.append(complete_cmd)
