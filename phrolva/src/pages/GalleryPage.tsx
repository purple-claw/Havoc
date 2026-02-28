import React, { useState, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { Home, Play, Search, LayoutGrid, Code2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import type { GallerySnippet } from '../types/animation.types';

/* ───── layout ───── */
const Page = styled.div`min-height:100vh;background:var(--bg-primary);`;

const Nav = styled.nav`
  display:flex;justify-content:space-between;align-items:center;
  padding:0 28px;height:52px;position:sticky;top:0;z-index:50;
  background:rgba(5,5,5,0.6);backdrop-filter:blur(20px) saturate(1.4);
  border-bottom:1px solid var(--glass-border);
`;
const LogoWrap = styled.div`display:flex;align-items:center;gap:10px;cursor:pointer;`;
const LogoIcon = styled.div`
  width:24px;height:24px;border-radius:6px;font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--accent-green),#009688);color:#000;
`;
const LogoText = styled.span`font-size:14px;font-weight:700;letter-spacing:.5px;`;
const NavLinks = styled.div`display:flex;gap:4px;`;
const NavBtn = styled.button`
  padding:6px 14px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;
  color:var(--text-secondary);display:inline-flex;align-items:center;gap:6px;
  transition:all var(--transition-fast);
  &:hover{color:var(--text-primary);background:var(--glass);}
`;

/* ── hero ── */
const Hero = styled.section`
  padding:52px 28px 36px;max-width:960px;margin:0 auto;text-align:center;
`;
const Title = styled.h1`font-size:clamp(24px,3.5vw,34px);font-weight:800;letter-spacing:-.02em;margin-bottom:6px;`;
const Sub = styled.p`font-size:14px;color:var(--text-secondary);margin-bottom:28px;`;

/* ── search + filters ── */
const SearchRow = styled.div`
  display:flex;gap:10px;max-width:520px;margin:0 auto 24px;
`;
const SearchInput = styled.div`
  flex:1;display:flex;align-items:center;gap:8px;
  padding:8px 14px;border-radius:var(--radius-md);
  background:var(--bg-card);border:1px solid var(--glass-border);
  transition:border-color var(--transition-fast);
  &:focus-within{border-color:rgba(0,230,118,0.25);}
  input{background:transparent;border:none;outline:none;flex:1;font-size:13px;color:var(--text-primary);&::placeholder{color:var(--text-tertiary);}}
`;

const FilterRow = styled.div`
  display:flex;gap:6px;flex-wrap:wrap;justify-content:center;
  max-width:960px;margin:0 auto 32px;padding:0 28px;
`;
const FilterChip = styled.button<{$active?:boolean}>`
  padding:5px 14px;border-radius:100px;font-size:11.5px;font-weight:600;
  border:1px solid ${p=>p.$active?'rgba(0,230,118,0.3)':'var(--glass-border)'};
  background:${p=>p.$active?'var(--accent-green-dim)':'transparent'};
  color:${p=>p.$active?'var(--accent-green)':'var(--text-secondary)'};
  transition:all var(--transition-fast);
  &:hover{border-color:rgba(0,230,118,0.25);color:var(--accent-green);}
`;

/* ── grid ── */
const Grid = styled.div`
  display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;
  max-width:960px;margin:0 auto;padding:0 28px 56px;
`;

/* ── card ── */
const Card = styled(motion.div)`
  background:var(--bg-card);border:1px solid var(--glass-border);
  border-radius:var(--radius-lg);padding:20px;cursor:pointer;
  transition:all var(--transition-base);position:relative;overflow:hidden;
  &:hover{background:var(--bg-card-hover);border-color:rgba(255,255,255,0.08);
    transform:translateY(-2px);box-shadow:var(--shadow-card);}
  &::after{content:'';position:absolute;top:0;right:0;left:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,230,118,0.12),transparent);opacity:0;
    transition:opacity var(--transition-base);}
  &:hover::after{opacity:1;}
`;
const CardTitle = styled.h3`font-size:14.5px;font-weight:700;margin-bottom:5px;`;
const CardDesc = styled.p`font-size:12.5px;line-height:1.55;color:var(--text-secondary);margin-bottom:10px;`;
const TagRow = styled.div`display:flex;gap:5px;flex-wrap:wrap;`;
const CatTag = styled.span`
  padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;
  background:var(--accent-green-dim);color:var(--accent-green);
`;
const Tag = styled.span`
  padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;
  background:var(--accent-red-dim);color:var(--accent-red);
`;
const CodeSnippet = styled.pre`
  margin:10px 0 0;padding:10px 12px;border-radius:var(--radius-sm);
  background:rgba(0,0,0,0.35);font-family:var(--font-mono);
  font-size:11px;line-height:1.6;color:var(--text-tertiary);
  max-height:72px;overflow:hidden;
`;
const OpenHint = styled.div`
  display:flex;align-items:center;gap:4px;margin-top:12px;
  font-size:11px;color:var(--accent-green);opacity:0;
  transition:opacity var(--transition-fast);
  ${Card}:hover &{opacity:1;}
`;

/* ── states ── */
const StateBox = styled.div`grid-column:1/-1;text-align:center;padding:56px 20px;color:var(--text-tertiary);font-size:13px;`;

/* ── fallback ── */
const FALLBACK:GallerySnippet[]=[
  {id:'bubble_sort',title:'Bubble Sort',description:'Classic comparison-based sorting algorithm',category:'sorting',tags:['O(n²)','comparison','in-place'],code:'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nresult = bubble_sort([64, 34, 25, 12, 22, 11, 90])\nprint(result)'},
  {id:'binary_search',title:'Binary Search',description:'Efficient search in sorted arrays by halving the search space',category:'searching',tags:['O(log n)','divide-and-conquer'],code:'def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1\n\nresult = binary_search([1, 3, 5, 7, 9, 11, 13], 7)\nprint(result)'},
  {id:'bfs',title:'Breadth-First Search',description:'Level-order graph traversal using a queue',category:'graphs',tags:['O(V+E)','queue','traversal'],code:'from collections import deque\n\ndef bfs(graph, start):\n    visited = set()\n    queue = deque([start])\n    visited.add(start)\n    order = []\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph.get(node, []):\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order\n\ngraph = {0: [1, 2], 1: [3], 2: [4], 3: [], 4: []}\nprint(bfs(graph, 0))'},
  {id:'fibonacci_dp',title:'Fibonacci (DP)',description:'Dynamic programming approach to Fibonacci sequence',category:'dynamic_programming',tags:['O(n)','memoization'],code:'def fibonacci(n):\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    for i in range(2, n + 1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]\n\nresult = fibonacci(10)\nprint(result)'},
  {id:'stack_ops',title:'Stack Operations',description:'Balanced parentheses checker using a stack',category:'stacks',tags:['O(n)','LIFO','matching'],code:'def is_balanced(s):\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping.values():\n            stack.append(char)\n        elif char in mapping:\n            if not stack or stack[-1] != mapping[char]:\n                return False\n            stack.pop()\n    return len(stack) == 0\n\nprint(is_balanced("{[()]}"))\nprint(is_balanced("{[(])}"))'},
  {id:'quick_sort',title:'Quick Sort',description:'Divide-and-conquer sorting with pivot partitioning',category:'sorting',tags:['O(n log n)','divide-and-conquer'],code:'def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + middle + quick_sort(right)\n\nresult = quick_sort([3, 6, 8, 10, 1, 2, 1])\nprint(result)'},
];

interface GalleryPageProps { onNavigate:(p:string)=>void; onOpenCode:(c:string)=>void; }

const GalleryPage:React.FC<GalleryPageProps> = ({ onNavigate, onOpenCode }) => {
  const [snippets, setSnippets] = useState<GallerySnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(()=>{
    (async()=>{
      try { const d=await api.getGallery(); setSnippets(d&&d.length?d:FALLBACK); }
      catch{ setSnippets(FALLBACK); }
      finally{ setLoading(false); }
    })();
  },[]);

  const cats = useMemo(()=>{
    const s=new Set(snippets.map(s=>s.category));
    return ['all',...Array.from(s).sort()];
  },[snippets]);

  const filtered = useMemo(()=>{
    let list = cat==='all'?snippets:snippets.filter(s=>s.category===cat);
    if(search.trim()){
      const q=search.toLowerCase();
      list=list.filter(s=>s.title.toLowerCase().includes(q)||s.description.toLowerCase().includes(q)||s.tags.some(t=>t.toLowerCase().includes(q)));
    }
    return list;
  },[snippets,cat,search]);

  const handleOpen = (s:GallerySnippet) => { onOpenCode(s.code); onNavigate('/playground'); };

  return (
    <Page>
      <Nav>
        <LogoWrap onClick={()=>onNavigate('/')}><LogoIcon>H</LogoIcon><LogoText>HAVOC</LogoText></LogoWrap>
        <NavLinks>
          <NavBtn onClick={()=>onNavigate('/')}><Home size={13}/>Home</NavBtn>
          <NavBtn onClick={()=>onNavigate('/playground')}><Play size={13}/>Playground</NavBtn>
        </NavLinks>
      </Nav>

      <Hero>
        <Title>Algorithm Gallery</Title>
        <Sub>Browse pre-built examples. Click any card to open it in the playground.</Sub>
        <SearchRow>
          <SearchInput>
            <Search size={14} style={{color:'var(--text-tertiary)',flexShrink:0}}/>
            <input placeholder="Search algorithms…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </SearchInput>
        </SearchRow>
      </Hero>

      <FilterRow>
        {cats.map(c=>(
          <FilterChip key={c} $active={cat===c} onClick={()=>setCat(c)}>
            {c.replace(/_/g,' ')}
          </FilterChip>
        ))}
      </FilterRow>

      <Grid>
        {loading && <StateBox>Loading examples…</StateBox>}
        {!loading && filtered.length===0 && <StateBox>No examples match your filter.</StateBox>}
        {!loading && filtered.map((s,i)=>(
          <Card key={s.id} onClick={()=>handleOpen(s)}
            initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{delay:i*0.04,duration:0.35}}>
            <CardTitle>{s.title}</CardTitle>
            <CardDesc>{s.description}</CardDesc>
            <TagRow>
              <CatTag>{s.category.replace(/_/g,' ')}</CatTag>
              {s.tags.map(t=><Tag key={t}>{t}</Tag>)}
            </TagRow>
            {(s.code_preview||s.code) && (
              <CodeSnippet>{(s.code_preview||s.code).slice(0,180)}{(s.code_preview||s.code).length>180?'…':''}</CodeSnippet>
            )}
            <OpenHint><Code2 size={11}/>Open in playground <ArrowRight size={10}/></OpenHint>
          </Card>
        ))}
      </Grid>
    </Page>
  );
};

export default GalleryPage;
