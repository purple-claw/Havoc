# Array Adapter - For when lists need to be animated
# Specializes in sorting algorithms, array manipulations, and making bars go up and down
# Each command is now aligned to its source execution step via step_index

from typing import List, Dict, Any, Optional, Tuple
import re
import copy

from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class ArrayAdapter(VisualizationAdapter):
    """Handles arrays/lists — sorting, searching, manipulation.
    Generates step-aligned animation commands so the frontend can
    play them back one step at a time like a visual debugger.
    """

    def __init__(self, array_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_array_name = array_variable_name
        self.array_snapshot_timeline: List[List[Any]] = []
        self._detected_arrays: Dict[str, bool] = {}

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if isinstance(var_value, list) and all(
                    isinstance(v, (int, float, str)) for v in var_value
                ):
                    if self.tracked_array_name is None:
                        self.tracked_array_name = var_name
                    self._detected_arrays[var_name] = True
                    return True
        return False

    # ─── main generation ────────────────────────────────────
    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        """Walk every execution step and produce commands aligned by step_index."""
        self.reset()
        self.array_snapshot_timeline = []

        if not execution_steps:
            return []

        # Auto-detect tracked array if not yet set
        if self.tracked_array_name is None:
            for step in execution_steps:
                for vn, vv in step.variables_state.items():
                    if isinstance(vv, list):
                        self.tracked_array_name = vn
                        break
                if self.tracked_array_name:
                    break
        if self.tracked_array_name is None:
            return []

        prev_arr: Optional[List[Any]] = None

        for idx, step in enumerate(execution_steps):
            cur_arr = step.variables_state.get(self.tracked_array_name)
            if cur_arr is None or not isinstance(cur_arr, list):
                # Step doesn't touch the array — emit a highlight for the current line
                if prev_arr is not None:
                    self.animation_sequence.append(AnimationCommand(
                        command_type=CommandType.PAUSE,
                        duration_ms=50,
                        step_index=idx,
                    ))
                continue

            # Snapshot
            snapshot = list(cur_arr)
            self.array_snapshot_timeline.append(snapshot)

            if prev_arr is None:
                # First time we see the array — CREATE command
                self.animation_sequence.append(AnimationCommand(
                    command_type=CommandType.CREATE,
                    target_indices=list(range(len(snapshot))),
                    values={'array': snapshot, 'variable': self.tracked_array_name},
                    duration_ms=400,
                    step_index=idx,
                ))
                prev_arr = snapshot
                continue

            # --- detect mutations between prev_arr and cur_arr ---
            cmds = self._diff_arrays(prev_arr, snapshot, step, idx)
            if cmds:
                self.animation_sequence.extend(cmds)
            else:
                # No visible change — still emit a step marker so the frontend
                # has a 1:1 mapping for this step
                if step.step_type == StepType.CONDITION:
                    # Comparison happening — try to emit COMPARE
                    comp_indices = self._guess_compare_indices(step, prev_arr)
                    if comp_indices:
                        self.animation_sequence.append(AnimationCommand(
                            command_type=CommandType.COMPARE,
                            target_indices=comp_indices,
                            values={'result': step.condition_result},
                            duration_ms=250,
                            step_index=idx,
                        ))
                    else:
                        self.animation_sequence.append(AnimationCommand(
                            command_type=CommandType.HIGHLIGHT,
                            target_indices=[],
                            duration_ms=100,
                            step_index=idx,
                        ))
                elif step.step_type in (StepType.LOOP_START, StepType.LOOP_END, StepType.LOOP_ITERATION):
                    self.animation_sequence.append(AnimationCommand(
                        command_type=CommandType.PAUSE,
                        duration_ms=80,
                        step_index=idx,
                    ))
                else:
                    self.animation_sequence.append(AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_indices=[],
                        duration_ms=100,
                        step_index=idx,
                    ))

            prev_arr = snapshot

        # Final celebration if the array ended up sorted
        if self.array_snapshot_timeline:
            final = self.array_snapshot_timeline[-1]
            if self._is_sorted(final):
                for i in range(len(final)):
                    self.animation_sequence.append(AnimationCommand(
                        command_type=CommandType.HIGHLIGHT,
                        target_indices=[i],
                        values={'color': '#00e676', 'celebration': True},
                        duration_ms=80,
                        delay_ms=i * 40,
                        step_index=len(execution_steps) - 1,
                    ))

        return self.animation_sequence

    # ─── diff engine ────────────────────────────────────────
    def _diff_arrays(
        self, old: List[Any], new: List[Any], step: ExecutionStep, step_idx: int
    ) -> List[AnimationCommand]:
        cmds: List[AnimationCommand] = []

        # Size change → CREATE / DELETE
        if len(new) > len(old):
            for i in range(len(old), len(new)):
                cmds.append(AnimationCommand(
                    command_type=CommandType.CREATE,
                    target_indices=[i],
                    values={'value': new[i]},
                    duration_ms=300,
                    step_index=step_idx,
                ))
            return cmds
        if len(new) < len(old):
            for i in range(len(new), len(old)):
                cmds.append(AnimationCommand(
                    command_type=CommandType.DELETE,
                    target_indices=[i],
                    values={'value': old[i]},
                    duration_ms=300,
                    step_index=step_idx,
                ))
            return cmds

        # Same size — find changed indices
        changed = [i for i in range(len(old)) if old[i] != new[i]]
        if not changed:
            return cmds  # nothing changed

        # Perfect swap: exactly 2 positions exchanged values
        if len(changed) == 2:
            a, b = changed
            if old[a] == new[b] and old[b] == new[a]:
                # Emit COMPARE first, then SWAP
                cmds.append(AnimationCommand(
                    command_type=CommandType.COMPARE,
                    target_indices=[a, b],
                    values={'result': True},
                    duration_ms=200,
                    step_index=step_idx,
                ))
                cmds.append(AnimationCommand(
                    command_type=CommandType.SWAP,
                    target_indices=[a, b],
                    values={'old': [old[a], old[b]], 'new': [new[a], new[b]]},
                    duration_ms=450,
                    step_index=step_idx,
                ))
                return cmds

        # Partial swap (temp-variable pattern) — two indices differ but not a clean swap
        if len(changed) == 2:
            a, b = changed
            cmds.append(AnimationCommand(
                command_type=CommandType.SWAP,
                target_indices=[a, b],
                values={'old': [old[a], old[b]], 'new': [new[a], new[b]]},
                duration_ms=450,
                step_index=step_idx,
            ))
            return cmds

        # General multi-value change → SET_VALUE per changed index
        for i in changed:
            cmds.append(AnimationCommand(
                command_type=CommandType.SET_VALUE,
                target_indices=[i],
                values={'old_value': old[i], 'new_value': new[i]},
                duration_ms=350,
                step_index=step_idx,
            ))
        return cmds

    # ─── helpers ────────────────────────────────────────────
    def _guess_compare_indices(self, step: ExecutionStep, arr: List[Any]) -> Optional[List[int]]:
        """Try to figure out which array indices are being compared from variable state."""
        src = step.source_code if step.source_code else ''
        vs = step.variables_state
        # Common patterns: arr[j] > arr[j+1]
        j = vs.get('j')
        i = vs.get('i')
        if j is not None and isinstance(j, int) and 0 <= j < len(arr):
            if j + 1 < len(arr):
                return [j, j + 1]
        if i is not None and isinstance(i, int) and 0 <= i < len(arr):
            if i + 1 < len(arr):
                return [i, i + 1]
        return None

    @staticmethod
    def _is_sorted(arr: List[Any]) -> bool:
        if not arr or len(arr) <= 1:
            return True
        try:
            return all(arr[i] <= arr[i + 1] for i in range(len(arr) - 1))
        except TypeError:
            return False
