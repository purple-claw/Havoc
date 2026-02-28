// AnimatedHeap — dual view: tree + array representation
// Shows heap operations (sift up/down) on both views simultaneously

import React, { useState, useEffect, useRef } from 'react';
import { animated } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.5rem;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 4px;
  background: #1a1a2e;
  border-radius: 8px;
  padding: 3px;
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? '#667eea' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#888')};
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #fff;
  }
`;

// Array view
const ArrayView = styled.div`
  display: flex;
  gap: 4px;
  align-items: flex-end;
  min-height: 80px;
`;

const ArrayCell = styled.div<{ $isHighlighted?: boolean; $isSwapping?: boolean; $color?: string }>`
  min-width: 48px;
  padding: 0.5rem 0.4rem;
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
  color: white;
  border-radius: 6px;
  background: ${({ $color }) => $color || '#667eea'};
  border: 2px solid ${({ $isHighlighted, $isSwapping }) =>
    $isSwapping ? '#fa709a' : $isHighlighted ? '#00d4ff' : 'transparent'};
  box-shadow: ${({ $isHighlighted }) =>
    $isHighlighted ? '0 0 12px rgba(0, 212, 255, 0.4)' : 'none'};
  transition: all 0.3s ease;
`;

const IndexLabel = styled.div`
  font-size: 0.65rem;
  color: #666;
  text-align: center;
  margin-top: 2px;
`;

// Tree view
const TreeSVG = styled.svg`
  width: 100%;
  max-width: 600px;
  height: 300px;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: #888;
  letter-spacing: 1px;
`;

const NODE_R = 20;
const LEVEL_H = 60;

function heapTreePositions(n: number, width: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, level) - 1);
    const nodesInLevel = Math.pow(2, level);
    const levelWidth = width / (nodesInLevel + 1);
    positions.push({
      x: levelWidth * (posInLevel + 1),
      y: 30 + level * LEVEL_H,
    });
  }
  return positions;
}

interface AnimatedHeapProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedHeap: React.FC<AnimatedHeapProps> = ({ commands, currentFrame, speed }) => {
  const [heapArray, setHeapArray] = useState<any[]>([]);
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());
  const [swappingIndices, setSwappingIndices] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'dual' | 'tree' | 'array'>('dual');
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    let arr: any[] = [];
    const highlighted = new Set<number>();
    const swapping = new Set<number>();

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const meta = cmd.metadata || {};

      if (cmdType === 'CREATE') {
        arr = Array.isArray(cmd.value) ? [...cmd.value] : [];
      } else if (cmdType === 'PUSH' || cmdType === 'SET_VALUE') {
        if (meta.index !== undefined) {
          while (arr.length <= meta.index) arr.push(0);
          arr[meta.index] = cmd.value;
        } else {
          arr.push(cmd.value);
        }
        setLastAction(`insert(${cmd.value})`);
      } else if (cmdType === 'POP' || cmdType === 'DELETE') {
        if (arr.length > 0) {
          const removed = arr[0];
          arr[0] = arr[arr.length - 1];
          arr.pop();
          setLastAction(`extract() → ${removed}`);
        }
      } else if (cmdType === 'SWAP') {
        const idx1 = meta.index1 ?? (Array.isArray(cmd.target) ? cmd.target[0] : 0);
        const idx2 = meta.index2 ?? (Array.isArray(cmd.target) ? cmd.target[1] : 1);
        if (idx1 < arr.length && idx2 < arr.length) {
          [arr[idx1], arr[idx2]] = [arr[idx2], arr[idx1]];
          swapping.clear();
          swapping.add(idx1);
          swapping.add(idx2);
        }
      } else if (cmdType === 'HIGHLIGHT' || cmdType === 'COMPARE' || cmdType === 'VISIT') {
        highlighted.clear();
        if (typeof cmd.target === 'number') highlighted.add(cmd.target);
        if (meta.index !== undefined) highlighted.add(meta.index);
        if (meta.index1 !== undefined) highlighted.add(meta.index1);
        if (meta.index2 !== undefined) highlighted.add(meta.index2);
      }
    }

    setHeapArray([...arr]);
    setHighlightedIndices(highlighted);
    setSwappingIndices(swapping);
  }, [commands, currentFrame]);

  const positions = heapTreePositions(heapArray.length, 580);

  const renderArrayView = () => (
    <ArrayView>
      {heapArray.map((val, i) => (
        <div key={i}>
          <ArrayCell
            $isHighlighted={highlightedIndices.has(i)}
            $isSwapping={swappingIndices.has(i)}
            $color={i === 0 ? '#e94560' : '#667eea'}
          >
            {val}
          </ArrayCell>
          <IndexLabel>{i}</IndexLabel>
        </div>
      ))}
      {heapArray.length === 0 && (
        <span style={{ color: '#666', fontStyle: 'italic' }}>Empty Heap</span>
      )}
    </ArrayView>
  );

  const renderTreeView = () => (
    <TreeSVG viewBox="0 0 600 300">
      <defs>
        <filter id="heapGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {heapArray.map((_, i) => {
        if (i === 0) return null;
        const parentIdx = Math.floor((i - 1) / 2);
        const from = positions[parentIdx];
        const to = positions[i];
        if (!from || !to) return null;
        return (
          <line
            key={`edge-${i}`}
            x1={from.x}
            y1={from.y + NODE_R}
            x2={to.x}
            y2={to.y - NODE_R}
            stroke={highlightedIndices.has(i) || highlightedIndices.has(parentIdx) ? '#667eea' : '#444'}
            strokeWidth={2}
          />
        );
      })}

      {/* Nodes */}
      {heapArray.map((val, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const isHi = highlightedIndices.has(i);
        const isSw = swappingIndices.has(i);

        return (
          <g key={`node-${i}`}>
            {isHi && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_R + 6}
                fill="none"
                stroke="#00d4ff"
                strokeWidth={2}
                opacity={0.5}
                filter="url(#heapGlow)"
              />
            )}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={i === 0 ? '#e94560' : isSw ? '#fa709a' : '#667eea'}
              stroke={isHi ? '#00d4ff' : '#333'}
              strokeWidth={isHi ? 2 : 1}
            />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              {val}
            </text>
            <text
              x={pos.x}
              y={pos.y + NODE_R + 12}
              textAnchor="middle"
              fill="#666"
              fontSize="9"
            >
              [{i}]
            </text>
          </g>
        );
      })}
    </TreeSVG>
  );

  return (
    <Container>
      <ViewToggle>
        <ViewButton $active={view === 'dual'} onClick={() => setView('dual')}>Dual</ViewButton>
        <ViewButton $active={view === 'tree'} onClick={() => setView('tree')}>Tree</ViewButton>
        <ViewButton $active={view === 'array'} onClick={() => setView('array')}>Array</ViewButton>
      </ViewToggle>

      {(view === 'dual' || view === 'tree') && renderTreeView()}
      {(view === 'dual' || view === 'array') && renderArrayView()}

      <Label>HEAP ({heapArray.length} elements) — Root: {heapArray[0] ?? '∅'}</Label>
      {lastAction && (
        <div style={{ color: '#e94560', fontSize: '0.85rem' }}>Last: {lastAction}</div>
      )}
    </Container>
  );
};

export default AnimatedHeap;
