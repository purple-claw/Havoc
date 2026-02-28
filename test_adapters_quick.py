"""Quick adapter test — verify all data structures produce correct adapters."""
import requests

BASE = "http://127.0.0.1:8000/api/execute"

tests = {
    "stack": "stack = []\nfor x in [3, 1, 4, 1, 5]:\n    stack.append(x)\nwhile stack:\n    stack.pop()",
    "queue": "from collections import deque\nqueue = deque()\nfor x in [3, 1, 4, 1, 5]:\n    queue.append(x)\nwhile queue:\n    queue.popleft()",
    "graph": "graph = {'A': ['B', 'C'], 'B': ['D'], 'C': ['D'], 'D': []}\nvisited = set()\ndef dfs(node):\n    visited.add(node)\n    for n in graph[node]:\n        if n not in visited:\n            dfs(n)\ndfs('A')",
    "hashmap": "d = {}\nfor c in 'hello':\n    d[c] = d.get(c, 0) + 1",
    "string": "s = 'hello'\nresult = ''\nfor c in s:\n    result = result + c",
    "heap": "import heapq\nheap = []\nfor x in [5, 3, 1, 4, 2]:\n    heapq.heappush(heap, x)\nwhile heap:\n    heapq.heappop(heap)",
    "matrix": "matrix = [[0]*3 for _ in range(3)]\nfor i in range(3):\n    for j in range(3):\n        matrix[i][j] = i + j",
    "set_ds": "s = set()\nfor x in [3, 1, 4, 1, 5, 9]:\n    s.add(x)",
    "array": "arr = [64, 34, 25, 12, 22, 11, 90]\nn = len(arr)\nfor i in range(n):\n    for j in range(0, n-i-1):\n        if arr[j] > arr[j+1]:\n            arr[j], arr[j+1] = arr[j+1], arr[j]",
}

for name, code in tests.items():
    try:
        r = requests.post(BASE, json={"code": code}, timeout=30)
        d = r.json()
        ok = d["success"]
        steps = d["execution"]["total_steps"]
        cmds = d["animations"]["total_commands"]
        adapter = d.get("animations", {}).get("adapter", "None")
        comp = d.get("visualizer_config", {}).get("component", "?")
        err = d.get("error", "")
        status = "OK" if ok else "FAIL"
        print(f"  {status:4s}  {name:12s}  steps={steps:3d}  cmds={cmds:3d}  adapter={adapter!s:22s}  component={comp}")
        if not ok:
            print(f"        ERROR: {err}")
    except Exception as e:
        print(f"  ERR   {name:12s}  {e}")
