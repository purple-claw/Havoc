# Linked List Adapter - Nodes and pointers, drawn with love
# Watch nodes link, unlink, traverse, and reorganize in real-time

from typing import List, Dict, Any, Optional
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class LinkedListAdapter(VisualizationAdapter):
    """Visualizes linked list operations: insert, delete, traverse, reverse.
    Detects dict-based or class-based linked list implementations.
    Shows pointer connections with animated arrows.
    """

    def __init__(self, list_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_list_name = list_variable_name
        self.node_positions: Dict[str, int] = {}
        self.pointer_states: Dict[str, str] = {}  # node_id -> next_node_id

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        ll_keywords = ['linked', 'node', 'head', 'next', 'prev', 'doubly', 'singly', 'll']
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if any(kw in var_name.lower() for kw in ll_keywords):
                    if self.tracked_list_name is None:
                        self.tracked_list_name = var_name
                    return True

                # Check for dict-based linked list: {'val': x, 'next': {...}}
                if isinstance(var_value, dict):
                    if 'next' in var_value or 'prev' in var_value:
                        if self.tracked_list_name is None:
                            self.tracked_list_name = var_name
                        return True

            # Source code patterns
            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                if '.next' in code or 'head' in code or 'linkedlist' in code:
                    return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        previous_state = None

        for step in execution_steps:
            current_state = self._extract_linked_list_state(step)
            if current_state is None:
                continue

            if previous_state is not None:
                mutations = self._detect_ll_changes(previous_state, current_state)
                for mutation in mutations:
                    if mutation['op'] == 'insert':
                        # New node appears with a spring-in animation
                        insert_cmd = AnimationCommand(
                            command_type=CommandType.CREATE,
                            target_ids=[mutation['node_id']],
                            values={
                                'value': mutation['value'],
                                'position': mutation['position'],
                                'animation': 'spring_in',
                                'linked_list': True,
                            },
                            duration_ms=500,
                            metadata={'physics': 'spring_bounce', 'tension': 250, 'friction': 15}
                        )
                        self.animation_sequence.append(insert_cmd)

                        # Draw pointer arrow from previous node
                        if mutation.get('prev_node'):
                            arrow_cmd = AnimationCommand(
                                command_type=CommandType.TRAVERSE,
                                target_ids=[f"{mutation['prev_node']}->{mutation['node_id']}"],
                                values={'animation': 'draw_arrow', 'color': '#4ECDC4'},
                                duration_ms=300,
                                metadata={'physics': 'ease_out'}
                            )
                            self.animation_sequence.append(arrow_cmd)

                    elif mutation['op'] == 'delete':
                        # Node fades out and pointer re-routes
                        delete_cmd = AnimationCommand(
                            command_type=CommandType.DELETE,
                            target_ids=[mutation['node_id']],
                            values={
                                'animation': 'fade_shrink',
                                'value': mutation['value'],
                            },
                            duration_ms=450,
                            metadata={'physics': 'spring_collapse'}
                        )
                        self.animation_sequence.append(delete_cmd)

                    elif mutation['op'] == 'traverse':
                        # Highlight current node being visited
                        traverse_cmd = AnimationCommand(
                            command_type=CommandType.VISIT,
                            target_ids=[mutation['node_id']],
                            values={
                                'color': '#FF6B6B',
                                'animation': 'pulse_glow',
                            },
                            duration_ms=350,
                            metadata={'physics': 'gentle_pulse'}
                        )
                        self.animation_sequence.append(traverse_cmd)

            previous_state = current_state

        self.optimize_animations()
        return self.animation_sequence

    def _extract_linked_list_state(self, step: ExecutionStep) -> Optional[List[Dict[str, Any]]]:
        """Extract a linear representation of the linked list from step variables."""
        nodes = []
        # Try to find linked list structure in variables
        for var_name, var_value in step.variables_state.items():
            if isinstance(var_value, dict) and ('next' in var_value or 'val' in var_value):
                nodes.append({'id': var_name, 'value': var_value.get('val', var_value), 'raw': var_value})
            elif isinstance(var_value, list) and self.tracked_list_name and var_name == self.tracked_list_name:
                for i, v in enumerate(var_value):
                    nodes.append({'id': f'node_{i}', 'value': v, 'position': i})
        return nodes if nodes else None

    def _detect_ll_changes(self, old_state: List[Dict], new_state: List[Dict]) -> List[Dict[str, Any]]:
        ops = []
        old_ids = {n['id'] for n in old_state}
        new_ids = {n['id'] for n in new_state}

        # New nodes = insertions
        for node in new_state:
            if node['id'] not in old_ids:
                ops.append({
                    'op': 'insert',
                    'node_id': node['id'],
                    'value': node['value'],
                    'position': node.get('position', len(new_state) - 1),
                    'prev_node': new_state[new_state.index(node) - 1]['id'] if new_state.index(node) > 0 else None,
                })

        # Removed nodes = deletions
        for node in old_state:
            if node['id'] not in new_ids:
                ops.append({
                    'op': 'delete',
                    'node_id': node['id'],
                    'value': node['value'],
                })

        return ops
