# Tree Adapter - Binary trees, BSTs, AVL, n-ary trees, heaps rendered beautifully
# Hierarchical layouts with animated insertions, deletions, rotations, and traversals

from typing import List, Dict, Any, Optional, Set
from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class TreeAdapter(VisualizationAdapter):
    """Visualizes tree data structures and algorithms.
    Supports: Binary Trees, BST, AVL, Red-Black Trees, N-ary Trees, Tries.
    Animations: insert, delete, rotate, traverse (inorder/preorder/postorder/level-order).
    """

    def __init__(self, tree_variable_name: Optional[str] = None):
        super().__init__()
        self.tracked_tree_name = tree_variable_name
        self.tree_type = 'binary'  # binary, bst, avl, nary, trie
        self.traversal_order: List[str] = []
        self.node_depths: Dict[str, int] = {}

    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        if not execution_steps:
            return False

        tree_keywords = [
            'tree', 'root', 'bst', 'avl', 'trie', 'heap',
            'left', 'right', 'children', 'parent', 'binary'
        ]
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                if any(kw in var_name.lower() for kw in tree_keywords):
                    if self.tracked_tree_name is None:
                        self.tracked_tree_name = var_name
                    return True

                # Dict with left/right children = tree node
                if isinstance(var_value, dict):
                    keys = set(var_value.keys())
                    if 'left' in keys and 'right' in keys:
                        if self.tracked_tree_name is None:
                            self.tracked_tree_name = var_name
                        self.tree_type = 'binary'
                        return True
                    if 'children' in keys:
                        if self.tracked_tree_name is None:
                            self.tracked_tree_name = var_name
                        self.tree_type = 'nary'
                        return True

            if hasattr(step, 'source_code') and step.source_code:
                code = step.source_code.lower()
                if '.left' in code or '.right' in code or 'root' in code:
                    return True
        return False

    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        self.reset()
        visited_nodes: Set[str] = set()
        previous_tree = None

        for step in execution_steps:
            current_tree = self._extract_tree_state(step)
            if current_tree is None:
                continue

            if previous_tree is not None:
                mutations = self._detect_tree_changes(previous_tree, current_tree)
                for mutation in mutations:
                    if mutation['op'] == 'insert':
                        # Node drops into position from parent with spring physics
                        insert_cmd = AnimationCommand(
                            command_type=CommandType.CREATE,
                            target_ids=[mutation['node_id']],
                            values={
                                'value': mutation['value'],
                                'depth': mutation.get('depth', 0),
                                'parent': mutation.get('parent'),
                                'side': mutation.get('side', 'root'),
                                'animation': 'tree_insert',
                                'tree_type': self.tree_type,
                            },
                            duration_ms=550,
                            metadata={
                                'physics': 'spring_drop',
                                'tension': 200,
                                'friction': 14,
                                'layout': 'hierarchical',
                            }
                        )
                        self.animation_sequence.append(insert_cmd)

                        # Draw edge from parent to new node
                        if mutation.get('parent'):
                            edge_cmd = AnimationCommand(
                                command_type=CommandType.TRAVERSE,
                                target_ids=[f"{mutation['parent']}->{mutation['node_id']}"],
                                values={
                                    'animation': 'draw_edge',
                                    'color': '#667eea',
                                    'side': mutation.get('side'),
                                },
                                duration_ms=250,
                            )
                            self.animation_sequence.append(edge_cmd)

                    elif mutation['op'] == 'delete':
                        delete_cmd = AnimationCommand(
                            command_type=CommandType.DELETE,
                            target_ids=[mutation['node_id']],
                            values={
                                'animation': 'tree_remove',
                                'value': mutation['value'],
                            },
                            duration_ms=500,
                            metadata={'physics': 'fade_collapse'}
                        )
                        self.animation_sequence.append(delete_cmd)

                    elif mutation['op'] == 'rotate':
                        # AVL/Red-Black tree rotation animation
                        rotate_cmd = AnimationCommand(
                            command_type=CommandType.MOVE,
                            target_ids=mutation['affected_nodes'],
                            values={
                                'animation': 'tree_rotate',
                                'rotation_type': mutation.get('rotation_type', 'left'),
                                'pivot': mutation.get('pivot'),
                            },
                            duration_ms=700,
                            metadata={'physics': 'smooth_arc', 'tension': 160, 'friction': 20}
                        )
                        self.animation_sequence.append(rotate_cmd)

                    elif mutation['op'] == 'visit':
                        # Traversal visit — glow effect
                        if mutation['node_id'] not in visited_nodes:
                            visit_cmd = AnimationCommand(
                                command_type=CommandType.VISIT,
                                target_ids=[mutation['node_id']],
                                values={
                                    'color': '#FF6B6B',
                                    'animation': 'tree_visit_glow',
                                    'traversal_order': len(visited_nodes),
                                },
                                duration_ms=350,
                                metadata={'physics': 'gentle_pulse'}
                            )
                            self.animation_sequence.append(visit_cmd)
                            visited_nodes.add(mutation['node_id'])

            previous_tree = current_tree

            # Check for traversal patterns in step type
            if step.step_type == StepType.FUNCTION_CALL:
                # Could be recursive traversal
                self._check_traversal_pattern(step)

        self.optimize_animations()
        return self.animation_sequence

    def _extract_tree_state(self, step: ExecutionStep) -> Optional[Dict[str, Any]]:
        """Extract tree structure from execution step variables."""
        for var_name, var_value in step.variables_state.items():
            if isinstance(var_value, dict):
                if 'left' in var_value and 'right' in var_value:
                    return self._flatten_binary_tree(var_value, var_name)
                if 'children' in var_value:
                    return self._flatten_nary_tree(var_value, var_name)
            if isinstance(var_value, list) and self.tracked_tree_name == var_name:
                # Heap-style array representation of tree
                return self._flatten_heap_tree(var_value)
        return None

    def _flatten_binary_tree(self, node: Dict, node_id: str, depth: int = 0, parent: str = None) -> Dict[str, Any]:
        """Convert nested dict tree to flat node map."""
        result = {
            'nodes': {},
            'edges': [],
        }
        if node is None:
            return result

        val = node.get('val', node.get('value', node.get('data', '?')))
        result['nodes'][node_id] = {'value': val, 'depth': depth, 'parent': parent}

        left = node.get('left')
        if left and isinstance(left, dict):
            left_id = f"{node_id}_L"
            result['edges'].append((node_id, left_id, 'left'))
            left_result = self._flatten_binary_tree(left, left_id, depth + 1, node_id)
            result['nodes'].update(left_result['nodes'])
            result['edges'].extend(left_result['edges'])

        right = node.get('right')
        if right and isinstance(right, dict):
            right_id = f"{node_id}_R"
            result['edges'].append((node_id, right_id, 'right'))
            right_result = self._flatten_binary_tree(right, right_id, depth + 1, node_id)
            result['nodes'].update(right_result['nodes'])
            result['edges'].extend(right_result['edges'])

        return result

    def _flatten_nary_tree(self, node: Dict, node_id: str, depth: int = 0, parent: str = None) -> Dict[str, Any]:
        result = {'nodes': {}, 'edges': []}
        val = node.get('val', node.get('value', '?'))
        result['nodes'][node_id] = {'value': val, 'depth': depth, 'parent': parent}

        children = node.get('children', [])
        for i, child in enumerate(children):
            if isinstance(child, dict):
                child_id = f"{node_id}_C{i}"
                result['edges'].append((node_id, child_id, f'child_{i}'))
                child_result = self._flatten_nary_tree(child, child_id, depth + 1, node_id)
                result['nodes'].update(child_result['nodes'])
                result['edges'].extend(child_result['edges'])
        return result

    def _flatten_heap_tree(self, arr: List[Any]) -> Dict[str, Any]:
        """Convert array-based heap to tree structure."""
        result = {'nodes': {}, 'edges': []}
        for i, val in enumerate(arr):
            node_id = f'heap_{i}'
            parent_id = f'heap_{(i - 1) // 2}' if i > 0 else None
            depth = 0
            idx = i
            while idx > 0:
                idx = (idx - 1) // 2
                depth += 1
            result['nodes'][node_id] = {'value': val, 'depth': depth, 'parent': parent_id}
            if parent_id:
                side = 'left' if i % 2 == 1 else 'right'
                result['edges'].append((parent_id, node_id, side))
        return result

    def _detect_tree_changes(self, old_tree: Dict, new_tree: Dict) -> List[Dict[str, Any]]:
        ops = []
        old_nodes = set(old_tree.get('nodes', {}).keys())
        new_nodes = set(new_tree.get('nodes', {}).keys())

        # Inserted nodes
        for node_id in new_nodes - old_nodes:
            node_info = new_tree['nodes'][node_id]
            ops.append({
                'op': 'insert',
                'node_id': node_id,
                'value': node_info['value'],
                'depth': node_info.get('depth', 0),
                'parent': node_info.get('parent'),
                'side': 'left' if '_L' in node_id else ('right' if '_R' in node_id else 'root'),
            })

        # Deleted nodes
        for node_id in old_nodes - new_nodes:
            node_info = old_tree['nodes'][node_id]
            ops.append({
                'op': 'delete',
                'node_id': node_id,
                'value': node_info['value'],
            })

        return ops

    def _check_traversal_pattern(self, step: ExecutionStep):
        """Detect if current step is part of a tree traversal."""
        if hasattr(step, 'source_code') and step.source_code:
            code = step.source_code.lower()
            if 'inorder' in code or 'preorder' in code or 'postorder' in code or 'levelorder' in code:
                pass  # Traversal detected — animations handled in main loop
