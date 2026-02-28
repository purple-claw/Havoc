// AnimatedHeap — store-driven dual-view heap visualization
// Shows array representation + tree view, rebuilds from step variables

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const flashSwap = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(255,82,82,0.5); }
  50%  { box-shadow: 0 0 12px 4px rgba(255,82,82,0.3); }
  100% { box-shadow: 0 0 0 0 rgba(255,82,82,0); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  gap: 1.5rem;
  user-select: none;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const SectionTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-tertiary, #666);
`;

/* Array view */
const ArrayRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
`;

type CellStatus = 'idle' | 'swapping' | 'highlight' | 'creating' | 'popping';

const statusBg: Record<CellStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  swapping: 'rgba(255,82,82,0.2)',
  highlight: 'rgba(24,255,255,0.15)',
  creating: 'rgba(0,230,118,0.2)',
  popping: 'rgba(255,215,64,0.2)',
};
const statusBorder: Record<CellStatus, string> = {
  idle: 'rgba(255,255,255,0.08)',
  swapping: 'rgba(255,82,82,0.45)',
  highlight: 'rgba(24,255,255,0.4)',
  creating: 'rgba(0,230,118,0.45)',
  popping: 'rgba(255,215,64,0.4)',
};

const Cell = styled(animated.div)<{ $status: CellStatus }>`
  width: 48px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  background: ${p => statusBg[p.$status]};
  border: 1px solid ${p => statusBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'swapping' && css`animation: ${flashSwap} 0.5s ease-out;`}
`;

const IdxLabel = styled.div`
  font-size: 9px;
  color: var(--text-tertiary, #555);
  font-family: var(--font-mono, monospace);
`;

/* Tree view */
const NODE_R = 20;
const LEVEL_H = 60;

function heapTreeLayout(arr: any[]): Array<{value: string; x: number; y: number; status: CellStatus}> {
  if (arr.length === 0) return [];
  const width = 500;
  const nodes = arr.map((v, i) => ({
    value: typeof v === 'object' ? JSON.stringify(v) : String(v),
    x: 0, y: 0,
    status: 'idle' as CellStatus,
  }));
  const levels: number[][] = [];
  const queue: Array<[number, number]> = [[0, 0]];
  while (queue.length > 0) {
    const [idx, lev] = queue.shift()!;
    if (!levels[lev]) levels[lev] = [];
    levels[lev].push(idx);
    const l = 2 * idx + 1, r = 2 * idx + 2;
    if (l < arr.length) queue.push([l, lev + 1]);
    if (r < arr.length) queue.push([r, lev + 1]);
  }
  for (let lev = 0; lev < levels.length; lev++) {
    const count = levels[lev].length;
    const spacing = width / (count + 1);
    levels[lev].forEach((idx, pos) => {
      nodes[idx].x = spacing * (pos + 1);
      nodes[idx].y = 35 + lev * LEVEL_H;
    });
  }
  return nodes;
}

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const ActionLabel = styled.div`
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
`;

const EmptyMsg = styled.div`
  color: var(--text-tertiary, #555);
  font-style: italic;
  padding: 3rem;
  font-size: 13px;
`;

interface HeapCellState { value: string; status: CellStatus; }

const AnimatedHeap: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [cells, setCells] = useState<HeapCellState[]>([]);
  const [actionText, setActionText] = useState('');

  const findHeapVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['heap', 'pq', 'priority', 'heapq', 'min_heap', 'max_heap', 'h'];
    for (const n of [...hints, ...names]) {
      if (Array.isArray(vars[n])) return vars[n];
    }
    for (const v of Object.values(vars)) {
      if (Array.isArray(v)) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setCells([]); setActionText(''); }
      return;
    }

    const arr = findHeapVar(currentStep.variables);
    if (!arr) return;

    const newCells: HeapCellState[] = arr.map((v: any) => ({
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      status: 'idle' as CellStatus,
    }));

    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const indices: number[] = (cmd as any).indices ?? [];

      if (t === 'SWAP') {
        for (const i of indices) { if (newCells[i]) newCells[i].status = 'swapping'; }
        action = `swap [${indices.join(', ')}]`;
      } else if (t === 'CREATE' || t === 'PUSH') {
        if (newCells.length > 0) newCells[newCells.length - 1].status = 'creating';
        action = `push(${cmd.values?.value ?? ''})`;
      } else if (t === 'POP' || t === 'DELETE') {
        action = `pop() -> ${cmd.values?.value ?? ''}`;
      } else if (t === 'HIGHLIGHT') {
        for (const i of indices) { if (newCells[i]) newCells[i].status = 'highlight'; }
      }
    }

    setCells(newCells);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findHeapVar, debugState]);

  // Tree view data
  const treeNodes = useMemo(() => {
    const arr = cells.map(c => c.value);
    const layout = heapTreeLayout(arr);
    // Copy statuses
    cells.forEach((c, i) => { if (layout[i]) layout[i].status = c.status; });
    return layout;
  }, [cells]);

  const svgH = useMemo(() => {
    if (treeNodes.length === 0) return 100;
    return Math.max(100, Math.max(...treeNodes.map(n => n.y)) + 50);
  }, [treeNodes]);

  // Array springs
  const springs = useSprings(
    cells.length,
    cells.map(() => ({
      opacity: 1, transform: 'scale(1)',
      config: { tension: 220, friction: 23 },
      from: { opacity: 0.5, transform: 'scale(0.8)' },
    }))
  );

  if (cells.length === 0) {
    return <Wrapper><EmptyMsg>Empty Heap</EmptyMsg></Wrapper>;
  }

  return (
    <Wrapper>
      {/* Tree View */}
      <Section>
        <SectionTitle>Tree View</SectionTitle>
        <svg width="100%" viewBox={`0 0 500 ${svgH}`} style={{ maxWidth: 600 }}>
          {/* Edges */}
          {treeNodes.map((node, i) => {
            const children = [2 * i + 1, 2 * i + 2].filter(c => c < treeNodes.length);
            return children.map(ci => {
              const child = treeNodes[ci];
              if (!child) return null;
              const active = node.status !== 'idle' || child.status !== 'idle';
              return (
                <line key={`${i}-${ci}`}
                  x1={node.x} y1={node.y} x2={child.x} y2={child.y}
                  stroke={active ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={active ? 2 : 1.5}
                  style={{ transition: 'stroke 0.3s' }}
                />
              );
            });
          })}
          {/* Nodes */}
          {treeNodes.map((node, i) => (
            <g key={i}>
              <circle cx={node.x} cy={node.y} r={NODE_R}
                fill={statusBg[node.status]} stroke={statusBorder[node.status]}
                strokeWidth={1.5} style={{ transition: 'fill 0.3s, stroke 0.3s' }}
              />
              <text x={node.x} y={node.y + 4} textAnchor="middle"
                fill="#e0e0e0" fontSize={12} fontWeight={700}
                fontFamily="var(--font-mono, monospace)"
              >{node.value}</text>
            </g>
          ))}
        </svg>
      </Section>

      {/* Array View */}
      <Section>
        <SectionTitle>Array View</SectionTitle>
        <ArrayRow>
          {springs.map((style, i) => {
            const cell = cells[i];
            if (!cell) return null;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Cell style={style} $status={cell.status}>{cell.value}</Cell>
                <IdxLabel>{i}</IdxLabel>
              </div>
            );
          })}
        </ArrayRow>
      </Section>

      <InfoLabel>Heap ({cells.length} elements)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Wrapper>
  );
};

export default AnimatedHeap;
