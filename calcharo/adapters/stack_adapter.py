# Stack Adapter - LIFO never looked so good
# Watch elements push, pop, and peek with satisfying spring physics

from typing import List, Dict, Any, Optional
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class StackAdapter(VisualizationAdapter):
    """Visualizes stack operations: push, pop, peek, and stack state changes.
    Detects stack-like behavior in lists used as stacks (append/pop pattern).
    """

    def __init__(self, stack_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_stack_name = stack_variable_name
        self.stack_history: List[List[Any]] = []
        self.max_observed_size = 0

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        # Look for stack patterns: variables named 'stack', or lists with append/pop
        stack_keywords = ['stack', 'stk', 'call_stack', 'undo', 'history']
        for step in execution_steps:
            if hasattr(step, 'source_code') and step.source_code:
                code_lower = step.source_code.lower()
                # Classic stack ops: .append() followed by .pop() patterns
                if '.pop()' in code_lower and '.append(' in code_lower:
                    return True

            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, list):
                    if any(kw in var_name.lower() for kw in stack_keywords):
                        if self.tracked_stack_name is None:
                            self.tracked_stack_name = var_name
                        return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_stack = None

        for step in execution_steps:
            if self.tracked_stack_name and self.tracked_stack_name not in step.variables_state:
                continue

            current_stack = step.variables_state.get(self.tracked_stack_name)
            if not isinstance(current_stack, list):
                continue

            self.max_observed_size = max(self.max_observed_size, len(current_stack))

            if previous_stack is not None:
                mutations = self._detect_stack_ops(previous_stack, current_stack)
                for mutation in mutations:
                    if mutation['op'] == 'push':
                        # Element pushed onto stack — animate it dropping in from above
                        push_cmd = AnimationCommand(
                            command_type=CommandType.PUSH,
                            target_indices=[len(current_stack) - 1],
                            values={
                                'value': mutation['value'],
                                'animation': 'drop_in',
                                'stack_size': len(current_stack),
                            },
                            duration_ms=450,
                            metadata={'physics': 'spring_bounce', 'tension': 220, 'friction': 12}
                        )
                        self.animation_sequence.append(push_cmd)

                    elif mutation['op'] == 'pop':
                        # Element popped — animate it flying out
                        pop_cmd = AnimationCommand(
                            command_type=CommandType.POP,
                            target_indices=[len(previous_stack) - 1],
                            values={
                                'value': mutation['value'],
                                'animation': 'fly_out',
                                'stack_size': len(current_stack),
                            },
                            duration_ms=400,
                            metadata={'physics': 'spring_release', 'tension': 180, 'friction': 14}
                        )
                        self.animation_sequence.append(pop_cmd)

                    elif mutation['op'] == 'peek':
                        peek_cmd = self.create_highlight_command(
                            [len(current_stack) - 1],
                            color='#FFD700',
                            duration=300
                        )
                        self.animation_sequence.append(peek_cmd)

            previous_stack = current_stack[:] if current_stack else []
            self.stack_history.append(current_stack[:])

        self.optimize_animations()
        return self.animation_sequence

    def _detect_stack_ops(self, old: List[Any], new: List[Any]) -> List[Dict[str, Any]]:
        ops = []
        if len(new) == len(old) + 1 and new[:-1] == old:
            ops.append({'op': 'push', 'value': new[-1]})
        elif len(new) == len(old) - 1 and new == old[:-1]:
            ops.append({'op': 'pop', 'value': old[-1]})
        elif len(new) > len(old):
            for val in new[len(old):]:
                ops.append({'op': 'push', 'value': val})
        elif len(new) < len(old):
            for val in reversed(old[len(new):]):
                ops.append({'op': 'pop', 'value': val})
        return ops
