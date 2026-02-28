# Adapter Registry - The matchmaker that pairs code with the right visualizer
# Analyzes execution steps and picks the best adapter (or combines multiple)

from typing import List, Dict, Any, Optional, Type
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
from calcharo.core.models import ExecutionStep


# Priority order: specialized adapters first, generic last
# Key ordering rationale:
#   HeapAdapter before TreeAdapter (heaps are specialized lists; tree keyword 'heap' removed)
#   HashMapAdapter before GraphAdapter (simple dicts → maps, not graphs)
#   GraphAdapter before LinkedListAdapter (dict-of-lists → graph, not linked list)
#   MatrixAdapter before ArrayAdapter (2D arrays are more specific)
ADAPTER_PRIORITY: List[Type[VisualizationAdapter]] = [
    HeapAdapter,         # Heaps before trees (heaps use lists, very specific)
    TreeAdapter,         # Trees before graphs (trees are a subset of graphs)
    MatrixAdapter,       # 2D arrays before 1D arrays
    HashMapAdapter,      # Dictionary/hash map operations (before graph to avoid false positives)
    GraphAdapter,        # Graphs use dicts-of-lists — after HashMap which excludes graph-like shapes
    LinkedListAdapter,   # Linked lists use dicts with 'next' pointer
    StackAdapter,        # Stack before generic array
    QueueAdapter,        # Queue before generic array
    ArrayAdapter,        # General array operations
    SetAdapter,          # Set operations
    StringAdapter,       # String manipulations
    GenericAdapter,      # The catch-all safety net (always matches)
]


class AdapterRegistry:
    """Automatically detects and selects the best visualization adapter(s) for given code.
    Supports multi-adapter mode for code that uses multiple data structures.
    """

    def __init__(self):
        self._adapters: List[VisualizationAdapter] = []

    def detect_adapters(self, execution_steps: List[ExecutionStep]) -> List[VisualizationAdapter]:
        """Analyze execution steps and return matching adapters in priority order."""
        matching = []
        for adapter_cls in ADAPTER_PRIORITY:
            adapter = adapter_cls()
            try:
                if adapter.can_handle(execution_steps):
                    matching.append(adapter)
            except Exception:
                continue  # If adapter detection crashes, skip it gracefully

        if not matching:
            matching.append(GenericAdapter())

        self._adapters = matching
        return matching

    def get_primary_adapter(self, execution_steps: List[ExecutionStep]) -> VisualizationAdapter:
        """Return the single best adapter for the code."""
        adapters = self.detect_adapters(execution_steps)
        return adapters[0]

    def generate_all_animations(self, execution_steps: List[ExecutionStep]) -> Dict[str, List[AnimationCommand]]:
        """Generate animations from all matching adapters.
        Returns a dict: adapter_name -> animation_commands.
        The frontend can render multiple visualizations simultaneously.
        """
        adapters = self.detect_adapters(execution_steps)
        results = {}

        for adapter in adapters:
            adapter_name = type(adapter).__name__
            try:
                animations = adapter.generate_animations(execution_steps)
                if animations:
                    results[adapter_name] = animations
            except Exception as e:
                # One adapter failing shouldn't kill the whole pipeline
                results[adapter_name] = []

        return results

    def generate_combined_animations(self, execution_steps: List[ExecutionStep]) -> List[AnimationCommand]:
        """Generate a single combined animation sequence from the primary adapter.
        For simpler consumers that don't want multi-adapter complexity.
        """
        adapter = self.get_primary_adapter(execution_steps)
        try:
            return adapter.generate_animations(execution_steps)
        except Exception:
            # Fallback to generic
            generic = GenericAdapter()
            return generic.generate_animations(execution_steps)

    @staticmethod
    def get_adapter_info() -> List[Dict[str, str]]:
        """Return metadata about all available adapters for the UI."""
        info = []
        for adapter_cls in ADAPTER_PRIORITY:
            info.append({
                'name': adapter_cls.__name__,
                'description': (adapter_cls.__doc__ or '').strip().split('\n')[0],
                'type': adapter_cls.__name__.replace('Adapter', '').lower(),
            })
        return info


def auto_detect_adapter(execution_steps: List[ExecutionStep]) -> VisualizationAdapter:
    """Convenience function — give it steps, get back the best adapter."""
    registry = AdapterRegistry()
    return registry.get_primary_adapter(execution_steps)
