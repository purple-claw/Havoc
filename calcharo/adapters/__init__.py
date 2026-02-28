# Visualization Adapters - Where execution steps become pretty animations
# Because raw data is boring, we need sparkles and colors
# Now with adapters for EVERY data structure known to humanity

from .base import VisualizationAdapter, AnimationCommand, CommandType
from .array_adapter import ArrayAdapter
from .graph_adapter import GraphAdapter
from .string_adapter import StringAdapter
from .stack_adapter import StackAdapter
from .queue_adapter import QueueAdapter
from .linkedlist_adapter import LinkedListAdapter
from .tree_adapter import TreeAdapter
from .heap_adapter import HeapAdapter
from .matrix_adapter import MatrixAdapter
from .hashmap_adapter import HashMapAdapter
from .set_adapter import SetAdapter
from .generic_adapter import GenericAdapter
from .registry import AdapterRegistry, auto_detect_adapter

__all__ = [
    # Base classes
    'VisualizationAdapter',  # The parent class
    'AnimationCommand',      # What we generate
    'CommandType',           # Types of animations

    # Data structure adapters (one for every occasion)
    'ArrayAdapter',          # Sorting, searching, array manipulations
    'GraphAdapter',          # BFS, DFS, Dijkstra, A*, graph algorithms
    'StringAdapter',         # Pattern matching, string building, reversal
    'StackAdapter',          # LIFO operations, DFS stack, undo/redo
    'QueueAdapter',          # FIFO operations, BFS queue, scheduling
    'LinkedListAdapter',     # Node operations, pointer manipulation
    'TreeAdapter',           # BST, AVL, Red-Black, N-ary, Trie
    'HeapAdapter',           # Min/Max heap, priority queue, heap sort
    'MatrixAdapter',         # 2D arrays, DP tables, pathfinding grids
    'HashMapAdapter',        # Dictionary ops, hash collision, caching
    'SetAdapter',            # Set operations, Venn diagrams, membership
    'GenericAdapter',        # Catch-all for everything else

    # Auto-detection
    'AdapterRegistry',       # The matchmaker
    'auto_detect_adapter',   # Convenience function
]
