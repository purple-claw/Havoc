# Set Adapter - Venn diagrams, membership tests, and set operations
# Watch elements join, leave, and interact across set operations

from typing import List, Dict, Any, Optional, FrozenSet
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class SetAdapter(VisualizationAdapter):
    """Visualizes set operations: add, remove, union, intersection, difference.
    Renders sets as circles with elements inside, Venn-diagram style for set ops.
    """

    def __init__(self, set_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_set_name = set_variable_name
        self.tracked_sets: Dict[str, set] = {}  # Track multiple sets for Venn diagrams
        self.set_history: List[Dict[str, set]] = []

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, (set, frozenset)):
                    if self.tracked_set_name is None:
                        self.tracked_set_name = var_name
                    return True

            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                set_ops = ['.add(', '.remove(', '.discard(', '.union(', '.intersection(',
                           '.difference(', '.symmetric_difference(', ' | ', ' & ', ' - ', ' ^ ']
                if any(op in code for op in set_ops):
                    return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_sets: Dict[str, set] = {}

        for step in execution_steps:
            # Track all sets in the current state
            current_sets: Dict[str, set] = {}
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, (set, frozenset)):
                    current_sets[var_name] = set(var_value)

            if not current_sets:
                continue

            # Detect changes across all tracked sets
            for set_name, current_set in current_sets.items():
                prev_set = previous_sets.get(set_name, set())

                added = current_set - prev_set
                removed = prev_set - current_set

                for elem in added:
                    add_cmd = AnimationCommand(
                        command_type=CommandType.CREATE,
                        target_ids=[f"{set_name}::{elem}"],
                        values={
                            'element': elem,
                            'set_name': set_name,
                            'animation': 'bubble_in',
                            'set_size': len(current_set),
                        },
                        duration_ms=400,
                        metadata={'physics': 'spring_pop', 'tension': 220, 'friction': 14}
                    )
                    self.animation_sequence.append(add_cmd)

                for elem in removed:
                    remove_cmd = AnimationCommand(
                        command_type=CommandType.DELETE,
                        target_ids=[f"{set_name}::{elem}"],
                        values={
                            'element': elem,
                            'set_name': set_name,
                            'animation': 'bubble_out',
                        },
                        duration_ms=350,
                        metadata={'physics': 'fade_shrink'}
                    )
                    self.animation_sequence.append(remove_cmd)

            # Detect set operations between multiple sets
            if len(current_sets) >= 2 and hasattr(step, 'source_code') and step.source_code:
                code = step.source_code
                set_names = list(current_sets.keys())
                if '|' in code or 'union' in code:
                    venn_cmd = AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_ids=[f"venn::{set_names[0]}::{set_names[1]}"],
                        values={
                            'operation': 'union',
                            'sets': set_names[:2],
                            'animation': 'venn_merge',
                            'color': '#4ECDC4',
                        },
                        duration_ms=600,
                        metadata={'physics': 'smooth_expand'}
                    )
                    self.animation_sequence.append(venn_cmd)

                elif '&' in code or 'intersection' in code:
                    venn_cmd = AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_ids=[f"venn::{set_names[0]}::{set_names[1]}"],
                        values={
                            'operation': 'intersection',
                            'sets': set_names[:2],
                            'animation': 'venn_intersect',
                            'color': '#FFD93D',
                        },
                        duration_ms=600,
                        metadata={'physics': 'pulse_overlap'}
                    )
                    self.animation_sequence.append(venn_cmd)

                elif '-' in code or 'difference' in code:
                    venn_cmd = AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_ids=[f"venn::{set_names[0]}::{set_names[1]}"],
                        values={
                            'operation': 'difference',
                            'sets': set_names[:2],
                            'animation': 'venn_subtract',
                            'color': '#FF6B6B',
                        },
                        duration_ms=600,
                        metadata={'physics': 'fade_overlap'}
                    )
                    self.animation_sequence.append(venn_cmd)

            previous_sets = {k: set(v) for k, v in current_sets.items()}
            self.set_history.append({k: set(v) for k, v in current_sets.items()})

        self.optimize_animations()
        return self.animation_sequence
