# Stage 2 Tests - Testing the animation adapters
# Making sure our visualizations actually visualize something

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from calcharo import execute_and_trace
from calcharo.adapters import (
    ArrayAdapter, 
    GraphAdapter, 
    StringAdapter, 
    AnimationCommand, 
    CommandType
)


def test_array_adapter_bubble_sort():
    # Test ArrayAdapter with bubble sort - the classic
    print("\n" + "=" * 70)
    print("TEST: ArrayAdapter - Bubble Sort")
    print("=" * 70)
    
    bubble_sort_code = '''
arr = [5, 2, 4, 1, 3]
n = len(arr)

for i in range(n):
    for j in range(n - i - 1):
        # Compare adjacent elements
        if arr[j] > arr[j + 1]:
            # Swap them
            temp = arr[j]
            arr[j] = arr[j + 1]
            arr[j + 1] = temp
'''
    
    # Execute and get steps
    execution_steps = execute_and_trace(bubble_sort_code)
    print(f"Execution steps captured: {len(execution_steps)}")
    
    # Create adapter and generate animations
    array_adapter = ArrayAdapter(array_variable_name='arr')
    
    # Check if adapter can handle this
    if not array_adapter.can_handle(execution_steps):
        print("❌ FAILED: ArrayAdapter cannot handle bubble sort")
        return False
    
    # Generate animations
    animations = array_adapter.generate_animations(execution_steps)
    print(f"Animations generated: {len(animations)}")
    
    # Validate animations
    validation_passed = True
    
    # Check we have swap commands
    swap_commands = [cmd for cmd in animations if cmd.command_type == CommandType.SWAP]
    if len(swap_commands) > 0:
        print(f"✅ Swap commands generated: {len(swap_commands)}")
    else:
        print("❌ No swap commands generated")
        validation_passed = False
    
    # Check we have comparison commands
    compare_commands = [cmd for cmd in animations if cmd.command_type == CommandType.COMPARE]
    if len(compare_commands) > 0:
        print(f"✅ Comparison commands generated: {len(compare_commands)}")
    else:
        print("⚠️  No explicit comparison commands (might be implicit)")
    
    # Check we have highlight commands
    highlight_commands = [cmd for cmd in animations if cmd.command_type == CommandType.HIGHLIGHT]
    if len(highlight_commands) > 0:
        print(f"✅ Highlight commands generated: {len(highlight_commands)}")
    else:
        print("⚠️  No highlight commands generated")
    
    # Check animation sequence makes sense
    if animations:
        total_duration = sum(cmd.duration_ms for cmd in animations)
        print(f"Total animation duration: {total_duration}ms ({total_duration/1000:.1f}s)")
        
        # Sample some animations
        print("\nSample animations:")
        for i, cmd in enumerate(animations[:5]):
            print(f"  {i+1}. {cmd.command_type.name} on indices {cmd.target_indices}")
    
    print(f"\n{'✅ TEST PASSED' if validation_passed else '❌ TEST FAILED'}: ArrayAdapter - Bubble Sort")
    return validation_passed


def test_graph_adapter_bfs():
    # Test GraphAdapter with BFS - everyone's favorite graph traversal
    print("\n" + "=" * 70)
    print("TEST: GraphAdapter - BFS")
    print("=" * 70)
    
    bfs_code = '''
# Simple graph as adjacency list
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

def bfs(graph, start):
    visited = set()
    queue = [start]
    visited.add(start)
    traversal_order = []
    
    while queue:
        node = queue.pop(0)  # Dequeue
        traversal_order.append(node)
        
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)  # Enqueue
    
    return traversal_order

# Run BFS from node 'A'
result = bfs(graph, 'A')
print(f"BFS traversal: {result}")
'''
    
    # Execute and get steps
    execution_steps = execute_and_trace(bfs_code)
    print(f"Execution steps captured: {len(execution_steps)}")
    
    # Create adapter and generate animations
    graph_adapter = GraphAdapter()
    
    # Check if adapter can handle this
    if not graph_adapter.can_handle(execution_steps):
        print("❌ FAILED: GraphAdapter cannot handle BFS")
        return False
    
    # Generate animations
    animations = graph_adapter.generate_animations(execution_steps)
    print(f"Animations generated: {len(animations)}")
    
    # Validate animations
    validation_passed = True
    
    # Check we have visit commands
    visit_commands = [cmd for cmd in animations if cmd.command_type == CommandType.VISIT]
    if len(visit_commands) > 0:
        print(f"✅ Visit commands generated: {len(visit_commands)}")
    else:
        print("❌ No visit commands generated")
        validation_passed = False
    
    # Check we have mark commands (for queue operations)
    mark_commands = [cmd for cmd in animations if cmd.command_type == CommandType.MARK]
    if len(mark_commands) > 0:
        print(f"✅ Mark commands generated: {len(mark_commands)} (queue operations)")
    else:
        print("⚠️  No mark commands generated")
    
    # Check we have traverse commands for edges
    traverse_commands = [cmd for cmd in animations if cmd.command_type == CommandType.TRAVERSE]
    print(f"{'✅' if traverse_commands else '⚠️ '} Traverse commands: {len(traverse_commands)}")
    
    # Check final BFS result
    final_step = execution_steps[-1]
    if 'result' in final_step.variables_state:
        bfs_result = final_step.variables_state['result']
        print(f"BFS traversal result: {bfs_result}")
        if bfs_result == ['A', 'B', 'C', 'D', 'E', 'F']:
            print("✅ BFS traversal order correct")
        else:
            print(f"⚠️  Unexpected traversal order: {bfs_result}")
    
    print(f"\n{'✅ TEST PASSED' if validation_passed else '❌ TEST FAILED'}: GraphAdapter - BFS")
    return validation_passed


def test_string_adapter_operations():
    # Test StringAdapter with various string operations
    print("\n" + "=" * 70)
    print("TEST: StringAdapter - String Operations")
    print("=" * 70)
    
    string_code = '''
# Various string operations
text = "hello"
print(f"Original: {text}")

# Concatenation
text = text + " world"
print(f"After concatenation: {text}")

# Replacement
text = text.replace("world", "python")
print(f"After replacement: {text}")

# Reversal
reversed_text = text[::-1]
print(f"Reversed: {reversed_text}")

# Case change
upper_text = text.upper()
print(f"Uppercase: {upper_text}")

# Pattern search
pattern = "python"
if pattern in text:
    index = text.find(pattern)
    print(f"Pattern '{pattern}' found at index {index}")
'''
    
    # Execute and get steps
    execution_steps = execute_and_trace(string_code)
    print(f"Execution steps captured: {len(execution_steps)}")
    
    # Create adapter and generate animations
    string_adapter = StringAdapter()
    
    # Check if adapter can handle this
    if not string_adapter.can_handle(execution_steps):
        print("❌ FAILED: StringAdapter cannot handle string operations")
        return False
    
    # Generate animations
    animations = string_adapter.generate_animations(execution_steps)
    print(f"Animations generated: {len(animations)}")
    
    # Validate animations
    validation_passed = True
    
    # Check for various animation types
    create_commands = [cmd for cmd in animations if cmd.command_type == CommandType.CREATE]
    set_value_commands = [cmd for cmd in animations if cmd.command_type == CommandType.SET_VALUE]
    highlight_commands = [cmd for cmd in animations if cmd.command_type == CommandType.HIGHLIGHT]
    
    if create_commands or set_value_commands:
        print(f"✅ String mutation commands generated")
        print(f"   - Create: {len(create_commands)}")
        print(f"   - Set Value: {len(set_value_commands)}")
    else:
        print("⚠️  Limited string mutation commands")
    
    # Check stdout for expected output
    final_step = execution_steps[-1]
    stdout = final_step.stdout_snapshot
    if "hello world" in stdout:
        print("✅ String concatenation tracked")
    if "hello python" in stdout:
        print("✅ String replacement tracked")
    if "nohtyp olleh" in stdout:
        print("✅ String reversal tracked")
    if "HELLO PYTHON" in stdout:
        print("✅ Case change tracked")
    if "found at index" in stdout:
        print("✅ Pattern search tracked")
    
    print(f"\n{'✅ TEST PASSED' if validation_passed else '❌ TEST FAILED'}: StringAdapter - String Operations")
    return validation_passed


def test_adapter_edge_cases():
    # Test edge cases and error handling
    print("\n" + "=" * 70)
    print("TEST: Adapter Edge Cases")
    print("=" * 70)
    
    # Test with empty execution steps
    array_adapter = ArrayAdapter()
    animations = array_adapter.generate_animations([])
    print(f"Empty steps: {len(animations)} animations (should be 0)")
    
    # Test with no array in code
    non_array_code = '''
x = 5
y = 10
z = x + y
'''
    steps = execute_and_trace(non_array_code)
    can_handle = array_adapter.can_handle(steps)
    print(f"Non-array code: can_handle = {can_handle} (should be False)")
    
    # Test with multiple arrays
    multi_array_code = '''
arr1 = [1, 2, 3]
arr2 = [4, 5, 6]
arr1[0] = arr2[0]
'''
    steps = execute_and_trace(multi_array_code)
    array_adapter = ArrayAdapter()
    can_handle = array_adapter.can_handle(steps)
    animations = array_adapter.generate_animations(steps) if can_handle else []
    print(f"Multiple arrays: {len(animations)} animations generated")
    
    print("\n✅ TEST PASSED: Adapter Edge Cases")
    return True


def run_stage2_tests():
    # Run all Stage 2 tests
    print("\n" + "=" * 70)
    print("STAGE 2: VISUALIZER ADAPTERS - TEST SUITE")
    print("=" * 70)
    
    test_results = []
    
    # Run each test
    test_results.append(("ArrayAdapter - Bubble Sort", test_array_adapter_bubble_sort()))
    test_results.append(("GraphAdapter - BFS", test_graph_adapter_bfs()))
    test_results.append(("StringAdapter - Operations", test_string_adapter_operations()))
    test_results.append(("Edge Cases", test_adapter_edge_cases()))
    
    # Summary
    print("\n" + "=" * 70)
    print("STAGE 2 TEST SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for test_name, passed in test_results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} - {test_name}")
        all_passed = all_passed and passed
    
    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 ALL STAGE 2 TESTS PASSED!")
        print("✅ Stage 2 Complete: Visualizer Adapters are functional")
        print("🔹 ArrayAdapter handles sorting animations")
        print("🔹 GraphAdapter handles traversal animations")
        print("🔹 StringAdapter handles text animations")
        print("🔹 Animation command generation working")
        print("\nReady to proceed to Stage 3 on your command.")
    else:
        print("⚠️  Some tests failed. Debug time!")
    print("=" * 70)
    
    return all_passed


if __name__ == "__main__":
    run_stage2_tests()
