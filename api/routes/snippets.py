# Snippets route — save, load, and manage code snippets
# Pre-built algorithm gallery + user saved code

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid
import json
import os
from datetime import datetime

router = APIRouter()

# In-memory store for now — Turso/SQLite integration comes with deployment
# This keeps the free tier truly free (no DB required for local dev)
_snippets_store: Dict[str, Dict[str, Any]] = {}


class Snippet(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=500_000)
    description: Optional[str] = Field(default="", max_length=2000)
    category: str = Field(default="general")
    tags: List[str] = Field(default_factory=list)
    language: str = Field(default="python")


class SnippetResponse(BaseModel):
    id: str
    title: str
    code: str
    description: str
    category: str
    tags: List[str]
    created_at: str


# Pre-built algorithm gallery — the crown jewels
GALLERY_SNIPPETS = [
    {
        "id": "gallery_bubble_sort",
        "title": "Bubble Sort",
        "category": "sorting",
        "tags": ["sorting", "array", "O(n²)", "beginner"],
        "description": "The classic O(n²) sorting algorithm. Repeatedly steps through the list, compares adjacent elements, and swaps them if they're in the wrong order.",
        "code": '''def bubble_sort(arr):
    """Bubble Sort — O(n²) but satisfying to watch"""
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
sorted_nums = bubble_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_quick_sort",
        "title": "Quick Sort",
        "category": "sorting",
        "tags": ["sorting", "array", "O(n log n)", "divide-and-conquer", "intermediate"],
        "description": "Divide and conquer sorting. Picks a pivot, partitions elements, and recursively sorts sub-arrays.",
        "code": '''def quick_sort(arr):
    """Quick Sort — O(n log n) average, recursive elegance"""
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

numbers = [3, 6, 8, 10, 1, 2, 1]
sorted_nums = quick_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_merge_sort",
        "title": "Merge Sort",
        "category": "sorting",
        "tags": ["sorting", "array", "O(n log n)", "divide-and-conquer", "intermediate"],
        "description": "Stable divide-and-conquer sort. Splits array in half, sorts each half, then merges them back.",
        "code": '''def merge_sort(arr):
    """Merge Sort — stable O(n log n), the reliable workhorse"""
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

numbers = [38, 27, 43, 3, 9, 82, 10]
sorted_nums = merge_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_insertion_sort",
        "title": "Insertion Sort",
        "category": "sorting",
        "tags": ["sorting", "array", "O(n²)", "beginner"],
        "description": "Builds the sorted array one item at a time. Great for small or nearly-sorted datasets.",
        "code": '''def insertion_sort(arr):
    """Insertion Sort — O(n²) but elegant for small inputs"""
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

numbers = [12, 11, 13, 5, 6]
sorted_nums = insertion_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_selection_sort",
        "title": "Selection Sort",
        "category": "sorting",
        "tags": ["sorting", "array", "O(n²)", "beginner"],
        "description": "Finds the minimum element and places it at the beginning. Simple but inefficient.",
        "code": '''def selection_sort(arr):
    """Selection Sort — find the min, place it, repeat"""
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

numbers = [64, 25, 12, 22, 11]
sorted_nums = selection_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_binary_search",
        "title": "Binary Search",
        "category": "searching",
        "tags": ["searching", "array", "O(log n)", "beginner"],
        "description": "Efficiently finds a target in a sorted array by repeatedly halving the search space.",
        "code": '''def binary_search(arr, target):
    """Binary Search — O(log n), the power of halving"""
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

sorted_arr = [2, 3, 4, 10, 40, 50, 60, 70]
target = 10
result = binary_search(sorted_arr, target)
print(f"Element {target} found at index {result}")''',
    },
    {
        "id": "gallery_bfs",
        "title": "Breadth-First Search (BFS)",
        "category": "graph",
        "tags": ["graph", "BFS", "traversal", "queue", "intermediate"],
        "description": "Explores a graph level by level using a queue. Finds shortest paths in unweighted graphs.",
        "code": '''def bfs(graph, start):
    """BFS — explore neighbors first, go deeper later"""
    visited = set()
    queue = [start]
    visited.add(start)
    order = []

    while queue:
        node = queue.pop(0)
        order.append(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return order

graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

result = bfs(graph, 'A')
print(f"BFS traversal: {result}")''',
    },
    {
        "id": "gallery_dfs",
        "title": "Depth-First Search (DFS)",
        "category": "graph",
        "tags": ["graph", "DFS", "traversal", "stack", "recursion", "intermediate"],
        "description": "Explores as far as possible along each branch before backtracking.",
        "code": '''def dfs(graph, start, visited=None):
    """DFS — go deep, then backtrack"""
    if visited is None:
        visited = set()
    visited.add(start)
    order = [start]

    for neighbor in graph[start]:
        if neighbor not in visited:
            order.extend(dfs(graph, neighbor, visited))

    return order

graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

result = dfs(graph, 'A')
print(f"DFS traversal: {result}")''',
    },
    {
        "id": "gallery_dijkstra",
        "title": "Dijkstra's Shortest Path",
        "category": "graph",
        "tags": ["graph", "shortest-path", "greedy", "priority-queue", "advanced"],
        "description": "Finds shortest paths from a source to all vertices in a weighted graph.",
        "code": '''def dijkstra(graph, start):
    """Dijkstra — greedy shortest path finder"""
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    visited = set()
    queue = [(0, start)]

    while queue:
        queue.sort()
        current_dist, current = queue.pop(0)

        if current in visited:
            continue
        visited.add(current)

        for neighbor, weight in graph[current]:
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                queue.append((distance, neighbor))

    return distances

graph = {
    'A': [('B', 1), ('C', 4)],
    'B': [('A', 1), ('C', 2), ('D', 5)],
    'C': [('A', 4), ('B', 2), ('D', 1)],
    'D': [('B', 5), ('C', 1)]
}

result = dijkstra(graph, 'A')
print(f"Shortest distances from A: {result}")''',
    },
    {
        "id": "gallery_stack_ops",
        "title": "Stack Operations",
        "category": "data_structure",
        "tags": ["stack", "LIFO", "beginner"],
        "description": "Classic stack operations: push, pop, peek. Last In, First Out.",
        "code": '''stack = []

# Push elements
stack.append(10)
stack.append(20)
stack.append(30)
stack.append(40)
print(f"Stack after pushes: {stack}")

# Peek at top
top = stack[-1]
print(f"Top element: {top}")

# Pop elements
popped = stack.pop()
print(f"Popped: {popped}, Stack: {stack}")

popped = stack.pop()
print(f"Popped: {popped}, Stack: {stack}")

# Push more
stack.append(50)
print(f"Final stack: {stack}")''',
    },
    {
        "id": "gallery_queue_ops",
        "title": "Queue Operations",
        "category": "data_structure",
        "tags": ["queue", "FIFO", "beginner"],
        "description": "Queue operations: enqueue, dequeue. First In, First Out.",
        "code": '''queue = []

# Enqueue elements
queue.append('A')
queue.append('B')
queue.append('C')
queue.append('D')
print(f"Queue: {queue}")

# Dequeue
first = queue.pop(0)
print(f"Dequeued: {first}, Queue: {queue}")

first = queue.pop(0)
print(f"Dequeued: {first}, Queue: {queue}")

# Enqueue more
queue.append('E')
queue.append('F')
print(f"Final queue: {queue}")''',
    },
    {
        "id": "gallery_bst",
        "title": "Binary Search Tree",
        "category": "tree",
        "tags": ["tree", "BST", "binary-tree", "intermediate"],
        "description": "Binary Search Tree with insert and inorder traversal.",
        "code": '''def insert_bst(root, val):
    """Insert a value into BST"""
    if root is None:
        return {'val': val, 'left': None, 'right': None}
    if val < root['val']:
        root['left'] = insert_bst(root['left'], val)
    else:
        root['right'] = insert_bst(root['right'], val)
    return root

def inorder(root, result=None):
    """Inorder traversal — left, root, right"""
    if result is None:
        result = []
    if root:
        inorder(root['left'], result)
        result.append(root['val'])
        inorder(root['right'], result)
    return result

# Build BST
root = None
values = [50, 30, 70, 20, 40, 60, 80]
for val in values:
    root = insert_bst(root, val)

traversal = inorder(root)
print(f"Inorder: {traversal}")''',
    },
    {
        "id": "gallery_dp_fibonacci",
        "title": "Dynamic Programming — Fibonacci",
        "category": "dynamic_programming",
        "tags": ["DP", "dynamic-programming", "memoization", "beginner"],
        "description": "Fibonacci with memoization — the gateway drug to dynamic programming.",
        "code": '''def fibonacci_dp(n):
    """Fibonacci with DP — O(n) time, O(n) space"""
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1

    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]

# Calculate Fibonacci numbers
for i in range(10):
    result = fibonacci_dp(i)
    print(f"F({i}) = {result}")''',
    },
    {
        "id": "gallery_dp_knapsack",
        "title": "0/1 Knapsack Problem",
        "category": "dynamic_programming",
        "tags": ["DP", "dynamic-programming", "matrix", "advanced"],
        "description": "Classic 0/1 Knapsack solved with a DP table. Watch the table fill up cell by cell.",
        "code": '''def knapsack(weights, values, capacity):
    """0/1 Knapsack — DP table magic"""
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i - 1] <= w:
                dp[i][w] = max(
                    dp[i - 1][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]
                )
            else:
                dp[i][w] = dp[i - 1][w]

    return dp[n][capacity]

weights = [2, 3, 4, 5]
values = [3, 4, 5, 6]
capacity = 8
result = knapsack(weights, values, capacity)
print(f"Max value: {result}")''',
    },
    {
        "id": "gallery_linked_list",
        "title": "Linked List Operations",
        "category": "data_structure",
        "tags": ["linked-list", "pointers", "intermediate"],
        "description": "Linked list with insert, delete, and traversal operations.",
        "code": '''def create_node(val, next_node=None):
    return {'val': val, 'next': next_node}

def insert_at_end(head, val):
    new_node = create_node(val)
    if head is None:
        return new_node
    current = head
    while current['next'] is not None:
        current = current['next']
    current['next'] = new_node
    return head

def traverse(head):
    result = []
    current = head
    while current is not None:
        result.append(current['val'])
        current = current['next']
    return result

# Build linked list
head = None
for val in [10, 20, 30, 40, 50]:
    head = insert_at_end(head, val)

path = traverse(head)
print(f"Linked list: {path}")''',
    },
    {
        "id": "gallery_hashmap",
        "title": "Hash Map Frequency Counter",
        "category": "data_structure",
        "tags": ["hash-map", "dictionary", "frequency", "beginner"],
        "description": "Count character frequencies using a hash map. Watch keys hash into buckets.",
        "code": '''def char_frequency(text):
    """Count character frequencies — hash map in action"""
    freq = {}
    for char in text:
        if char in freq:
            freq[char] = freq[char] + 1
        else:
            freq[char] = 1
    return freq

text = "hello world"
freq = char_frequency(text)
print(f"Frequencies: {freq}")

# Find most common character
max_char = max(freq, key=freq.get)
print(f"Most common: '{max_char}' ({freq[max_char]} times)")''',
    },
    {
        "id": "gallery_two_sum",
        "title": "Two Sum (Hash Map)",
        "category": "problem_solving",
        "tags": ["hash-map", "array", "interview", "beginner"],
        "description": "The classic Two Sum problem using a hash map for O(n) lookup.",
        "code": '''def two_sum(nums, target):
    """Two Sum — the interview question that launched a thousand careers"""
    seen = {}
    for i in range(len(nums)):
        complement = target - nums[i]
        if complement in seen:
            return [seen[complement], i]
        seen[nums[i]] = i
    return []

nums = [2, 7, 11, 15]
target = 9
result = two_sum(nums, target)
print(f"Indices: {result}")
print(f"Values: {nums[result[0]]} + {nums[result[1]]} = {target}")''',
    },
    {
        "id": "gallery_set_operations",
        "title": "Set Operations",
        "category": "data_structure",
        "tags": ["set", "venn-diagram", "beginner"],
        "description": "Union, intersection, difference — set theory made visual.",
        "code": '''# Create sets
set_a = {1, 2, 3, 4, 5}
set_b = {4, 5, 6, 7, 8}
print(f"Set A: {set_a}")
print(f"Set B: {set_b}")

# Union — everything in either set
union = set_a | set_b
print(f"Union: {union}")

# Intersection — only what's in both
intersection = set_a & set_b
print(f"Intersection: {intersection}")

# Difference — in A but not in B
difference = set_a - set_b
print(f"Difference (A-B): {difference}")

# Symmetric difference — in one but not both
sym_diff = set_a ^ set_b
print(f"Symmetric Difference: {sym_diff}")''',
    },
    {
        "id": "gallery_heap_sort",
        "title": "Heap Sort",
        "category": "sorting",
        "tags": ["sorting", "heap", "priority-queue", "O(n log n)", "intermediate"],
        "description": "Sort using a heap data structure. Watch elements sift up and down.",
        "code": '''def heapify(arr, n, i):
    """Maintain heap property"""
    largest = i
    left = 2 * i + 1
    right = 2 * i + 2

    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right

    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    """Heap Sort — O(n log n), in-place"""
    n = len(arr)
    # Build max heap
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    # Extract elements
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)
    return arr

numbers = [12, 11, 13, 5, 6, 7]
sorted_nums = heap_sort(numbers)
print(f"Sorted: {sorted_nums}")''',
    },
    {
        "id": "gallery_matrix_traversal",
        "title": "Matrix Spiral Traversal",
        "category": "matrix",
        "tags": ["matrix", "2D-array", "traversal", "intermediate"],
        "description": "Traverse a matrix in spiral order. Watch the cursor trace the spiral path.",
        "code": '''def spiral_order(matrix):
    """Spiral traversal — round and round we go"""
    result = []
    if not matrix:
        return result

    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1

    while top <= bottom and left <= right:
        for col in range(left, right + 1):
            result.append(matrix[top][col])
        top += 1

        for row in range(top, bottom + 1):
            result.append(matrix[row][right])
        right -= 1

        if top <= bottom:
            for col in range(right, left - 1, -1):
                result.append(matrix[bottom][col])
            bottom -= 1

        if left <= right:
            for row in range(bottom, top - 1, -1):
                result.append(matrix[row][left])
            left += 1

    return result

matrix = [
    [1,  2,  3,  4],
    [5,  6,  7,  8],
    [9,  10, 11, 12],
    [13, 14, 15, 16]
]
result = spiral_order(matrix)
print(f"Spiral: {result}")''',
    },
]


@router.get("/snippets/gallery")
async def get_gallery():
    """Return the pre-built algorithm gallery for the UI."""
    # Group by category
    categories = {}
    for snippet in GALLERY_SNIPPETS:
        cat = snippet['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            'id': snippet['id'],
            'title': snippet['title'],
            'description': snippet['description'],
            'tags': snippet['tags'],
            'code_preview': snippet['code'][:150] + '...' if len(snippet['code']) > 150 else snippet['code'],
        })
    return {"categories": categories, "total": len(GALLERY_SNIPPETS)}


@router.get("/snippets/gallery/{snippet_id}")
async def get_gallery_snippet(snippet_id: str):
    """Get a specific gallery snippet by ID."""
    for snippet in GALLERY_SNIPPETS:
        if snippet['id'] == snippet_id:
            return snippet
    raise HTTPException(status_code=404, detail=f"Snippet '{snippet_id}' not found in gallery")


@router.post("/snippets", response_model=SnippetResponse)
async def save_snippet(snippet: Snippet):
    """Save a user code snippet."""
    snippet_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    stored = {
        'id': snippet_id,
        'title': snippet.title,
        'code': snippet.code,
        'description': snippet.description or '',
        'category': snippet.category,
        'tags': snippet.tags,
        'language': snippet.language,
        'created_at': now,
    }
    _snippets_store[snippet_id] = stored

    return SnippetResponse(**stored)


@router.get("/snippets/{snippet_id}")
async def get_snippet(snippet_id: str):
    """Load a saved snippet by ID."""
    if snippet_id in _snippets_store:
        return _snippets_store[snippet_id]
    raise HTTPException(status_code=404, detail=f"Snippet '{snippet_id}' not found")


@router.get("/snippets")
async def list_snippets():
    """List all saved snippets."""
    return {"snippets": list(_snippets_store.values()), "total": len(_snippets_store)}
