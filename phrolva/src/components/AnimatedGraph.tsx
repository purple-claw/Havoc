// AnimatedGraph — store-driven SVG graph visualization (no D3 dependency)
// Rebuilds graph from adjacency dict/list in step variables
// Applies VISIT/TRAVERSE/MARK effects from commands

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const pulseNode = keyframes`
  0%   { filter: drop-shadow(0 0 0 rgba(0,230,118,0)); }
  50%  { filter: drop-shadow(0 0 10px rgba(0,230,118,0.4)); }
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
  padding: 3rem;
  font-size: 13px;
`;

type NodeStatus = 'idle' | 'visited' | 'frontier' | 'highlight';
type EdgeStatus = 'idle' | 'traversed' | 'highlight';

interface GNode { id: string; x: number; y: number; status: NodeStatus; label?: string; }
interface GEdge { from: string; to: string; status: EdgeStatus; }

const NODE_R = 24;

// Simple force-free circular layout
function layoutGraph(
  adjMap: Record<string, string[]>
): { nodes: GNode[]; edges: GEdge[] } {
  const nodeIds = Object.keys(adjMap);
  // Also add targets not in keys
  const allIds = new Set(nodeIds);
  for (const targets of Object.values(adjMap)) {
    for (const t of targets) allIds.add(String(t));
  }
  const ids = Array.from(allIds);
  const n = ids.length;
  if (n === 0) return { nodes: [], edges: [] };

  const cx = 250, cy = 200, r = Math.min(160, 40 + n * 18);
  const nodes: GNode[] = ids.map((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      id,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      status: 'idle' as NodeStatus,
    };
  });

  const edges: GEdge[] = [];
  const edgeSet = new Set<string>();
  for (const [from, targets] of Object.entries(adjMap)) {
    for (const to of targets) {
      const key = `${from}->${to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: String(from), to: String(to), status: 'idle' });
      }
    }
  }

  return { nodes, edges };
}

const nodeStatusFills: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.25)',
  visited: 'rgba(0,230,118,0.35)',
  frontier: 'rgba(255,215,64,0.3)',
  highlight: 'rgba(24,255,255,0.3)',
};
const nodeStatusStrokes: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.5)',
  visited: 'rgba(0,230,118,0.7)',
  frontier: 'rgba(255,215,64,0.6)',
  highlight: 'rgba(24,255,255,0.6)',
};

const edgeStatusColors: Record<EdgeStatus, string> = {
  idle: 'rgba(255,255,255,0.1)',
  traversed: 'rgba(0,230,118,0.5)',
  highlight: 'rgba(24,255,255,0.5)',
};

export const AnimatedGraph: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [graphNodes, setGraphNodes] = useState<GNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GEdge[]>([]);
  const [actionText, setActionText] = useState('');
  // Track cumulative visited/traversed across steps
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [traversedEdges, setTraversedEdges] = useState<Set<string>>(new Set());

  const findGraphVar = useCallback((vars: Record<string, any>): Record<string, any[]> | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.dicts ?? [])];
    const names = ['graph', 'adj', 'adj_list', 'adjacency', 'edges', 'neighbors', 'g'];

    for (const n of [...hints, ...names]) {
      const v = vars[n];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        // Check if it looks like adjacency list (values are arrays)
        const vals = Object.values(v);
        if (vals.length > 0 && vals.every(x => Array.isArray(x))) {
          return v as Record<string, any[]>;
        }
      }
    }
    // Fallback: any dict where all values are arrays
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith('__')) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const vals = Object.values(v);
        if (vals.length > 0 && vals.every((x: any) => Array.isArray(x))) {
          return v as Record<string, any[]>;
        }
      }
    }
    return null;
  }, [vizData]);

  // Reset cumulative state when starting over
  useEffect(() => {
    if (currentStepIndex <= 0) {
      setVisitedIds(new Set());
      setTraversedEdges(new Set());
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') {
        setGraphNodes([]); setGraphEdges([]); setActionText('');
        setVisitedIds(new Set()); setTraversedEdges(new Set());
      }
      return;
    }

    const adjMap = findGraphVar(currentStep.variables);
    if (!adjMap) { setGraphNodes([]); setGraphEdges([]); return; }

    // Convert all values to string arrays
    const normalized: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(adjMap)) {
      normalized[String(k)] = (v || []).map(String);
    }

    const { nodes, edges } = layoutGraph(normalized);

    // Apply cumulative visited + traversed state
    const newVisited = new Set(visitedIds);
    const newTraversed = new Set(traversedEdges);

    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const ids: string[] = (cmd as any).ids ?? [];
      const vals = cmd.values ?? {};

      if (t === 'VISIT') {
        for (const id of ids) newVisited.add(id);
        action = `visit(${ids.join(', ')})`;
      } else if (t === 'TRAVERSE') {
        for (const id of ids) {
          // id might be "A->B" or just individual
          newTraversed.add(id);
        }
        // Also check target_ids pairs
        if (ids.length >= 2) {
          newTraversed.add(`${ids[0]}->${ids[1]}`);
        }
        action = 'traverse';
      } else if (t === 'MARK') {
        for (const id of ids) {
          if (vals.status === 'frontier') {
            // Don't add to visited, just mark as frontier
          } else {
            newVisited.add(id);
          }
        }
        action = `mark(${ids.join(', ')})`;
      } else if (t === 'HIGHLIGHT') {
        for (const id of ids) newVisited.add(id);
        action = 'highlight';
      } else if (t === 'CLEAR') {
        newVisited.clear();
        newTraversed.clear();
        action = 'clear';
      }
    }

    // Apply statuses
    for (const node of nodes) {
      if (newVisited.has(node.id)) node.status = 'visited';
      // Check frontier from current commands
      for (const cmd of currentStepCommands) {
        const ids: string[] = (cmd as any).ids ?? [];
        if (typeof cmd.type === 'string' && cmd.type.toUpperCase() === 'MARK'
          && cmd.values?.status === 'frontier' && ids.includes(node.id)) {
          node.status = 'frontier';
        }
      }
      // Label from LABEL commands
      for (const cmd of currentStepCommands) {
        if (typeof cmd.type === 'string' && cmd.type.toUpperCase() === 'LABEL') {
          const ids: string[] = (cmd as any).ids ?? [];
          if (ids.includes(node.id) && cmd.values?.label) {
            node.label = String(cmd.values.label);
          }
        }
      }
    }
    for (const edge of edges) {
      const key = `${edge.from}->${edge.to}`;
      const revKey = `${edge.to}->${edge.from}`;
      if (newTraversed.has(key) || newTraversed.has(revKey)) {
        edge.status = 'traversed';
      }
    }

    setVisitedIds(newVisited);
    setTraversedEdges(newTraversed);
    setGraphNodes(nodes);
    setGraphEdges(edges);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findGraphVar, debugState]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GNode>();
    graphNodes.forEach(n => m.set(n.id, n));
    return m;
  }, [graphNodes]);

  if (graphNodes.length === 0) {
    return <Container><EmptyMsg>No graph data</EmptyMsg></Container>;
  }

  return (
    <Container>
      <svg width="100%" viewBox="0 0 500 400" style={{ maxWidth: 600 }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="28" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="rgba(255,255,255,0.2)" />
          </marker>
          <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="28" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="rgba(0,230,118,0.5)" />
          </marker>
        </defs>

        {/* Edges */}
        {graphEdges.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={edgeStatusColors[edge.status]}
              strokeWidth={edge.status !== 'idle' ? 2.5 : 1.5}
              markerEnd={edge.status !== 'idle' ? 'url(#arrow-active)' : 'url(#arrow)'}
              style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
            />
          );
        })}

        {/* Nodes */}
        {graphNodes.map(node => (
          <g key={node.id} style={{ transition: 'transform 0.3s' }}>
            <circle
              cx={node.x} cy={node.y} r={NODE_R}
              fill={nodeStatusFills[node.status]}
              stroke={nodeStatusStrokes[node.status]}
              strokeWidth={2}
              style={{ transition: 'fill 0.3s, stroke 0.3s' }}
            />
            <text
              x={node.x} y={node.y + 5}
              textAnchor="middle"
              fill="#e0e0e0"
              fontSize={14}
              fontWeight={700}
              fontFamily="var(--font-mono, monospace)"
            >
              {node.id}
            </text>
            {node.label && (
              <text
                x={node.x} y={node.y + NODE_R + 14}
                textAnchor="middle"
                fill="var(--accent-amber, #ffd740)"
                fontSize={10}
                fontWeight={600}
                fontFamily="var(--font-mono, monospace)"
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <InfoLabel>Graph ({graphNodes.length} nodes, {graphEdges.length} edges)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedGraph;
