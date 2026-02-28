# Generic Adapter - The catch-all when no specialized adapter matches
# Handles general code execution with variable state changes, flow visualization

from typing import List, Dict, Any, Optional
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class GenericAdapter(VisualizationAdapter):
    """Fallback adapter for any code that doesn't match specialized adapters.
    Visualizes: variable state changes, control flow, function call graphs,
    scope changes, and general execution flow.
    Always returns True for can_handle — it's the safety net.
    """

    def __init__(self):
        super().__init__()
        self.variable_timeline: Dict[str, List[Any]] = {}
        self.scope_stack: List[str] = []

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        # The generic adapter handles everything — it's the fallback
        return bool(execution_steps)

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_step = None

        for step_idx, step in enumerate(execution_steps):
            # Detect variable state changes
            if previous_step:
                changes = self.detect_variable_changes(step, previous_step)

                # New variables created
                for var_name in changes['new_variables']:
                    value = step.variables_state.get(var_name)
                    create_cmd = AnimationCommand(
                        command_type=CommandType.CREATE,
                        target_ids=[var_name],
                        values={
                            'variable_name': var_name,
                            'value': self._safe_value(value),
                            'type': type(value).__name__ if value is not None else 'None',
                            'animation': 'variable_appear',
                        },
                        duration_ms=350,
                        metadata={'physics': 'spring_pop', 'category': 'variable'}
                    )
                    self.animation_sequence.append(create_cmd)

                # Modified variables
                for var_name in changes['modified_variables']:
                    change_info = changes['value_changes'].get(var_name, {})
                    update_cmd = AnimationCommand(
                        command_type=CommandType.SET_VALUE,
                        target_ids=[var_name],
                        values={
                            'variable_name': var_name,
                            'old_value': self._safe_value(change_info.get('from')),
                            'new_value': self._safe_value(change_info.get('to')),
                            'animation': 'value_update',
                        },
                        duration_ms=300,
                        metadata={'physics': 'gentle_flash', 'category': 'variable'}
                    )
                    self.animation_sequence.append(update_cmd)

                # Deleted variables
                for var_name in changes['deleted_variables']:
                    delete_cmd = AnimationCommand(
                        command_type=CommandType.DELETE,
                        target_ids=[var_name],
                        values={
                            'variable_name': var_name,
                            'animation': 'variable_disappear',
                        },
                        duration_ms=300,
                        metadata={'physics': 'fade_out', 'category': 'variable'}
                    )
                    self.animation_sequence.append(delete_cmd)

            # Control flow markers
            if step.step_type == StepType.CONDITION:
                condition_cmd = AnimationCommand(
                    command_type=CommandType.HIGHLIGHT,
                    target_ids=[f'line_{step.line_number}'],
                    values={
                        'line': step.line_number,
                        'result': step.condition_result,
                        'source': step.source_code,
                        'animation': 'condition_branch',
                        'color': '#4ECDC4' if step.condition_result else '#FF6B6B',
                    },
                    duration_ms=400,
                    metadata={'category': 'control_flow'}
                )
                self.animation_sequence.append(condition_cmd)

            elif step.step_type == StepType.LOOP_START:
                loop_cmd = AnimationCommand(
                    command_type=CommandType.MARK,
                    target_ids=[f'loop_{step.line_number}'],
                    values={
                        'line': step.line_number,
                        'source': step.source_code,
                        'animation': 'loop_enter',
                        'color': '#667eea',
                    },
                    duration_ms=300,
                    metadata={'category': 'control_flow'}
                )
                self.animation_sequence.append(loop_cmd)

            elif step.step_type == StepType.LOOP_END:
                loop_end_cmd = AnimationCommand(
                    command_type=CommandType.UNMARK,
                    target_ids=[f'loop_{step.line_number}'],
                    values={'animation': 'loop_exit'},
                    duration_ms=200,
                    metadata={'category': 'control_flow'}
                )
                self.animation_sequence.append(loop_end_cmd)

            elif step.step_type == StepType.FUNCTION_CALL:
                call_cmd = AnimationCommand(
                    command_type=CommandType.MARK,
                    target_ids=[f'func_{step.source_code}'],
                    values={
                        'function_name': step.source_code,
                        'animation': 'function_enter',
                        'color': '#f093fb',
                        'depth': len(step.call_stack),
                    },
                    duration_ms=400,
                    metadata={'category': 'function_call', 'physics': 'zoom_in'}
                )
                self.animation_sequence.append(call_cmd)

            elif step.step_type == StepType.FUNCTION_RETURN:
                return_cmd = AnimationCommand(
                    command_type=CommandType.UNMARK,
                    target_ids=[f'func_return'],
                    values={
                        'return_value': self._safe_value(step.expression_value),
                        'animation': 'function_return',
                        'depth': len(step.call_stack),
                    },
                    duration_ms=350,
                    metadata={'category': 'function_call', 'physics': 'zoom_out'}
                )
                self.animation_sequence.append(return_cmd)

            elif step.step_type == StepType.PRINT:
                print_cmd = AnimationCommand(
                    command_type=CommandType.LABEL,
                    target_ids=['console'],
                    values={
                        'output': self._safe_value(step.expression_value),
                        'animation': 'console_print',
                    },
                    duration_ms=300,
                    metadata={'category': 'output'}
                )
                self.animation_sequence.append(print_cmd)

            # Track variable timeline
            for var_name, var_value in step.variables_state.items():
                if var_name not in self.variable_timeline:
                    self.variable_timeline[var_name] = []
                self.variable_timeline[var_name].append(self._safe_value(var_value))

            previous_step = step

        self.optimize_animations()
        return self.animation_sequence

    def _safe_value(self, value: Any) -> Any:
        """Make values safe for JSON serialization."""
        if value is None:
            return None
        if isinstance(value, (int, float, bool, str)):
            return value
        if isinstance(value, (list, tuple)):
            return [self._safe_value(v) for v in value[:100]]  # Cap at 100 elements
        if isinstance(value, dict):
            return {str(k): self._safe_value(v) for k, v in list(value.items())[:50]}
        if isinstance(value, set):
            return list(value)[:50]
        return str(value)[:200]
