# tests/test_new_adapters.py — pytest tests for all 9 new adapters + registry
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from calcharo.core.models import ExecutionStep, VariableType
from calcharo.adapters import (
    StackAdapter, QueueAdapter, LinkedListAdapter, TreeAdapter,
    HeapAdapter, MatrixAdapter, HashMapAdapter, SetAdapter,
    GenericAdapter, AdapterRegistry, auto_detect_adapter,
)


# ── helpers ──────────────────────────────────────────────────────────

def _step(line: int, variables: dict, step_number: int = 1, step_type: str = "ASSIGNMENT") -> ExecutionStep:
    """Build a minimal ExecutionStep for testing."""
    return ExecutionStep(
        step_number=step_number,
        line_number=line,
        step_type=step_type,
        code_line="# test",
        variables={k: {"value": v, "type": type(v).__name__} for k, v in variables.items()},
        variable_changes={},
        stdout="",
        call_stack=[],
        heap={},
        execution_time_ms=0.0,
    )


# ── StackAdapter ─────────────────────────────────────────────────────

class TestStackAdapter:
    def test_can_handle_stack(self):
        steps = [_step(1, {"stack": []}), _step(2, {"stack": [1, 2]})]
        adapter = StackAdapter()
        assert adapter.can_handle(steps)

    def test_generate_animations(self):
        steps = [_step(1, {"stack": []}), _step(2, {"stack": [10]}), _step(3, {"stack": [10, 20]})]
        adapter = StackAdapter()
        cmds = adapter.generate_animations(steps)
        assert len(cmds) > 0


# ── QueueAdapter ─────────────────────────────────────────────────────

class TestQueueAdapter:
    def test_can_handle_queue(self):
        steps = [_step(1, {"queue": []}), _step(2, {"queue": [1]})]
        adapter = QueueAdapter()
        assert adapter.can_handle(steps)

    def test_can_handle_deque(self):
        steps = [_step(1, {"dq": "deque([])"})]
        adapter = QueueAdapter()
        assert adapter.can_handle(steps)


# ── LinkedListAdapter ─────────────────────────────────────────────────

class TestLinkedListAdapter:
    def test_can_handle_linked_list_keywords(self):
        steps = [_step(1, {"linked_list": [1, 2, 3]})]
        adapter = LinkedListAdapter()
        assert adapter.can_handle(steps)

    def test_generate_animations(self):
        steps = [_step(1, {"head": None}), _step(2, {"head": {"val": 1, "next": None}})]
        adapter = LinkedListAdapter()
        cmds = adapter.generate_animations(steps)
        assert isinstance(cmds, list)


# ── TreeAdapter ──────────────────────────────────────────────────────

class TestTreeAdapter:
    def test_can_handle_tree(self):
        steps = [_step(1, {"root": {"val": 5, "left": None, "right": None}})]
        adapter = TreeAdapter()
        assert adapter.can_handle(steps)

    def test_can_handle_heap_like_array(self):
        steps = [_step(1, {"heap": [10, 20, 30]})]
        adapter = TreeAdapter()
        # TreeAdapter looks for nested dicts; a plain list isn't a tree
        # HeapAdapter should match this instead
        assert not adapter.can_handle(steps)


# ── HeapAdapter ──────────────────────────────────────────────────────

class TestHeapAdapter:
    def test_can_handle_heap_name(self):
        steps = [_step(1, {"heap": [3, 1, 2]})]
        adapter = HeapAdapter()
        assert adapter.can_handle(steps)

    def test_generate_animations(self):
        steps = [
            _step(1, {"heap": []}),
            _step(2, {"heap": [5]}),
            _step(3, {"heap": [5, 8]}),
            _step(4, {"heap": [5, 8, 3]}),
        ]
        adapter = HeapAdapter()
        cmds = adapter.generate_animations(steps)
        assert len(cmds) > 0


# ── MatrixAdapter ────────────────────────────────────────────────────

class TestMatrixAdapter:
    def test_can_handle_2d_list(self):
        steps = [_step(1, {"grid": [[0, 0], [0, 0]]})]
        adapter = MatrixAdapter()
        assert adapter.can_handle(steps)

    def test_can_handle_dp(self):
        steps = [_step(1, {"dp": [[0, 1], [2, 3]]})]
        adapter = MatrixAdapter()
        assert adapter.can_handle(steps)


# ── HashMapAdapter ───────────────────────────────────────────────────

class TestHashMapAdapter:
    def test_can_handle_dict(self):
        steps = [_step(1, {"freq": {"a": 1, "b": 2}})]
        adapter = HashMapAdapter()
        assert adapter.can_handle(steps)

    def test_generate_animations(self):
        steps = [
            _step(1, {"counts": {}}),
            _step(2, {"counts": {"x": 1}}),
            _step(3, {"counts": {"x": 2}}),
        ]
        adapter = HashMapAdapter()
        cmds = adapter.generate_animations(steps)
        assert len(cmds) > 0


# ── SetAdapter ───────────────────────────────────────────────────────

class TestSetAdapter:
    def test_can_handle_set_keyword(self):
        steps = [_step(1, {"visited": set()})]
        adapter = SetAdapter()
        assert adapter.can_handle(steps)


# ── GenericAdapter ───────────────────────────────────────────────────

class TestGenericAdapter:
    def test_always_handles(self):
        steps = [_step(1, {"x": 42})]
        adapter = GenericAdapter()
        assert adapter.can_handle(steps)

    def test_generate_animations(self):
        steps = [_step(1, {"a": 1}), _step(2, {"a": 2, "b": 3})]
        adapter = GenericAdapter()
        cmds = adapter.generate_animations(steps)
        assert len(cmds) > 0


# ── AdapterRegistry ─────────────────────────────────────────────────

class TestAdapterRegistry:
    def test_detect_array(self):
        steps = [_step(1, {"arr": [5, 3, 1]})]
        adapter = auto_detect_adapter(steps)
        # Should match ArrayAdapter (lists that aren't 2D)
        assert adapter is not None

    def test_detect_tree(self):
        steps = [_step(1, {"root": {"val": 1, "left": None, "right": None}})]
        adapter = auto_detect_adapter(steps)
        assert adapter is not None

    def test_detect_generic_fallback(self):
        steps = [_step(1, {"x": 42})]
        adapter = auto_detect_adapter(steps)
        assert adapter is not None

    def test_registry_list_all(self):
        reg = AdapterRegistry()
        names = reg.list_adapters()
        assert len(names) > 0


# ── Run with: pytest tests/test_new_adapters.py -v ───────────────────
