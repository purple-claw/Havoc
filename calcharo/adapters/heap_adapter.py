# Heap Adapter - Priority queues and heap operations with satisfying bubble animations
# Watch elements sift up and sift down through the heap with physics-based motion

from typing import List, Dict, Any, Optional
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class HeapAdapter(VisualizationAdapter):
    """Visualizes heap/priority queue operations.
    Supports: Min-Heap, Max-Heap, Heapify, Heap Sort.
    Shows both tree view and array view simultaneously.
    Animations: sift_up, sift_down, heapify, extract_min/max.
    """

    def __init__(self, heap_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_heap_name = heap_variable_name
        self.heap_type = 'min'  # min or max
        self.heap_history: List[List[Any]] = []

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        heap_keywords = ['heap', 'pq', 'priority', 'heapq', 'min_heap', 'max_heap']
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if any(kw in var_name.lower() for kw in heap_keywords):
                    if isinstance(var_value, list) and len(var_value) > 0:
                        if self.tracked_heap_name is None:
                            self.tracked_heap_name = var_name
                        self._detect_heap_type(var_value)
                        return True

            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                if 'heapq' in code or 'heappush' in code or 'heappop' in code or 'heapify' in code:
                    return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_heap = None

        for step in execution_steps:
            if self.tracked_heap_name and self.tracked_heap_name not in step.variables_state:
                continue

            current_heap = step.variables_state.get(self.tracked_heap_name)
            if not isinstance(current_heap, list):
                continue

            if previous_heap is not None:
                mutations = self._detect_heap_ops(previous_heap, current_heap)
                for mutation in mutations:
                    if mutation['op'] == 'insert':
                        # Element appears at bottom, then sifts up
                        insert_pos = len(current_heap) - 1
                        insert_cmd = AnimationCommand(
                            command_type=CommandType.CREATE,
                            target_indices=[insert_pos],
                            values={
                                'value': mutation['value'],
                                'animation': 'heap_insert',
                                'tree_position': self._get_tree_position(insert_pos),
                            },
                            duration_ms=400,
                            metadata={'physics': 'spring_in', 'view': 'dual'}
                        )
                        self.animation_sequence.append(insert_cmd)

                        # Sift up path
                        sift_path = self._compute_sift_up_path(current_heap, insert_pos)
                        for i, (child_idx, parent_idx) in enumerate(sift_path):
                            sift_cmd = AnimationCommand(
                                command_type=CommandType.SWAP,
                                target_indices=[child_idx, parent_idx],
                                values={
                                    'animation': 'sift_up',
                                    'step': i,
                                    'tree_positions': [
                                        self._get_tree_position(child_idx),
                                        self._get_tree_position(parent_idx),
                                    ],
                                },
                                duration_ms=500,
                                delay_ms=i * 200,
                                metadata={'physics': 'bubble_up', 'tension': 180, 'friction': 12}
                            )
                            self.animation_sequence.append(sift_cmd)

                    elif mutation['op'] == 'extract':
                        # Root highlighted, swapped with last, then sifts down
                        extract_cmd = AnimationCommand(
                            command_type=CommandType.POP,
                            target_indices=[0],
                            values={
                                'value': mutation['value'],
                                'animation': 'heap_extract',
                            },
                            duration_ms=500,
                            metadata={'physics': 'float_out'}
                        )
                        self.animation_sequence.append(extract_cmd)

                    elif mutation['op'] == 'swap':
                        swap_cmd = AnimationCommand(
                            command_type=CommandType.SWAP,
                            target_indices=[mutation['idx1'], mutation['idx2']],
                            values={
                                'animation': 'heap_swap',
                                'tree_positions': [
                                    self._get_tree_position(mutation['idx1']),
                                    self._get_tree_position(mutation['idx2']),
                                ],
                            },
                            duration_ms=450,
                            metadata={'physics': 'spring_swap'}
                        )
                        self.animation_sequence.append(swap_cmd)

            previous_heap = current_heap[:] if current_heap else []
            self.heap_history.append(current_heap[:])

        self.optimize_animations()
        return self.animation_sequence

    def _detect_heap_type(self, arr: List[Any]):
        """Detect min-heap or max-heap based on array structure."""
        if len(arr) < 2:
            return
        try:
            is_min = all(arr[(i - 1) // 2] <= arr[i] for i in range(1, min(len(arr), 10)))
            is_max = all(arr[(i - 1) // 2] >= arr[i] for i in range(1, min(len(arr), 10)))
            self.heap_type = 'min' if is_min else ('max' if is_max else 'min')
        except (TypeError, IndexError):
            self.heap_type = 'min'

    def _detect_heap_ops(self, old: List[Any], new: List[Any]) -> List[Dict[str, Any]]:
        ops = []
        if len(new) == len(old) + 1:
            ops.append({'op': 'insert', 'value': new[-1]})
        elif len(new) == len(old) - 1:
            ops.append({'op': 'extract', 'value': old[0]})
        else:
            # Find swaps within the heap
            for i in range(min(len(old), len(new))):
                if i < len(old) and i < len(new) and old[i] != new[i]:
                    # Try to find swap partner
                    for j in range(i + 1, min(len(old), len(new))):
                        if old[i] == new[j] and old[j] == new[i]:
                            ops.append({'op': 'swap', 'idx1': i, 'idx2': j})
                            break
        return ops

    def _get_tree_position(self, index: int) -> Dict[str, Any]:
        """Convert array index to tree x,y position for dual-view rendering."""
        depth = 0
        idx = index
        while idx > 0:
            idx = (idx - 1) // 2
            depth += 1
        # Position in level
        level_start = (1 << depth) - 1
        pos_in_level = index - level_start
        total_in_level = 1 << depth
        return {'depth': depth, 'position': pos_in_level, 'total_in_level': total_in_level}

    def _compute_sift_up_path(self, heap: List[Any], start_idx: int) -> List[tuple]:
        """Compute the path of sift-up swaps (for animation sequencing)."""
        path = []
        idx = start_idx
        while idx > 0:
            parent = (idx - 1) // 2
            if self.heap_type == 'min' and heap[idx] < heap[parent]:
                path.append((idx, parent))
            elif self.heap_type == 'max' and heap[idx] > heap[parent]:
                path.append((idx, parent))
            else:
                break
            idx = parent
        return path
