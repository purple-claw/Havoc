# Graph Adapter - For when your data has trust issues and won't stay in a line
# Handles graphs, trees, and any network-like structure

from typing import List, Dict, Any, Optional, Tuple, Set
import re

from .base import VisualizationAdapter, AnimationCommand, CommandType
from calcharo.core.models import ExecutionStep, StepType


class GraphAdapter(VisualizationAdapter):
    # Visualizes graph algorithms like BFS, DFS, Dijkstra, and other CS nightmares
    
    def __init__(self, graph_variable_name: Optional[str] = None):
        super().__init__()
        # Track the graph data structure
        self.tracked_graph_name = graph_variable_name
        self.node_visit_sequence = []  # Order of node visits
        self.edge_traversal_sequence = []  # Order of edge traversals
        self.node_states = {}  # Track state of each node
        self.edge_states = {}  # Track state of each edge
        self.algorithm_phase = 'initialization'  # Current phase of algorithm
        
    def can_handle(self, execution_steps: List[ExecutionStep]) -> bool:
        # Can we handle this? Look for graph-like data structures
        if not execution_steps:
            return False
        
        # Look for dictionaries that might represent graphs
        # Common patterns: adjacency lists, adjacency matrices
        graph_indicators = ['graph', 'adj', 'edges', 'nodes', 'vertices', 'tree']
        
        for step in execution_steps:
            for var_name, var_value in step.variables_state.items():
                # Check variable name for graph-related terms
                if any(indicator in var_name.lower() for indicator in graph_indicators):
                    if isinstance(var_value, (dict, list)):
                        if self.tracked_graph_name is None:
                            self.tracked_graph_name = var_name
                        return True
                
                # Check for graph-like structure (dict of lists/sets)
                if isinstance(var_value, dict):
                    # Might be adjacency list
                    if all(isinstance(v, (list, set)) for v in var_value.values()):
                        if self.tracked_graph_name is None:
                            self.tracked_graph_name = var_name
                        return True
        
        return False
    
    def generate_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        # Transform graph algorithm execution into animations
        self.reset()
        
        # Analyze what kind of graph algorithm we're dealing with
        algorithm_info = self.detect_graph_algorithm(execution_steps)
        
        # Track important graph-related variables
        visited_tracker = None  # Usually called 'visited' or 'seen'
        queue_tracker = None  # For BFS
        stack_tracker = None  # For DFS
        distance_tracker = None  # For shortest path algorithms
        
        previous_step = None
        
        for step_idx, step in enumerate(execution_steps):
            # Find graph traversal variables
            for var_name, var_value in step.variables_state.items():
                if 'visit' in var_name.lower() and isinstance(var_value, (set, list)):
                    visited_tracker = var_name
                elif 'queue' in var_name.lower() and isinstance(var_value, list):
                    queue_tracker = var_name
                elif 'stack' in var_name.lower() and isinstance(var_value, list):
                    stack_tracker = var_name
                elif 'dist' in var_name.lower() and isinstance(var_value, dict):
                    distance_tracker = var_name
            
            # Generate animations based on variable changes
            if previous_step:
                # Check visited nodes
                if visited_tracker and visited_tracker in step.variables_state:
                    new_visits = self.find_new_visits(
                        previous_step.variables_state.get(visited_tracker, set()),
                        step.variables_state[visited_tracker]
                    )
                    
                    for node_id in new_visits:
                        visit_cmd = AnimationCommand(
                            command_type=CommandType.VISIT,
                            target_ids=[str(node_id)],
                            values={'visited': True, 'color': '#FF6B6B'},  # Red for visited
                            duration_ms=400
                        )
                        self.animation_sequence.append(visit_cmd)
                
                # Check queue/stack operations for traversal order
                if queue_tracker and queue_tracker in step.variables_state:
                    queue_changes = self.detect_queue_changes(
                        previous_step.variables_state.get(queue_tracker, []),
                        step.variables_state[queue_tracker]
                    )
                    
                    for change in queue_changes:
                        if change['operation'] == 'enqueue':
                            # Node added to frontier
                            mark_cmd = AnimationCommand(
                                command_type=CommandType.MARK,
                                target_ids=[str(change['node'])],
                                values={'status': 'frontier', 'color': '#FFD93D'},  # Yellow for frontier
                                duration_ms=300
                            )
                            self.animation_sequence.append(mark_cmd)
                        elif change['operation'] == 'dequeue':
                            # Node being processed
                            process_cmd = AnimationCommand(
                                command_type=CommandType.MARK,
                                target_ids=[str(change['node'])],
                                values={'status': 'processing', 'color': '#6BCF7F'},  # Green for processing
                                duration_ms=300
                            )
                            self.animation_sequence.append(process_cmd)
                
                # Check edge traversals
                edge_traversals = self.detect_edge_traversals(step)
                for edge in edge_traversals:
                    traverse_cmd = AnimationCommand(
                        command_type=CommandType.TRAVERSE,
                        target_ids=[f"{edge['from']}-{edge['to']}"],
                        values={'traversed': True, 'color': '#4ECDC4'},
                        duration_ms=350
                    )
                    self.animation_sequence.append(traverse_cmd)
                
                # Check distance updates (for shortest path algorithms)
                if distance_tracker and distance_tracker in step.variables_state:
                    distance_updates = self.detect_distance_updates(
                        previous_step.variables_state.get(distance_tracker, {}),
                        step.variables_state[distance_tracker]
                    )
                    
                    for node_id, new_distance in distance_updates.items():
                        label_cmd = AnimationCommand(
                            command_type=CommandType.LABEL,
                            target_ids=[str(node_id)],
                            values={'label': str(new_distance), 'label_type': 'distance'},
                            duration_ms=300
                        )
                        self.animation_sequence.append(label_cmd)
            
            # Add pauses for important moments
            if step.step_type in [StepType.LOOP_ITERATION, StepType.FUNCTION_RETURN]:
                pause_cmd = self.create_pause_command(duration=150)
                self.animation_sequence.append(pause_cmd)
            
            previous_step = step
        
        # Add final animation to show completion
        self.add_completion_animation(algorithm_info['type'])
        
        # Optimize the sequence
        self.optimize_animations()
        
        return self.animation_sequence
    
    def detect_graph_algorithm(self, execution_steps: List[ExecutionStep]) -> Dict[str, Any]:
        # Try to identify which graph algorithm is being executed
        algorithm_hints = {
            'type': 'unknown',
            'uses_queue': False,
            'uses_stack': False,
            'uses_distances': False,
            'uses_visited': False,
            'is_recursive': False
        }
        
        for step in execution_steps:
            # Check for common algorithm indicators
            for var_name in step.variables_state.keys():
                var_lower = var_name.lower()
                if 'queue' in var_lower:
                    algorithm_hints['uses_queue'] = True
                elif 'stack' in var_lower:
                    algorithm_hints['uses_stack'] = True
                elif 'dist' in var_lower or 'distance' in var_lower:
                    algorithm_hints['uses_distances'] = True
                elif 'visit' in var_lower or 'seen' in var_lower:
                    algorithm_hints['uses_visited'] = True
            
            # Check for recursion
            if len(step.call_stack) > 1:
                algorithm_hints['is_recursive'] = True
        
        # Guess the algorithm type based on hints
        if algorithm_hints['uses_queue'] and algorithm_hints['uses_visited']:
            algorithm_hints['type'] = 'bfs'  # Breadth-First Search
        elif algorithm_hints['uses_stack'] and algorithm_hints['uses_visited']:
            algorithm_hints['type'] = 'dfs'  # Depth-First Search
        elif algorithm_hints['is_recursive'] and algorithm_hints['uses_visited']:
            algorithm_hints['type'] = 'dfs_recursive'  # Recursive DFS
        elif algorithm_hints['uses_distances']:
            algorithm_hints['type'] = 'shortest_path'  # Dijkstra or similar
        
        return algorithm_hints
    
    def find_new_visits(self, old_visited: Any, new_visited: Any) -> List[Any]:
        # Find newly visited nodes
        newly_visited_nodes = []
        
        # Convert to sets for comparison
        if isinstance(old_visited, list):
            old_visited = set(old_visited)
        elif not isinstance(old_visited, set):
            old_visited = set()
        
        if isinstance(new_visited, list):
            new_visited = set(new_visited)
        elif not isinstance(new_visited, set):
            new_visited = set()
        
        # Find the difference
        newly_visited_nodes = list(new_visited - old_visited)
        
        return newly_visited_nodes
    
    def detect_queue_changes(self, old_queue: List[Any], new_queue: List[Any]) -> List[Dict[str, Any]]:
        # Detect enqueue and dequeue operations
        changes = []
        
        if len(new_queue) > len(old_queue):
            # Elements added (enqueue)
            for item in new_queue:
                if item not in old_queue:
                    changes.append({
                        'operation': 'enqueue',
                        'node': item
                    })
        elif len(new_queue) < len(old_queue):
            # Elements removed (dequeue)
            for item in old_queue:
                if item not in new_queue:
                    changes.append({
                        'operation': 'dequeue',
                        'node': item
                    })
        
        return changes
    
    def detect_edge_traversals(self, step: ExecutionStep) -> List[Dict[str, Any]]:
        # Detect when edges are being traversed
        edge_traversals = []
        
        # Look for patterns in source code that indicate edge traversal
        if hasattr(step, 'source_code') and step.source_code:
            # Common patterns: for neighbor in graph[node], etc.
            if 'neighbor' in step.source_code.lower() or 'adj' in step.source_code.lower():
                # Try to extract node references
                # This is a simplified heuristic
                edge_traversals.append({
                    'from': 'current',  # Placeholder
                    'to': 'neighbor'  # Placeholder
                })
        
        return edge_traversals
    
    def detect_distance_updates(self, old_distances: Dict[Any, Any], new_distances: Dict[Any, Any]) -> Dict[Any, Any]:
        # Find distance updates in shortest path algorithms
        updates = {}
        
        for node, new_dist in new_distances.items():
            if node not in old_distances or old_distances[node] != new_dist:
                updates[node] = new_dist
        
        return updates
    
    def add_completion_animation(self, algorithm_type: str):
        # Add a final animation to show the algorithm is complete
        if algorithm_type == 'bfs':
            # Pulse all visited nodes
            completion_cmd = AnimationCommand(
                command_type=CommandType.COLOR_CHANGE,
                target_ids=['all_visited'],
                values={'color': '#2ECC71', 'pulse': True},  # Green success
                duration_ms=1000
            )
            self.animation_sequence.append(completion_cmd)
        elif algorithm_type == 'shortest_path':
            # Highlight the shortest path
            path_cmd = AnimationCommand(
                command_type=CommandType.HIGHLIGHT,
                target_ids=['shortest_path'],
                values={'color': '#E74C3C', 'width': 3},  # Red thick line
                duration_ms=1000
            )
            self.animation_sequence.append(path_cmd)
        else:
            # Generic completion
            done_cmd = AnimationCommand(
                command_type=CommandType.CLEAR,
                values={'reset_colors': True},
                duration_ms=500
            )
            self.animation_sequence.append(done_cmd)
