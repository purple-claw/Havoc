// GalleryPage — Browse and run pre-built algorithm examples
// Fetches from /api/snippets and lets users open them in the playground

import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { api } from '../services/api';
import type { GallerySnippet } from '../types/animation.types';

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: white;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const Brand = styled.a`
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  cursor: pointer;
`;

const TopBarLinks = styled.div`
  display: flex;
  gap: 16px;
  font-size: 13px;
`;

const TopBarLink = styled.a`
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  cursor: pointer;
  &:hover { color: white; }
`;

const Content = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 32px;
  font-size: 15px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  padding: 6px 16px;
  border-radius: 100px;
  border: 1px solid ${({ $active }) => ($active ? '#667eea' : 'rgba(255,255,255,0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(102,126,234,0.15)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#667eea' : 'rgba(255,255,255,0.6)')};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    color: #667eea;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: rgba(102, 126, 234, 0.3);
    background: rgba(102, 126, 234, 0.04);
    transform: translateY(-2px);
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
`;

const CardDesc = styled.p`
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.5);
`;

const CardTags = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(240, 147, 251, 0.1);
  color: #f093fb;
`;

const CategoryTag = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(67, 233, 123, 0.1);
  color: #43e97b;
`;

const CodePreview = styled.pre`
  margin: 12px 0 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  overflow: hidden;
  max-height: 80px;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #444;
  font-size: 14px;
`;

const LoadingState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #555;
`;

// Fallback snippets when API is unreachable
const FALLBACK_SNIPPETS: GallerySnippet[] = [
  {
    id: 'bubble_sort',
    title: 'Bubble Sort',
    description: 'Classic comparison-based sorting algorithm',
    category: 'sorting',
    tags: ['O(n^2)', 'comparison', 'in-place'],
    code: 'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nresult = bubble_sort([64, 34, 25, 12, 22, 11, 90])\nprint(result)',
  },
  {
    id: 'binary_search',
    title: 'Binary Search',
    description: 'Efficient search in sorted arrays by halving the search space',
    category: 'searching',
    tags: ['O(log n)', 'divide-and-conquer'],
    code: 'def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\nresult = binary_search([1, 3, 5, 7, 9, 11, 13], 7)\nprint(result)',
  },
  {
    id: 'bfs',
    title: 'Breadth-First Search',
    description: 'Level-order graph traversal using a queue',
    category: 'graphs',
    tags: ['O(V+E)', 'queue', 'traversal'],
    code: 'from collections import deque\n\ndef bfs(graph, start):\n    visited = set()\n    queue = deque([start])\n    visited.add(start)\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph.get(node, []):\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\ngraph = {0: [1, 2], 1: [3], 2: [4], 3: [], 4: []}\nprint(bfs(graph, 0))',
  },
  {
    id: 'fibonacci_dp',
    title: 'Fibonacci (DP)',
    description: 'Dynamic programming approach to Fibonacci sequence',
    category: 'dynamic_programming',
    tags: ['O(n)', 'memoization', 'tabulation'],
    code: 'def fibonacci(n):\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    for i in range(2, n + 1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]\n\nresult = fibonacci(10)\nprint(result)',
  },
  {
    id: 'stack_ops',
    title: 'Stack Operations',
    description: 'Balanced parentheses checker using a stack',
    category: 'stacks',
    tags: ['O(n)', 'LIFO', 'matching'],
    code: 'def is_balanced(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping.values():\n            stack.append(char)\n        elif char in mapping:\n            if not stack or stack[-1] != mapping[char]:\n                return False\n            stack.pop()\n    return len(stack) == 0\n\nprint(is_balanced("{[()]}"))\nprint(is_balanced("{[(]}"))',
  },
  {
    id: 'quick_sort',
    title: 'Quick Sort',
    description: 'Divide-and-conquer sorting with pivot partitioning',
    category: 'sorting',
    tags: ['O(n log n)', 'divide-and-conquer', 'in-place'],
    code: 'def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + middle + quick_sort(right)\n\nresult = quick_sort([3, 6, 8, 10, 1, 2, 1])\nprint(result)',
  },
];

interface GalleryPageProps {
  onNavigate: (path: string) => void;
  onOpenCode: (code: string) => void;
}

const GalleryPage: React.FC<GalleryPageProps> = ({ onNavigate, onOpenCode }) => {
  const [snippets, setSnippets] = useState<GallerySnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadSnippets = async () => {
      try {
        const data = await api.getGallery();
        setSnippets(data && data.length > 0 ? data : FALLBACK_SNIPPETS);
      } catch {
        setSnippets(FALLBACK_SNIPPETS);
      } finally {
        setLoading(false);
      }
    };
    loadSnippets();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(snippets.map((s) => s.category));
    return ['all', ...Array.from(cats).sort()];
  }, [snippets]);

  const filtered = useMemo(
    () =>
      selectedCategory === 'all'
        ? snippets
        : snippets.filter((s) => s.category === selectedCategory),
    [snippets, selectedCategory],
  );

  const handleOpen = (snippet: GallerySnippet) => {
    onOpenCode(snippet.code);
    onNavigate('/playground');
  };

  return (
    <Page>
      <TopBar>
        <Brand onClick={() => onNavigate('/')}>HAVOC</Brand>
        <TopBarLinks>
          <TopBarLink onClick={() => onNavigate('/playground')}>Playground</TopBarLink>
          <TopBarLink onClick={() => onNavigate('/')}>Home</TopBarLink>
        </TopBarLinks>
      </TopBar>

      <Content>
        <Title>Algorithm Gallery</Title>
        <Subtitle>Browse pre-built examples, click to open in the playground.</Subtitle>

        <FilterBar>
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              $active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.replace(/_/g, ' ')}
            </FilterChip>
          ))}
        </FilterBar>

        <Grid>
          {loading && <LoadingState>Loading examples...</LoadingState>}
          {!loading && filtered.length === 0 && (
            <EmptyState>No examples in this category yet.</EmptyState>
          )}
          {!loading &&
            filtered.map((s) => (
              <Card key={s.id} onClick={() => handleOpen(s)}>
                <CardTitle>{s.title}</CardTitle>
                <CardDesc>{s.description}</CardDesc>
                <CardTags>
                  <CategoryTag>{s.category.replace(/_/g, ' ')}</CategoryTag>
                  {s.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </CardTags>
                {(s.code_preview || s.code) && (
                  <CodePreview>
                    {(s.code_preview || s.code).slice(0, 200)}
                    {(s.code_preview || s.code).length > 200 ? '...' : ''}
                  </CodePreview>
                )}
              </Card>
            ))}
        </Grid>
      </Content>
    </Page>
  );
};

export default GalleryPage;
