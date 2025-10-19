# Array Adapter - For when lists need to be animated
# Specializes in sorting algorithms, array manipulations, and making bars go up and down

from typing import List, Dict, Any, Optional, Tuple
import re

from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class ArrayAdapter(VisualizationAdapter):
    # Handles arrays, lists, and anything that can be indexed
    # Perfect for sorting algorithms and array manipulations
    
    def __init__(self, array_variable_name: Optional[str] = None):
        super().__init__()
        # The array we're tracking (auto-detect if not specified)
        self.tracked_array_name = array_variable_name
        self.array_snapshot_timeline = []  # History of array states
        self.comparison_positions = []  # Track what's being compared
        self.swap_positions = []  # Track what's being swapped
        self.access_pattern = []  # Track array access patterns
    
    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        # Can we handle this? Let's check if there's an array being manipulated
        if not execution_steps:
            return False
        
        # Look for arrays/lists in the execution
        array_found = False
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, list):
                    array_found = True
                    if self.tracked_array_name is None:
                        self.tracked_array_name = var_name  # Auto-detect the array
                    break
            if array_found:
                break
        
        return array_found
    
    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        # Convert execution steps to beautiful array animations
        self.reset()
        
        # First, analyze what we're dealing with
        analysis = self.analyze_array_operations(execution_steps)
        
        # Track the array through time
        previous_step = None
        previous_array_state = None
        
        for step_index, step in enumerate(execution_steps):
            if self.tracked_array_name not in step.variables_state:
                continue
            
            current_array_state = step.variables_state[self.tracked_array_name]
            
            # Skip if not a list
            if not isinstance(current_array_state, list):
                continue
            
            # Detect what happened
            if previous_array_state is not None:
                # Find what changed
                array_mutations = self.detect_array_changes(
                    previous_array_state, 
                    current_array_state,
                    step
                )
                
                # Generate animations based on mutations
                for mutation in array_mutations:
                    if mutation['type'] == 'swap':
                        # Elements swapped positions - this is the money shot
                        swap_cmd = self.create_swap_command(
                            mutation['index1'],
                            mutation['index2'],
                            duration=500
                        )
                        self.animation_sequence.append(swap_cmd)
                        
                    elif mutation['type'] == 'comparison':
                        # Elements being compared
                        compare_cmd = self.create_compare_command(
                            mutation['index1'],
                            mutation['index2'],
                            mutation['result'],
                            duration=300
                        )
                        self.animation_sequence.append(compare_cmd)
                        
                    elif mutation['type'] == 'value_change':
                        # Single value changed
                        change_cmd = AnimationCommand(
                            command_type=CommandType.SET_VALUE,
                            target_indices=[mutation['index']],
                            values={
                                'old_value': mutation['old_value'],
                                'new_value': mutation['new_value']
                            },
                            duration_ms=400
                        )
                        self.animation_sequence.append(change_cmd)
                        
                    elif mutation['type'] == 'access':
                        # Array element accessed
                        highlight_cmd = self.create_highlight_command(
                            [mutation['index']],
                            color="#00FF00",  # Green for access
                            duration=200
                        )
                        self.animation_sequence.append(highlight_cmd)
            
            # Look for patterns in the source code
            if hasattr(step, 'source_code') and step.source_code:
                # Check for comparisons in source
                if self.is_comparison_code(step.source_code):
                    indices = self.extract_indices_from_code(step.source_code)
                    if len(indices) >= 2:
                        compare_cmd = self.create_compare_command(
                            indices[0], indices[1], True, duration=250
                        )
                        self.animation_sequence.append(compare_cmd)
                
                # Check for loop iterations
                if step.step_type == StepType.LOOP_ITERATION:
                    # Add a small pause between iterations
                    pause_cmd = self.create_pause_command(duration=100)
                    self.animation_sequence.append(pause_cmd)
            
            # Update tracking
            previous_array_state = current_array_state.copy() if current_array_state else None
            previous_step = step
        
        # Optimize the animation sequence
        self.optimize_animations()
        
        # Add final celebration if array is sorted
        if self.is_array_sorted(previous_array_state):
            self.add_sorted_celebration()
        
        return self.animation_sequence
    
    def analyze_array_operations(self, execution_steps: List[ExecutionStep]) -> Dict[str, Any]:
        # Figure out what kind of array operations are happening
        operation_stats = {
            'total_swaps': 0,
            'total_comparisons': 0,
            'total_accesses': 0,
            'algorithm_type': 'unknown',
            'is_sorting': False,
            'is_searching': False,
            'array_sizes': []
        }
        
        for step in execution_steps:
            if self.tracked_array_name in step.variables_state:
                arr = step.variables_state[self.tracked_array_name]
                if isinstance(arr, list):
                    operation_stats['array_sizes'].append(len(arr))
        
        # Guess the algorithm based on patterns
        if operation_stats['array_sizes']:
            # Check if array size changes (might be building/reducing)
            size_changes = len(set(operation_stats['array_sizes'])) > 1
            
            # If array size is constant and we have swaps, probably sorting
            if not size_changes and operation_stats['total_swaps'] > 0:
                operation_stats['is_sorting'] = True
                
                # Try to identify specific sorting algorithm
                # This is a rough heuristic
                pattern = self.analyze_code_pattern(execution_steps)
                if pattern['has_recursion']:
                    operation_stats['algorithm_type'] = 'quicksort_or_mergesort'
                elif pattern['has_loops']:
                    operation_stats['algorithm_type'] = 'bubble_or_insertion_sort'
        
        return operation_stats
    
    def detect_array_changes(self, old_array: List[Any], new_array: List[Any], step: ExecutionStep) -> List[Dict[str, Any]]:
        # Detect what changed in the array between steps
        mutations_detected = []
        
        # Check for size changes
        if len(old_array) != len(new_array):
            if len(new_array) > len(old_array):
                # Element added
                mutations_detected.append({
                    'type': 'insert',
                    'index': len(new_array) - 1,
                    'value': new_array[-1]
                })
            else:
                # Element removed
                mutations_detected.append({
                    'type': 'remove',
                    'index': len(old_array) - 1
                })
            return mutations_detected
        
        # Check for swaps (two elements exchanged positions)
        changed_indices = []
        for i in range(len(old_array)):
            if old_array[i] != new_array[i]:
                changed_indices.append(i)
        
        # Perfect swap detection - both elements exchanged
        if len(changed_indices) == 2:
            idx1, idx2 = changed_indices
            if old_array[idx1] == new_array[idx2] and old_array[idx2] == new_array[idx1]:
                mutations_detected.append({
                    'type': 'swap',
                    'index1': idx1,
                    'index2': idx2
                })
                return mutations_detected
        
        # Single element change - might be part of a multi-step swap (temp variable pattern)
        # In bubble sort: temp=arr[j], arr[j]=arr[j+1], arr[j+1]=temp happens over 2 steps
        if len(changed_indices) == 1:
            changed_idx = changed_indices[0]
            # Check if this looks like a partial swap
            # If element at changed_idx now has value that was elsewhere, it's likely swap in progress
            new_val = new_array[changed_idx]
            
            # See if this value existed elsewhere in the old array
            if new_val in old_array:
                old_positions = [i for i, v in enumerate(old_array) if v == new_val and i != changed_idx]
                if old_positions:
                    # Likely a swap in progress - generate swap command anyway
                    # Guess the most likely swap partner (usually adjacent)
                    if changed_idx > 0 and old_array[changed_idx - 1] == new_val:
                        swap_partner = changed_idx - 1
                    elif changed_idx < len(old_array) - 1 and old_array[changed_idx + 1] == new_val:
                        swap_partner = changed_idx + 1
                    else:
                        swap_partner = old_positions[0]
                    
                    # Generate swap command for this partial swap
                    mutations_detected.append({
                        'type': 'swap',
                        'index1': min(changed_idx, swap_partner),
                        'index2': max(changed_idx, swap_partner)
                    })
                    return mutations_detected
        
        # Multiple changes but not a clean swap
        if len(changed_indices) == 2:
            # Assume it's still a swap (temp variable pattern causes this)
            idx1, idx2 = changed_indices
            mutations_detected.append({
                'type': 'swap',
                'index1': idx1,
                'index2': idx2
            })
            return mutations_detected
        
        # Fall back to reporting individual value changes
        for i in changed_indices:
            mutations_detected.append({
                'type': 'value_change',
                'index': i,
                'old_value': old_array[i] if i < len(old_array) else None,
                'new_value': new_array[i] if i < len(new_array) else None
            })
        
        return mutations_detected
    
    def is_comparison_code(self, source_code: str) -> bool:
        # Check if the source code contains a comparison
        comparison_operators = ['>', '<', '>=', '<=', '==', '!=']
        return any(op in source_code for op in comparison_operators)
    
    def extract_indices_from_code(self, source_code: str) -> List[int]:
        # Try to extract array indices from source code
        # Look for patterns like arr[i], arr[j], arr[0], etc.
        indices = []
        
        # Pattern for array access: word[something]
        pattern = r'\w+\[([^\]]+)\]'
        matches = re.findall(pattern, source_code)
        
        for match in matches:
            # Try to extract numeric value if it's a literal
            try:
                index = int(match)
                indices.append(index)
            except:
                # It's a variable, we'll need to be smarter
                # For now, assume common patterns
                if match == 'i':
                    indices.append(0)  # Placeholder
                elif match == 'j':
                    indices.append(1)  # Placeholder
                elif 'j + 1' in match or 'j+1' in match:
                    indices.append(2)  # Placeholder
        
        return indices
    
    def is_array_sorted(self, array: Optional[List[Any]]) -> bool:
        # Check if array is sorted (ascending)
        if not array or len(array) <= 1:
            return True
        
        for i in range(len(array) - 1):
            try:
                if array[i] > array[i + 1]:
                    return False
            except:
                # Can't compare? Not sorted
                return False
        
        return True
    
    def add_sorted_celebration(self):
        # Add a celebration animation when array is sorted
        # Because we need positive reinforcement
        
        # Wave effect - highlight each element in sequence
        if self.array_snapshot_timeline and self.array_snapshot_timeline[-1]:
            final_array_length = len(self.array_snapshot_timeline[-1])
            
            for i in range(final_array_length):
                celebration_cmd = AnimationCommand(
                    command_type=CommandType.HIGHLIGHT,
                    target_indices=[i],
                    values={'color': '#00FF00'},  # Green for success
                    duration_ms=100,
                    delay_ms=i * 50  # Cascade effect
                )
                self.animation_sequence.append(celebration_cmd)
            
            # Final pause to admire the sorted array
            final_pause = self.create_pause_command(duration=500)
            self.animation_sequence.append(final_pause)
