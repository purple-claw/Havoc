# AIExplainer — free-tier AI-powered code explanations
# Uses HuggingFace Inference API (free), Groq (free tier), or local fallback
# No API keys required for basic operation — rule-based fallback always works

import re
import os
import json
import hashlib
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

# Optional AI imports — gracefully degrade if not available
try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


@dataclass
class Explanation:
    """A single step or section explanation."""
    step_range: tuple  # (start_line, end_line)
    title: str
    summary: str
    detail: str
    complexity: Optional[str] = None    # O(n), O(n²), etc.
    concept: Optional[str] = None       # "recursion", "dp", "greedy"
    tips: List[str] = field(default_factory=list)
    analogy: Optional[str] = None       # Real-world analogy


@dataclass
class FullExplanation:
    """Complete explanation for a code visualization."""
    overview: str
    algorithm_name: Optional[str]
    time_complexity: Optional[str]
    space_complexity: Optional[str]
    step_explanations: List[Explanation]
    key_concepts: List[str]
    learning_path: List[str]       # What to study next
    fun_fact: Optional[str] = None


class AIExplainer:
    """
    Generates intelligent code explanations using a tiered approach:

    Tier 1: Free AI API (HuggingFace Inference / Groq free tier)
    Tier 2: Rule-based pattern matching (always available, zero cost)

    The rule-based engine is surprisingly good for common algorithms.
    The AI tier adds natural language richness and handles edge cases.
    """

    # Pattern database for rule-based explanations
    ALGORITHM_PATTERNS = {
        'bubble_sort': {
            'patterns': [r'for.*range.*\n.*for.*range.*\n.*if.*>.*\n.*swap|arr\[.*\].*=.*arr\[.*\]'],
            'name': 'Bubble Sort',
            'time': 'O(n²)',
            'space': 'O(1)',
            'overview': 'Bubble Sort repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.',
            'analogy': 'Imagine bubbles rising in water — the largest bubbles (biggest numbers) float to the top first.',
            'concepts': ['nested loops', 'comparison-based sorting', 'in-place algorithm'],
        },
        'quick_sort': {
            'patterns': [r'pivot', r'partition|quick_sort.*left.*right'],
            'name': 'Quick Sort',
            'time': 'O(n log n) average, O(n²) worst',
            'space': 'O(log n) stack space',
            'overview': 'Quick Sort picks a pivot element, partitions the array so elements smaller than pivot go left and larger go right, then recursively sorts both partitions.',
            'analogy': 'Like organizing a messy deck of cards by picking a card, putting smaller cards in one pile and bigger cards in another, then repeating for each pile.',
            'concepts': ['divide and conquer', 'recursion', 'partitioning', 'pivot selection'],
        },
        'merge_sort': {
            'patterns': [r'merge.*sort|def merge\(', r'mid.*=.*len.*//.*2'],
            'name': 'Merge Sort',
            'time': 'O(n log n)',
            'space': 'O(n)',
            'overview': 'Merge Sort divides the array in half, recursively sorts both halves, then merges them back together in sorted order. It\'s stable and predictable.',
            'analogy': 'Like splitting a deck of cards in half repeatedly until you have single cards, then merging them back in order — methodical and reliable.',
            'concepts': ['divide and conquer', 'recursion', 'merging', 'stable sort'],
        },
        'binary_search': {
            'patterns': [r'left.*right.*mid|low.*high.*mid', r'mid.*=.*\(.*\+.*\).*//.*2'],
            'name': 'Binary Search',
            'time': 'O(log n)',
            'space': 'O(1)',
            'overview': 'Binary Search finds a target in a sorted array by repeatedly halving the search space. Each comparison eliminates half the remaining elements.',
            'analogy': 'Like finding a word in a dictionary — you open to the middle, decide if your word is before or after, and repeat with the correct half.',
            'concepts': ['divide and conquer', 'logarithmic time', 'sorted arrays'],
        },
        'bfs': {
            'patterns': [r'queue.*append|queue.*pop\(0\)', r'visited.*set|visited.*=.*\[\]'],
            'name': 'Breadth-First Search (BFS)',
            'time': 'O(V + E)',
            'space': 'O(V)',
            'overview': 'BFS explores a graph level by level using a queue. It visits all neighbors of a node before moving to the next level. Guarantees shortest path in unweighted graphs.',
            'analogy': 'Like ripples spreading on a pond — the wave expands outward equally in all directions from where the stone was dropped.',
            'concepts': ['graph traversal', 'queue data structure', 'shortest path', 'level-order'],
        },
        'dfs': {
            'patterns': [r'def dfs|stack.*pop\(\)', r'visited.*add|visited.*append'],
            'name': 'Depth-First Search (DFS)',
            'time': 'O(V + E)',
            'space': 'O(V)',
            'overview': 'DFS explores as far as possible along each branch before backtracking. Uses recursion or an explicit stack.',
            'analogy': 'Like exploring a maze by always choosing the leftmost path until you hit a dead end, then backing up to try the next path.',
            'concepts': ['graph traversal', 'recursion', 'backtracking', 'stack'],
        },
        'dijkstra': {
            'patterns': [r'dijkstra|shortest.*path', r'distances.*=.*inf|float\(.*inf.*\)'],
            'name': 'Dijkstra\'s Shortest Path',
            'time': 'O((V + E) log V)',
            'space': 'O(V)',
            'overview': 'Dijkstra\'s algorithm finds the shortest path from a source to all other vertices in a weighted graph with non-negative weights.',
            'analogy': 'Like a GPS finding the quickest route — it always expands from the closest unvisited location, gradually mapping out optimal paths.',
            'concepts': ['greedy algorithm', 'priority queue', 'shortest path', 'weighted graphs'],
        },
        'stack_ops': {
            'patterns': [r'stack.*append.*\n.*stack.*pop|\.push|\.pop'],
            'name': 'Stack Operations',
            'time': 'O(1) per operation',
            'space': 'O(n)',
            'overview': 'A stack is a Last-In-First-Out (LIFO) data structure. Elements are added (pushed) and removed (popped) from the same end.',
            'analogy': 'Like a stack of plates — you can only add or remove from the top. The last plate you put on is the first one you take off.',
            'concepts': ['LIFO', 'push/pop operations', 'function call stack'],
        },
        'queue_ops': {
            'patterns': [r'queue.*append.*\n.*queue.*pop\(0\)|enqueue|dequeue'],
            'name': 'Queue Operations',
            'time': 'O(1) per operation',
            'space': 'O(n)',
            'overview': 'A queue is a First-In-First-Out (FIFO) data structure. Elements are added at the back and removed from the front.',
            'analogy': 'Like a line at a store — the first person in line is the first person served.',
            'concepts': ['FIFO', 'enqueue/dequeue operations', 'scheduling'],
        },
        'dp_table': {
            'patterns': [r'dp\[.*\]\[.*\]|dp\[i\].*=.*dp\[i.*-.*1\]', r'memo|memoiz'],
            'name': 'Dynamic Programming',
            'time': 'Depends on subproblem structure',
            'space': 'O(n) to O(n²)',
            'overview': 'Dynamic Programming solves complex problems by breaking them into overlapping subproblems. It stores intermediate results to avoid redundant computation.',
            'analogy': 'Like filling in a crossword puzzle — once you solve a clue, you write down the answer so you don\'t have to solve it again.',
            'concepts': ['optimal substructure', 'overlapping subproblems', 'memoization', 'tabulation'],
        },
        'tree_traversal': {
            'patterns': [r'def inorder|def preorder|def postorder', r'root\[.*left.*\]|root\.left'],
            'name': 'Tree Traversal',
            'time': 'O(n)',
            'space': 'O(h) where h = height',
            'overview': 'Tree traversal visits every node in a tree exactly once. Common orders: inorder (left, root, right), preorder (root, left, right), postorder (left, right, root).',
            'analogy': 'Like reading a family tree — you can go depth-first down each branch or breadth-first across each generation.',
            'concepts': ['recursion', 'binary trees', 'traversal orders'],
        },
        'hash_map': {
            'patterns': [r'freq\[|count\[|dict\(\)|{}', r'if.*in.*:|\.get\('],
            'name': 'Hash Map / Dictionary',
            'time': 'O(1) average per operation',
            'space': 'O(n)',
            'overview': 'A hash map stores key-value pairs with O(1) average lookup time. Keys are hashed to bucket indices for fast access.',
            'analogy': 'Like a library catalog — instead of searching every book, you look up the catalog number to go directly to the right shelf.',
            'concepts': ['hashing', 'key-value pairs', 'collision handling', 'amortized O(1)'],
        },
        'linked_list': {
            'patterns': [r'node\[.*next.*\]|\.next\s*=|next_node'],
            'name': 'Linked List',
            'time': 'O(n) search, O(1) insert/delete at known position',
            'space': 'O(n)',
            'overview': 'A linked list is a sequence of nodes where each node points to the next. Unlike arrays, insertion and deletion don\'t require shifting elements.',
            'analogy': 'Like a treasure hunt — each clue tells you where to find the next clue, forming a chain.',
            'concepts': ['pointers/references', 'node structure', 'sequential access'],
        },
        'heap': {
            'patterns': [r'heappush|heappop|heapify|sift_up|sift_down'],
            'name': 'Heap / Priority Queue',
            'time': 'O(log n) insert/extract',
            'space': 'O(n)',
            'overview': 'A heap is a complete binary tree where each parent is smaller (min-heap) or larger (max-heap) than its children. Supports efficient insert and extract-min/max.',
            'analogy': 'Like a corporate hierarchy where the CEO (root) is always the most/least important person, and promotions happen by swapping with your boss.',
            'concepts': ['complete binary tree', 'heap property', 'sift up/down', 'priority queue'],
        },
        'set_operations': {
            'patterns': [r'set\(|\.union|\.intersection|\.difference', r'\s\|\s|\s&\s|\s-\s.*set'],
            'name': 'Set Operations',
            'time': 'O(min(len(s1), len(s2))) for most operations',
            'space': 'O(len(s1) + len(s2))',
            'overview': 'Sets are unordered collections of unique elements. They support mathematical operations like union, intersection, and difference.',
            'analogy': 'Like Venn diagrams — union is everything in both circles, intersection is the overlap, difference is what\'s only in one circle.',
            'concepts': ['set theory', 'uniqueness', 'hash-based storage'],
        },
        'recursion': {
            'patterns': [r'def (\w+).*\n(?:.*\n)*?.*\1\('],
            'name': 'Recursion',
            'time': 'Depends on the recurrence relation',
            'space': 'O(depth) stack space',
            'overview': 'Recursion is when a function calls itself with a smaller version of the same problem. Every recursive function needs a base case to stop.',
            'analogy': 'Like Russian nesting dolls — each doll contains a smaller version of itself, until you reach the smallest one (base case).',
            'concepts': ['base case', 'recursive case', 'call stack', 'divide and conquer'],
        },
    }

    # Explanation cache — same code gets same explanation
    _cache: Dict[str, FullExplanation] = {}

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the explainer.
        api_key: Optional HuggingFace or Groq API key for enhanced explanations.
        Falls back to rule-based if no key provided (still great!).
        """
        self.api_key = api_key or os.environ.get('HAVOC_AI_KEY', '')
        self.groq_key = os.environ.get('GROQ_API_KEY', '')
        self.hf_key = os.environ.get('HF_API_KEY', '') or self.api_key

    def _cache_key(self, code: str) -> str:
        """Generate cache key from code."""
        return hashlib.md5(code.encode()).hexdigest()

    def detect_algorithm(self, code: str) -> Optional[Dict[str, Any]]:
        """Detect which algorithm/data structure the code implements."""
        code_lower = code.lower()

        best_match = None
        best_score = 0

        for algo_id, algo_info in self.ALGORITHM_PATTERNS.items():
            score = 0
            for pattern in algo_info['patterns']:
                try:
                    if re.search(pattern, code, re.MULTILINE | re.IGNORECASE):
                        score += 1
                except re.error:
                    continue

            # Also check function/variable names
            if algo_id.replace('_', '') in code_lower.replace('_', '').replace(' ', ''):
                score += 2

            if score > best_score:
                best_score = score
                best_match = {**algo_info, 'id': algo_id, 'confidence': min(score / len(algo_info['patterns']), 1.0)}

        return best_match if best_score > 0 else None

    def _generate_step_explanations(
        self,
        code: str,
        steps: List[Dict],
        algo_info: Optional[Dict]
    ) -> List[Explanation]:
        """Generate line-by-line / section explanations using pattern analysis."""
        explanations = []
        lines = code.split('\n')

        # Group steps by logical sections
        current_section_start = 0
        current_section_type = None
        sections = []

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue

            # Detect section type
            if stripped.startswith('def '):
                if current_section_type:
                    sections.append((current_section_start, i - 1, current_section_type))
                current_section_start = i
                current_section_type = 'function_definition'
            elif stripped.startswith('for ') or stripped.startswith('while '):
                if current_section_type != 'loop':
                    if current_section_type:
                        sections.append((current_section_start, i - 1, current_section_type))
                    current_section_start = i
                    current_section_type = 'loop'
            elif stripped.startswith('if ') or stripped.startswith('elif ') or stripped.startswith('else'):
                if current_section_type != 'conditional':
                    if current_section_type:
                        sections.append((current_section_start, i - 1, current_section_type))
                    current_section_start = i
                    current_section_type = 'conditional'
            elif '=' in stripped and not stripped.startswith('='):
                if current_section_type != 'assignment':
                    if current_section_type:
                        sections.append((current_section_start, i - 1, current_section_type))
                    current_section_start = i
                    current_section_type = 'assignment'

        # Don't forget the last section
        if current_section_type:
            sections.append((current_section_start, len(lines) - 1, current_section_type))

        # Generate explanations for each section
        section_descriptions = {
            'function_definition': ('Function Definition', 'Defining a new function that encapsulates a piece of the algorithm.'),
            'loop': ('Loop', 'Iterating through elements — this is where the core work happens.'),
            'conditional': ('Decision Point', 'Making a choice based on a condition — the algorithm branches here.'),
            'assignment': ('Variable Update', 'Storing or updating a value for later use.'),
        }

        for start, end, section_type in sections:
            title, summary = section_descriptions.get(
                section_type, ('Code Section', 'A section of the algorithm.')
            )

            section_code = '\n'.join(lines[start:end + 1])
            detail = self._explain_section(section_code, section_type, algo_info)

            explanations.append(Explanation(
                step_range=(start + 1, end + 1),
                title=title,
                summary=summary,
                detail=detail,
                concept=section_type,
            ))

        return explanations

    def _explain_section(
        self,
        code_section: str,
        section_type: str,
        algo_info: Optional[Dict]
    ) -> str:
        """Generate a detailed explanation for a code section."""
        stripped = code_section.strip()

        if section_type == 'function_definition':
            # Extract function name and params
            match = re.match(r'def (\w+)\((.*?)\)', stripped)
            if match:
                func_name, params = match.groups()
                readable_name = func_name.replace('_', ' ').title()
                if params:
                    param_list = [p.strip().split('=')[0].strip().split(':')[0].strip() for p in params.split(',')]
                    return (
                        f"This defines '{readable_name}' which takes {len(param_list)} parameter(s): "
                        f"{', '.join(param_list)}. "
                        f"The function body below implements the core logic."
                    )
                return f"This defines '{readable_name}' — a helper function used by the algorithm."

        elif section_type == 'loop':
            if 'for' in stripped.split('\n')[0]:
                match = re.match(r'for (\w+) in range\((.+?)\)', stripped)
                if match:
                    var, range_expr = match.groups()
                    return (
                        f"This loop iterates with '{var}' over range({range_expr}). "
                        f"Each iteration processes one element or step of the algorithm."
                    )
                match = re.match(r'for (\w+) in (\w+)', stripped)
                if match:
                    var, iterable = match.groups()
                    return (
                        f"This loop iterates through each '{var}' in '{iterable}'. "
                        f"Each element is processed in sequence."
                    )
            elif 'while' in stripped.split('\n')[0]:
                match = re.match(r'while (.+?):', stripped)
                if match:
                    condition = match.group(1)
                    return (
                        f"This while loop continues as long as '{condition}' is true. "
                        f"It will stop when the condition becomes false (or we hit a break)."
                    )

        elif section_type == 'conditional':
            match = re.match(r'if (.+?):', stripped)
            if match:
                condition = match.group(1)
                return (
                    f"Decision point: checks if '{condition}'. "
                    f"The algorithm takes different paths based on this condition."
                )

        return f"This section contains {section_type.replace('_', ' ')} operations."

    def explain(
        self,
        code: str,
        execution_steps: Optional[List[Dict]] = None,
        adapter_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive explanation for the code.

        Returns a JSON-serializable dictionary with:
        - overview: High-level description
        - algorithm_name: Detected algorithm name
        - time/space complexity
        - step_explanations: Detailed per-section explanations
        - key_concepts: Related CS concepts
        - learning_path: What to study next
        - fun_fact: A fun fact about the algorithm (because learning should be fun)
        """
        cache_key = self._cache_key(code)
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            return self._serialize_explanation(cached)

        # Detect algorithm
        algo_info = self.detect_algorithm(code)

        # Generate step explanations
        step_explanations = self._generate_step_explanations(
            code, execution_steps or [], algo_info
        )

        if algo_info:
            explanation = FullExplanation(
                overview=algo_info.get('overview', 'A code algorithm being visualized.'),
                algorithm_name=algo_info.get('name'),
                time_complexity=algo_info.get('time'),
                space_complexity=algo_info.get('space'),
                step_explanations=step_explanations,
                key_concepts=algo_info.get('concepts', []),
                learning_path=self._suggest_learning_path(algo_info.get('id', '')),
                fun_fact=self._get_fun_fact(algo_info.get('id', '')),
            )
        else:
            # Generic explanation
            explanation = FullExplanation(
                overview=self._generate_generic_overview(code),
                algorithm_name=None,
                time_complexity=None,
                space_complexity=None,
                step_explanations=step_explanations,
                key_concepts=self._detect_concepts(code),
                learning_path=['Study the fundamentals of the data structures used in this code.'],
                fun_fact="Every expert was once a beginner. Keep visualizing! 🚀",
            )

        # Cache it
        self._cache[cache_key] = explanation

        return self._serialize_explanation(explanation)

    def _serialize_explanation(self, explanation: FullExplanation) -> Dict[str, Any]:
        """Convert FullExplanation to a JSON-serializable dict."""
        return {
            'overview': explanation.overview,
            'algorithm_name': explanation.algorithm_name,
            'time_complexity': explanation.time_complexity,
            'space_complexity': explanation.space_complexity,
            'step_explanations': [
                {
                    'step_range': list(exp.step_range),
                    'title': exp.title,
                    'summary': exp.summary,
                    'detail': exp.detail,
                    'complexity': exp.complexity,
                    'concept': exp.concept,
                    'tips': exp.tips,
                    'analogy': exp.analogy,
                }
                for exp in explanation.step_explanations
            ],
            'key_concepts': explanation.key_concepts,
            'learning_path': explanation.learning_path,
            'fun_fact': explanation.fun_fact,
        }

    def _generate_generic_overview(self, code: str) -> str:
        """Generate a generic overview when we can't detect a specific algorithm."""
        lines = code.split('\n')
        functions = [l.strip() for l in lines if l.strip().startswith('def ')]
        classes = [l.strip() for l in lines if l.strip().startswith('class ')]

        parts = []
        if functions:
            func_names = [re.match(r'def (\w+)', f).group(1) for f in functions if re.match(r'def (\w+)', f)]
            parts.append(f"This code defines {len(functions)} function(s): {', '.join(func_names[:5])}")
        if classes:
            parts.append(f"with {len(classes)} class(es)")

        parts.append(f"totaling {len(lines)} lines.")
        return ' '.join(parts) if parts else f"A {len(lines)}-line Python program."

    def _detect_concepts(self, code: str) -> List[str]:
        """Detect CS concepts present in the code."""
        concepts = []
        patterns = {
            'recursion': r'def (\w+).*\n(?:.*\n)*?.*\1\(',
            'iteration': r'for |while ',
            'conditionals': r'if |elif |else:',
            'list operations': r'\[.*\]|\.append|\.extend|\.pop',
            'dictionary usage': r'\{.*:.*\}|\.get\(|\.keys\(\)|\.values\(\)',
            'string manipulation': r'\.split|\.join|\.replace|\.strip',
            'sorting': r'\.sort\(\)|sorted\(',
            'math operations': r'import math|sqrt|pow|abs\(',
        }
        for concept, pattern in patterns.items():
            if re.search(pattern, code, re.MULTILINE):
                concepts.append(concept)
        return concepts

    def _suggest_learning_path(self, algo_id: str) -> List[str]:
        """Suggest what to learn next based on the current algorithm."""
        paths = {
            'bubble_sort': [
                'Next: Try Selection Sort and Insertion Sort',
                'Then: Learn Merge Sort (divide and conquer)',
                'Advanced: Quick Sort and its partitioning strategies',
                'Master level: Study when to use which sorting algorithm',
            ],
            'quick_sort': [
                'Review: Merge Sort for comparison',
                'Explore: Randomized pivot selection',
                'Advanced: Introsort (hybrid sorting)',
                'Related: Quick Select for finding kth element',
            ],
            'merge_sort': [
                'Compare: Quick Sort for in-place alternative',
                'Apply: External merge sort for large files',
                'Related: Merge operation in merge k sorted lists',
                'Advanced: Tim Sort (Python\'s built-in!)',
            ],
            'binary_search': [
                'Variations: Lower bound, upper bound',
                'Apply: Binary search on answer space',
                'Related: Ternary search',
                'Advanced: Interpolation search',
            ],
            'bfs': [
                'Compare: DFS and when to use each',
                'Apply: Shortest path in unweighted graphs',
                'Related: Level-order tree traversal',
                'Advanced: Bidirectional BFS, A* search',
            ],
            'dfs': [
                'Compare: BFS and when to use each',
                'Apply: Cycle detection, topological sort',
                'Related: Backtracking algorithms',
                'Advanced: Tarjan\'s SCC algorithm',
            ],
            'dijkstra': [
                'Prerequisite: BFS for unweighted graphs',
                'Related: Bellman-Ford for negative weights',
                'Advanced: A* search with heuristics',
                'Master: Floyd-Warshall for all-pairs shortest paths',
            ],
            'dp_table': [
                'Start: Fibonacci, Climbing Stairs',
                'Intermediate: LCS, Edit Distance',
                'Advanced: Knapsack, Matrix Chain Multiplication',
                'Master: Bitmask DP, Digit DP',
            ],
        }
        return paths.get(algo_id, [
            'Practice more problems with this data structure',
            'Try implementing variations of this algorithm',
            'Study the time and space complexity analysis',
        ])

    def _get_fun_fact(self, algo_id: str) -> str:
        """Return a fun fact about the algorithm. Learning should be fun!"""
        facts = {
            'bubble_sort': "Bubble Sort is named after the way smaller elements 'bubble' to the top. It's the algorithm most taught in CS classes despite being one of the least efficient! Barack Obama once said in an interview that bubble sort is not the way to go.",
            'quick_sort': "Quick Sort was invented by Tony Hoare in 1959. He came up with it while trying to sort words for a machine translation project. The algorithm is so good that many standard libraries use it (or variants of it) as their default sort.",
            'merge_sort': "Merge Sort was invented by John von Neumann in 1945 — yes, the same genius who worked on the Manhattan Project and invented game theory. It's one of the few O(n log n) sorts that's also stable.",
            'binary_search': "Binary search can identify any element in a sorted list of 1 billion items in at most 30 comparisons. That's the power of logarithms — cutting the problem in half each time is incredibly efficient.",
            'bfs': "BFS was first invented for solving mazes by Edward F. Moore in 1959. Today it's used everywhere from social network's 'People You May Know' feature to GPS navigation.",
            'dfs': "DFS is the backbone of many advanced graph algorithms. Tarjan used DFS to find strongly connected components, bridges, and articulation points — all in linear time!",
            'dijkstra': "Edsger Dijkstra came up with his algorithm in about 20 minutes while having coffee at a café in Amsterdam in 1956. He later said: 'I designed it without pencil and paper. The reason is that you design things much better without pencil and paper.'",
            'dp_table': "The term 'Dynamic Programming' was coined by Richard Bellman in the 1950s. He chose the word 'dynamic' because it sounded impressive and was hard to argue against — it was partly a political move to get funding!",
            'stack_ops': "Every time you call a function, your computer uses a stack (the call stack) to remember where to return. Stack overflow errors happen when this stack gets too deep — that's also where the website got its name!",
            'queue_ops': "Message queues like RabbitMQ and Kafka process billions of messages daily using the same FIFO principle. Your simple queue visualization represents the foundation of distributed systems!",
            'hash_map': "Hash maps power nearly everything on the internet. From database indexes to browser caches to Python dictionaries — the average O(1) lookup time makes them indispensable.",
            'linked_list': "Linked lists were invented in 1955-1956 at RAND Corporation by Allen Newell, Cliff Shaw, and Herbert A. Simon for their Information Processing Language. Fun fact: they later won a Turing Award!",
            'heap': "The heap data structure was invented by J. W. J. Williams in 1964 specifically for the heapsort algorithm. Today, heaps power everything from task schedulers to Huffman coding compression.",
            'tree_traversal': "A binary tree with n nodes has exactly n+1 null pointers. This seemingly useless fact is actually used in threaded binary trees to improve traversal efficiency!",
            'set_operations': "Set theory was developed by Georg Cantor in the 1870s. He showed that some infinities are bigger than others — the set of real numbers is 'more infinite' than the set of integers. Mind-blowing!",
            'recursion': "To understand recursion, you must first understand recursion. — Anonymous CS Professor. The mathematical foundation of recursion goes back to the 1930s with Alonzo Church's lambda calculus and Kurt Gödel's recursive functions.",
        }
        return facts.get(algo_id, "Every line of code you study makes you a better programmer. Keep exploring! 🧠")

    async def explain_with_ai(
        self,
        code: str,
        execution_steps: Optional[List[Dict]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Enhanced explanation using free AI APIs.
        Falls back to rule-based if AI is unavailable.

        Tries in order:
        1. Groq (free tier: 14,400 requests/day with llama models)
        2. HuggingFace Inference API (free tier)
        3. Rule-based fallback
        """
        if not HAS_HTTPX:
            return None

        # Try Groq first (better quality, generous free tier)
        if self.groq_key:
            result = await self._try_groq(code)
            if result:
                return result

        # Try HuggingFace
        if self.hf_key:
            result = await self._try_huggingface(code)
            if result:
                return result

        return None

    async def _try_groq(self, code: str) -> Optional[Dict[str, Any]]:
        """Try Groq's free API for explanation generation."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {self.groq_key}',
                        'Content-Type': 'application/json',
                    },
                    json={
                        'model': 'llama-3.3-70b-versatile',
                        'messages': [
                            {
                                'role': 'system',
                                'content': (
                                    'You are a CS tutor explaining code to learners. '
                                    'Be clear, fun, and use analogies. '
                                    'Respond in JSON with keys: overview, algorithm_name, '
                                    'time_complexity, space_complexity, key_concepts (array), '
                                    'fun_fact, tips (array).'
                                )
                            },
                            {
                                'role': 'user',
                                'content': f'Explain this Python code step by step:\n\n```python\n{code[:3000]}\n```'
                            }
                        ],
                        'temperature': 0.3,
                        'max_tokens': 1000,
                        'response_format': {'type': 'json_object'},
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    content = data['choices'][0]['message']['content']
                    return json.loads(content)
        except Exception:
            pass
        return None

    async def _try_huggingface(self, code: str) -> Optional[Dict[str, Any]]:
        """Try HuggingFace Inference API for explanation generation."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    'https://api-inference.huggingface.co/models/codellama/CodeLlama-7b-Instruct-hf',
                    headers={
                        'Authorization': f'Bearer {self.hf_key}',
                        'Content-Type': 'application/json',
                    },
                    json={
                        'inputs': (
                            f'Explain this Python algorithm step by step, '
                            f'including time complexity and key concepts:\n\n'
                            f'```python\n{code[:2000]}\n```'
                        ),
                        'parameters': {
                            'max_new_tokens': 500,
                            'temperature': 0.3,
                        }
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and data:
                        text = data[0].get('generated_text', '')
                        return {'ai_explanation': text}
        except Exception:
            pass
        return None
