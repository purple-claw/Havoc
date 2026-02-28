# Queue Adapter - First In, First Out, beautifully animated
# Elements slide in from one end and gracefully exit from the other

from typing import List, Dict, Any, Optional
from collections import deque as _deque
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class QueueAdapter(VisualizationAdapter):
    """Visualizes queue operations: enqueue, dequeue, and peek.
    Detects both regular queues (list + pop(0)) and deque patterns.
    Also handles priority queue patterns.
    """

    def __init__(self, queue_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_queue_name = queue_variable_name
        self.queue_history: List[List[Any]] = []
        self.is_priority_queue = False

    @staticmethod
    def _is_queue_like(value: Any) -> bool:
        """Check if a value is queue-like (list or deque)."""
        return isinstance(value, (list, _deque))

    @staticmethod
    def _to_list(value: Any) -> list:
        """Convert a deque or list to a plain list."""
        if isinstance(value, _deque):
            return list(value)
        return value if isinstance(value, list) else []

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        queue_keywords = ['queue', 'fifo', 'bfs_queue', 'frontier', 'deque']
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if self._is_queue_like(var_value):
                    if any(kw in var_name.lower() for kw in queue_keywords):
                        if self.tracked_queue_name is None:
                            self.tracked_queue_name = var_name
                        if 'priority' in var_name.lower() or 'pq' in var_name.lower():
                            self.is_priority_queue = True
                        return True

            # Check source code for queue patterns
            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                if '.pop(0)' in code or 'deque' in code or 'popleft' in code:
                    # Try to find the queue variable by name
                    for var_name, var_value in step.variables_state.items():
                        if self._is_queue_like(var_value):
                            if self.tracked_queue_name is None:
                                self.tracked_queue_name = var_name
                            return True
                    return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_queue = None

        for step_idx, step in enumerate(execution_steps):
            if self.tracked_queue_name and self.tracked_queue_name not in step.variables_state:
                continue

            raw_val = step.variables_state.get(self.tracked_queue_name)
            current_queue = self._to_list(raw_val)
            if current_queue is None:
                continue

            if previous_queue is not None:
                mutations = self._detect_queue_ops(previous_queue, current_queue)
                for mutation in mutations:
                    if mutation['op'] == 'enqueue':
                        enq_cmd = AnimationCommand(
                            command_type=CommandType.ENQUEUE,
                            target_indices=[len(current_queue) - 1],
                            values={
                                'value': mutation['value'],
                                'animation': 'slide_in_right',
                                'queue_size': len(current_queue),
                            },
                            duration_ms=400,
                            metadata={'physics': 'spring_slide', 'tension': 200, 'friction': 18}
                        )
                        self.animation_sequence.append(enq_cmd)

                    elif mutation['op'] == 'dequeue':
                        deq_cmd = AnimationCommand(
                            command_type=CommandType.DEQUEUE,
                            target_indices=[0],
                            values={
                                'value': mutation['value'],
                                'animation': 'slide_out_left',
                                'queue_size': len(current_queue),
                            },
                            duration_ms=400,
                            metadata={'physics': 'spring_slide', 'tension': 180, 'friction': 16}
                        )
                        self.animation_sequence.append(deq_cmd)

                        # Shift remaining elements left with cascading animation
                        for i in range(len(current_queue)):
                            shift_cmd = AnimationCommand(
                                command_type=CommandType.MOVE,
                                target_indices=[i],
                                values={'animation': 'shift_left', 'positions': 1},
                                duration_ms=200,
                                delay_ms=i * 50,
                                metadata={'physics': 'gentle_spring'}
                            )
                            self.animation_sequence.append(shift_cmd)

            previous_queue = current_queue[:] if current_queue else []
            self.queue_history.append(current_queue[:])

        self.optimize_animations()
        return self.animation_sequence

    def _detect_queue_ops(self, old: List[Any], new: List[Any]) -> List[Dict[str, Any]]:
        ops = []
        # Dequeue from front (pop(0) pattern)
        if len(new) == len(old) - 1 and new == old[1:]:
            ops.append({'op': 'dequeue', 'value': old[0]})
        # Enqueue at back (append pattern)
        elif len(new) == len(old) + 1 and new[:-1] == old:
            ops.append({'op': 'enqueue', 'value': new[-1]})
        # Multiple operations
        elif len(new) > len(old):
            for val in new[len(old):]:
                ops.append({'op': 'enqueue', 'value': val})
        elif len(new) < len(old):
            removed_count = len(old) - len(new)
            for i in range(removed_count):
                ops.append({'op': 'dequeue', 'value': old[i]})
        return ops
