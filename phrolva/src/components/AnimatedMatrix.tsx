// AnimatedMatrix — 2D grid/table visualization with heatmap coloring
// Cells fill as values change, cursor highlights active position, row sweeps for DP

import React, { useState, useEffect, useMemo } from 'react';
import { useSpring, animated, useSprings } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  overflow: auto;
`;

const GridWrapper = styled.div`
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

const Row = styled.div`
  display: flex;
`;

const CellBase = styled(animated.div)<{
  $isHighlighted?: boolean;
  $isActive?: boolean;
  $bgColor?: string;
}>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: ${({ $isActive }) => ($isActive ? 'bold' : 'normal')};
  color: ${({ $isHighlighted }) => ($isHighlighted ? '#fff' : '#ccc')};
  background: ${({ $bgColor }) => $bgColor || '#1a1a2e'};
  border: 1px solid ${({ $isHighlighted }) => ($isHighlighted ? '#00d4ff' : '#2a2a4e')};
  transition: border-color 0.2s;
  position: relative;
  user-select: none;

  ${({ $isActive }) =>
    $isActive &&
    `
    box-shadow: inset 0 0 12px rgba(0, 212, 255, 0.3);
    z-index: 2;
  `}
`;

const RowLabel = styled.div`
  width: 32px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #666;
`;

const ColLabels = styled.div`
  display: flex;
  margin-left: 32px;
`;

const ColLabel = styled.div`
  width: 48px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #666;
`;

const InfoBar = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: #888;
`;

// Color interpolation for heatmap
function heatmapColor(value: number, min: number, max: number): string {
  if (max === min) return '#1a1a2e';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Dark blue → purple → red → yellow
  const colors = [
    [26, 26, 46],   // #1a1a2e
    [15, 52, 96],   // #0f3460
    [102, 126, 234], // #667eea
    [233, 69, 96],  // #e94560
    [250, 200, 60], // #fac83c
  ];

  const segment = t * (colors.length - 1);
  const i = Math.floor(segment);
  const f = segment - i;
  const c1 = colors[Math.min(i, colors.length - 1)];
  const c2 = colors[Math.min(i + 1, colors.length - 1)];

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * f);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * f);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * f);

  return `rgb(${r}, ${g}, ${b})`;
}

interface CellState {
  value: any;
  isHighlighted: boolean;
  isActive: boolean;
  wasModified: boolean;
}

interface AnimatedMatrixProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedMatrix: React.FC<AnimatedMatrixProps> = ({ commands, currentFrame, speed }) => {
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [modifications, setModifications] = useState(0);

  // Build matrix state from commands
  useEffect(() => {
    let matrix: any[][] = [];
    let rows = 0;
    let cols = 0;
    const highlighted = new Set<string>();
    let active: [number, number] | null = null;
    let modCount = 0;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const meta = cmd.metadata || {};

      if (cmdType === 'CREATE') {
        // Initialize matrix dimensions
        const initData = cmd.value;
        if (Array.isArray(initData) && Array.isArray(initData[0])) {
          matrix = initData.map((row: any[]) => [...row]);
          rows = matrix.length;
          cols = matrix[0]?.length || 0;
        } else if (meta.rows && meta.cols) {
          rows = meta.rows;
          cols = meta.cols;
          matrix = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => 0)
          );
        }
      } else if (cmdType === 'SET_VALUE' || cmdType === 'HIGHLIGHT') {
        const row = meta.row ?? (typeof cmd.target === 'number' ? cmd.target : undefined);
        const col = meta.col ?? meta.column;

        if (row !== undefined && col !== undefined) {
          // Ensure matrix is large enough
          while (matrix.length <= row) matrix.push([]);
          while (matrix[row].length <= col) matrix[row].push(0);

          if (cmdType === 'SET_VALUE') {
            matrix[row][col] = cmd.value;
            modCount++;
          }

          highlighted.clear();
          highlighted.add(`${row},${col}`);
          active = [row, col];
        }
      } else if (cmdType === 'VISIT' || cmdType === 'COLOR_CHANGE') {
        const row = meta.row;
        const col = meta.col ?? meta.column;
        if (row !== undefined && col !== undefined) {
          highlighted.add(`${row},${col}`);
          active = [row, col];
        }
      } else if (cmdType === 'UNMARK' || cmdType === 'CLEAR') {
        highlighted.clear();
        active = null;
      }
    }

    // Update rows/cols from matrix
    rows = matrix.length;
    cols = Math.max(...matrix.map((r) => r.length), 0);

    // Compute value range for heatmap
    let min = Infinity;
    let max = -Infinity;
    matrix.forEach((row) =>
      row.forEach((v) => {
        const num = Number(v);
        if (!isNaN(num)) {
          min = Math.min(min, num);
          max = Math.max(max, num);
        }
      })
    );
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 1;

    // Build cell states
    const cellGrid: CellState[][] = matrix.map((row, ri) =>
      row.map((val, ci) => ({
        value: val,
        isHighlighted: highlighted.has(`${ri},${ci}`),
        isActive: active?.[0] === ri && active?.[1] === ci,
        wasModified: false,
      }))
    );

    setGrid(cellGrid);
    setActiveCell(active);
    setModifications(modCount);
  }, [commands, currentFrame]);

  // Compute value range for heatmap coloring
  const [minVal, maxVal] = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    grid.forEach((row) =>
      row.forEach((cell) => {
        const num = Number(cell.value);
        if (!isNaN(num)) {
          min = Math.min(min, num);
          max = Math.max(max, num);
        }
      })
    );
    return [isFinite(min) ? min : 0, isFinite(max) ? max : 1];
  }, [grid]);

  if (grid.length === 0) {
    return (
      <Container>
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          Matrix visualization will appear here
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Column headers */}
      <ColLabels>
        {grid[0]?.map((_, ci) => (
          <ColLabel key={ci}>{ci}</ColLabel>
        ))}
      </ColLabels>

      <GridWrapper>
        {grid.map((row, ri) => (
          <Row key={ri}>
            <RowLabel>{ri}</RowLabel>
            {row.map((cell, ci) => {
              const numVal = Number(cell.value);
              const bgColor = !isNaN(numVal)
                ? heatmapColor(numVal, minVal, maxVal)
                : '#1a1a2e';

              return (
                <CellBase
                  key={`${ri}-${ci}`}
                  $isHighlighted={cell.isHighlighted}
                  $isActive={cell.isActive}
                  $bgColor={bgColor}
                >
                  {cell.value !== 0 ? cell.value : ''}
                </CellBase>
              );
            })}
          </Row>
        ))}
      </GridWrapper>

      <InfoBar>
        <span>
          {grid.length}×{grid[0]?.length || 0} matrix
        </span>
        <span>{modifications} modifications</span>
        {activeCell && (
          <span style={{ color: '#00d4ff' }}>
            Active: [{activeCell[0]}, {activeCell[1]}]
          </span>
        )}
      </InfoBar>
    </Container>
  );
};

export default AnimatedMatrix;
