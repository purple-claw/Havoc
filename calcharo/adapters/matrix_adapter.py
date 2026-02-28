# Matrix Adapter - 2D arrays, grids, and dynamic programming tables
# Heat maps, path highlights, cell-by-cell filling with beautiful gradients

from typing import List, Dict, Any, Optional, Tuple
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class MatrixAdapter(VisualizationAdapter):
    """Visualizes 2D arrays, matrices, and grid-based algorithms.
    Supports: DP tables, pathfinding grids, matrix operations, game boards.
    Animations: cell_fill, path_trace, heat_map, wave_propagation, row/col highlight.
    """

    def __init__(self, matrix_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_matrix_name = matrix_variable_name
        self.matrix_history: List[List[List[Any]]] = []
        self.grid_type = 'generic'  # generic, dp_table, pathfinding, game_board

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        matrix_keywords = [
            'matrix', 'grid', 'board', 'table', 'dp', 'memo',
            'maze', 'map', 'cells', 'rows', 'cols'
        ]
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                # Check for 2D list (list of lists)
                if isinstance(var_value, list) and len(var_value) > 0:
                    if isinstance(var_value[0], list):
                        if self.tracked_matrix_name is None:
                            self.tracked_matrix_name = var_name
                        self._detect_grid_type(var_name, var_value)
                        return True
                    # Named matrix variable
                    if any(kw in var_name.lower() for kw in matrix_keywords):
                        if isinstance(var_value[0], (int, float)):
                            # 1D but named like matrix — might be flattened
                            pass
                        elif isinstance(var_value[0], list):
                            if self.tracked_matrix_name is None:
                                self.tracked_matrix_name = var_name
                            return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_matrix = None

        for step in execution_steps:
            if self.tracked_matrix_name and self.tracked_matrix_name not in step.variables_state:
                continue

            current_matrix = step.variables_state.get(self.tracked_matrix_name)
            if not isinstance(current_matrix, list) or not current_matrix:
                continue
            if not isinstance(current_matrix[0], list):
                continue

            rows = len(current_matrix)
            cols = len(current_matrix[0]) if current_matrix else 0

            if previous_matrix is not None:
                mutations = self._detect_matrix_changes(previous_matrix, current_matrix)
                for mutation in mutations:
                    if mutation['op'] == 'cell_change':
                        row, col = mutation['row'], mutation['col']
                        old_val = mutation['old_value']
                        new_val = mutation['new_value']

                        # Cell fill animation with color based on value
                        color = self._value_to_color(new_val, current_matrix)
                        cell_cmd = AnimationCommand(
                            command_type=CommandType.SET_VALUE,
                            target_indices=[row * cols + col],
                            values={
                                'row': row,
                                'col': col,
                                'old_value': old_val,
                                'new_value': new_val,
                                'color': color,
                                'animation': 'cell_fill',
                                'grid_type': self.grid_type,
                            },
                            duration_ms=300,
                            metadata={
                                'physics': 'gentle_pop',
                                'grid_size': {'rows': rows, 'cols': cols},
                            }
                        )
                        self.animation_sequence.append(cell_cmd)

                    elif mutation['op'] == 'row_change':
                        row_cmd = AnimationCommand(
                            command_type=CommandType.HIGHLIGHT,
                            target_indices=list(range(mutation['row'] * cols, (mutation['row'] + 1) * cols)),
                            values={
                                'row': mutation['row'],
                                'color': '#667eea',
                                'animation': 'row_sweep',
                            },
                            duration_ms=400,
                            metadata={'physics': 'wave'}
                        )
                        self.animation_sequence.append(row_cmd)

            # Check for DP table filling pattern
            if step.step_type == StepType.LOOP_ITERATION:
                # Check if we're iterating over i, j — classic DP
                i_val = step.variables_state.get('i')
                j_val = step.variables_state.get('j')
                if i_val is not None and j_val is not None:
                    if isinstance(i_val, int) and isinstance(j_val, int):
                        cursor_cmd = AnimationCommand(
                            command_type=CommandType.MARK,
                            target_indices=[i_val * cols + j_val],
                            values={
                                'row': i_val,
                                'col': j_val,
                                'animation': 'cursor_highlight',
                                'color': '#f093fb',
                            },
                            duration_ms=200,
                            metadata={'physics': 'gentle_pulse'}
                        )
                        self.animation_sequence.append(cursor_cmd)

            previous_matrix = [row[:] for row in current_matrix]
            self.matrix_history.append([row[:] for row in current_matrix])

        self.optimize_animations()
        return self.animation_sequence

    def _detect_grid_type(self, var_name: str, matrix: List[List[Any]]):
        name = var_name.lower()
        if 'dp' in name or 'memo' in name or 'table' in name:
            self.grid_type = 'dp_table'
        elif 'maze' in name or 'grid' in name or 'map' in name:
            self.grid_type = 'pathfinding'
        elif 'board' in name:
            self.grid_type = 'game_board'
        else:
            self.grid_type = 'generic'

    def _detect_matrix_changes(self, old: List[List[Any]], new: List[List[Any]]) -> List[Dict[str, Any]]:
        ops = []
        rows = min(len(old), len(new))
        for r in range(rows):
            cols = min(len(old[r]), len(new[r]))
            row_changed = False
            for c in range(cols):
                if old[r][c] != new[r][c]:
                    row_changed = True
                    ops.append({
                        'op': 'cell_change',
                        'row': r,
                        'col': c,
                        'old_value': old[r][c],
                        'new_value': new[r][c],
                    })
            if row_changed and cols > 3:
                # If many cells changed in a row, add a row-level animation
                changed_count = sum(1 for c in range(cols) if old[r][c] != new[r][c])
                if changed_count > cols // 2:
                    ops.append({'op': 'row_change', 'row': r})
        return ops

    def _value_to_color(self, value: Any, matrix: List[List[Any]]) -> str:
        """Map a value to a color for heat-map style visualization."""
        if isinstance(value, bool):
            return '#4ECDC4' if value else '#2C3E50'
        if isinstance(value, (int, float)):
            # Find min/max across entire matrix
            flat = []
            for row in matrix:
                for cell in row:
                    if isinstance(cell, (int, float)):
                        flat.append(cell)
            if not flat:
                return '#667eea'
            min_val, max_val = min(flat), max(flat)
            if max_val == min_val:
                return '#667eea'
            # Interpolate between cool blue and hot pink
            ratio = (value - min_val) / (max_val - min_val)
            r = int(102 + ratio * (240 - 102))
            g = int(126 + ratio * (147 - 126))
            b = int(234 + ratio * (251 - 234))
            return f'#{r:02x}{g:02x}{b:02x}'
        return '#667eea'
