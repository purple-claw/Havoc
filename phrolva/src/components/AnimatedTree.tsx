// AnimatedTree — store-driven tree visualization with SVG layout
// Rebuilds tree from step variables, applies VISIT/TRAVERSE/CREATE effects

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const pulseVisit = keyframes`
  0%   { filter: drop-shadow(0 0 0 rgba(0,230,118,0)); }
  50%  { filter: drop-shadow(0 0 8px rgba(0,230,118,0.5)); }
  100% { filter: drop-shadow(0 0 0 rgba(0,230,118,0)); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
  user-select: none;
  overflow: auto;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 8px;
`;

const ActionLabel = styled.div`
  margin-top: 4px;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
`;

const EmptyMsg = styled.div`
  color: var(--text-tertiary, #555);
  font-style: italic;
  font-size: 13px;
  padding: 3rem;
`;

type NodeStatus = 'idle' | 'visited' | 'highlight' | 'creating';

interface TreeNode {
  value: string;
  x: number;
  y: number;
  status: NodeStatus;
  children: number[]; // indices into flat array
  parentIdx: number;
}

const NODE_R = 22;
const LEVEL_H = 70;

// Build tree layout from an array (heap-style: children of i at 2i+1, 2i+2)
function layoutFromArray(arr: any[]): TreeNode[] {
  if (arr.length === 0) return [];
  const nodes: TreeNode[] = arr.map((v, i) => ({
    value: typeof v === 'object' ? JSON.stringify(v) : String(v),
    x: 0, y: 0,
    status: 'idle' as NodeStatus,
    children: [],
    parentIdx: i === 0 ? -1 : Math.floor((i - 1) / 2),
  }));
  // Set children
  for (let i = 0; i < nodes.length; i++) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < nodes.length) nodes[i].children.push(l);
    if (r < nodes.length) nodes[i].children.push(r);
  }
  // Layout positions using BFS
  const width = 600;
  // Calculate x positions by level
  const levels: number[][] = [];
  const queue: Array<[number, number]> = [[0, 0]]; // [nodeIdx, level]
  while (queue.length > 0) {
    const [idx, lev] = queue.shift()!;
    if (!levels[lev]) levels[lev] = [];
    levels[lev].push(idx);
    for (const c of nodes[idx].children) {
      queue.push([c, lev + 1]);
    }
  }
  for (let lev = 0; lev < levels.length; lev++) {
    const count = levels[lev].length;
    const spacing = width / (count + 1);
    levels[lev].forEach((idx, pos) => {
      nodes[idx].x = spacing * (pos + 1);
      nodes[idx].y = 40 + lev * LEVEL_H;
    });
  }
  return nodes;
}

const statusFills: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.3)',
  visited: 'rgba(0,230,118,0.35)',
  highlight: 'rgba(24,255,255,0.3)',
  creating: 'rgba(0,230,118,0.4)',
};
const statusStrokes: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.5)',
  visited: 'rgba(0,230,118,0.7)',
  highlight: 'rgba(24,255,255,0.6)',
  creating: 'rgba(0,230,118,0.8)',
};

const AnimatedTree: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [actionText, setActionText] = useState('');

  const findTreeVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['tree', 'heap', 'bst', 'root', 'nodes', 'arr', 'array'];
    for (const n of [...hints, ...names]) {
      if (Array.isArray(vars[n])) return vars[n];
    }
    for (const v of Object.values(vars)) {
      if (Array.isArray(v) && v.length > 0) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setTreeNodes([]); setActionText(''); }
      return;
    }

    const arr = findTreeVar(currentStep.variables);
    if (!arr || arr.length === 0) { setTreeNodes([]); return; }

    const nodes = layoutFromArray(arr);

    // Apply command visual effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const indices: number[] = (cmd as any).indices ?? [];

      if (t === 'VISIT' || t === 'TRAVERSE') {
        for (const i of indices) { if (nodes[i]) nodes[i].status = 'visited'; }
        action = t === 'VISIT' ? 'visit node' : 'traverse';
      } else if (t === 'CREATE') {
        action = `insert(${cmd.values?.value ?? ''})`;
        if (nodes.length > 0) nodes[nodes.length - 1].status = 'creating';
      } else if (t === 'HIGHLIGHT') {
        for (const i of indices) { if (nodes[i]) nodes[i].status = 'highlight'; }
      } else if (t === 'SWAP') {
        for (const i of indices) { if (nodes[i]) nodes[i].status = 'highlight'; }
        action = 'swap';
      } else if (t === 'DELETE') {
        action = `delete(${cmd.values?.value ?? ''})`;
      }
    }

    setTreeNodes(nodes);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findTreeVar, debugState]);

  const svgH = useMemo(() => {
    if (treeNodes.length === 0) return 200;
    return Math.max(200, Math.max(...treeNodes.map(n => n.y)) + 60);
  }, [treeNodes]);

  return (
    <Container ref={containerRef}>
      {treeNodes.length > 0 ? (
        <svg width="100%" viewBox={`0 0 600 ${svgH}`} style={{ maxWidth: 700 }}>
          {/* Edges */}
          {treeNodes.map((node, i) =>
            node.children.map(ci => {
              const child = treeNodes[ci];
              if (!child) return null;
              const traversed = child.status === 'visited' || child.status === 'highlight';
              return (
                <line key={`${i}-${ci}`}
                  x1={node.x} y1={node.y}
                  x2={child.x} y2={child.y}
                  stroke={traversed ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={traversed ? 2.5 : 1.5}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                />
              );
            })
          )}
          {/* Nodes */}
          {treeNodes.map((node, i) => (
            <g key={i} style={{ transition: 'transform 0.35s ease' }}>
              <circle
                cx={node.x} cy={node.y} r={NODE_R}
                fill={statusFills[node.status]}
                stroke={statusStrokes[node.status]}
                strokeWidth={2}
                style={{ transition: 'fill 0.3s, stroke 0.3s' }}
              />
              <text
                x={node.x} y={node.y + 5}
                textAnchor="middle"
                fill="#e0e0e0"
                fontSize={13}
                fontWeight={700}
                fontFamily="var(--font-mono, monospace)"
              >
                {node.value}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <EmptyMsg>Empty Tree</EmptyMsg>
      )}
      <InfoLabel>Tree ({treeNodes.length} nodes)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedTree;
