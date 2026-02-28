// AnimatedMatrix — store-driven 2D grid/matrix visualization
// Rebuilds matrix from step variables, applies SET_VALUE/HIGHLIGHT/MARK effects

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const cellPulse = keyframes`
  0%   { box-shadow: inset 0 0 0 0 rgba(0,230,118,0.4); }
  50%  { box-shadow: inset 0 0 8px 2px rgba(0,230,118,0.2); }
  100% { box-shadow: inset 0 0 0 0 rgba(0,230,118,0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  user-select: none;
  overflow: auto;
`;

const Grid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$cols}, 1fr);
  gap: 2px;
  padding: 6px;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
`;

type CellStatus = 'idle' | 'highlight' | 'changed' | 'marked';

const cellBg: Record<CellStatus, string> = {
  idle: 'rgba(255,255,255,0.04)',
  highlight: 'rgba(24,255,255,0.2)',
  changed: 'rgba(0,230,118,0.2)',
  marked: 'rgba(255,215,64,0.18)',
};
const cellBorder: Record<CellStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  highlight: 'rgba(24,255,255,0.4)',
  changed: 'rgba(0,230,118,0.4)',
  marked: 'rgba(255,215,64,0.35)',
};

const CellBox = styled.div<{ $status: CellStatus; $heat: number }>`
  min-width: 38px;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  border-radius: 4px;
  background: ${p => p.$status !== 'idle'
    ? cellBg[p.$status]
    : `rgba(${Math.round(15 + p.$heat * 200)}, ${Math.round(100 - p.$heat * 60)}, ${Math.round(200 - p.$heat * 150)}, 0.2)`
  };
  border: 1px solid ${p => cellBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'changed' && css`animation: ${cellPulse} 0.5s ease-out;`}
`;

const RowLabel = styled.div`
  font-size: 9px;
  color: var(--text-tertiary, #555);
  font-family: var(--font-mono, monospace);
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 6px;
`;

const ColLabels = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: 24px repeat(${p => p.$cols}, 1fr);
  gap: 2px;
  padding: 0 6px;
`;

const ColLabel = styled.div`
  font-size: 9px;
  color: var(--text-tertiary, #555);
  font-family: var(--font-mono, monospace);
  text-align: center;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 10px;
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

interface CellState { value: string; status: CellStatus; heat: number; }

const AnimatedMatrix: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [grid, setGrid] = useState<CellState[][]>([]);
  const [actionText, setActionText] = useState('');

  const findMatrixVar = useCallback((vars: Record<string, any>): any[][] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['matrix', 'grid', 'board', 'table', 'dp', 'memo', 'maze', 'map', 'cells', 'rows'];
    for (const n of [...hints, ...names]) {
      const v = vars[n];
      if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) return v;
    }
    // Fallback: first 2D list
    for (const v of Object.values(vars)) {
      if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setGrid([]); setActionText(''); }
      return;
    }

    const matrix = findMatrixVar(currentStep.variables);
    if (!matrix || matrix.length === 0) { setGrid([]); return; }

    // Find min/max for heat map
    let min = Infinity, max = -Infinity;
    for (const row of matrix) {
      for (const v of row) {
        const n = typeof v === 'number' ? v : 0;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
    const range = max - min || 1;

    const newGrid: CellState[][] = matrix.map(row =>
      (row as any[]).map((v: any) => {
        const num = typeof v === 'number' ? v : 0;
        return {
          value: typeof v === 'object' ? JSON.stringify(v) : String(v),
          status: 'idle' as CellStatus,
          heat: (num - min) / range,
        };
      })
    );

    // Apply command effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const vals = cmd.values ?? {};
      const r = vals.row as number | undefined;
      const c = vals.col as number | undefined;

      if (t === 'SET_VALUE') {
        if (r !== undefined && c !== undefined && newGrid[r]?.[c]) {
          newGrid[r][c].status = 'changed';
          action = `[${r}][${c}] = ${vals.new_value ?? ''}`;
        }
      } else if (t === 'HIGHLIGHT') {
        if (r !== undefined) {
          // Highlight entire row
          if (newGrid[r]) newGrid[r].forEach(cell => cell.status = 'highlight');
          action = `highlight row ${r}`;
        }
        const indices: number[] = (cmd as any).indices ?? [];
        for (const i of indices) {
          const ri = Math.floor(i / (newGrid[0]?.length ?? 1));
          const ci = i % (newGrid[0]?.length ?? 1);
          if (newGrid[ri]?.[ci]) newGrid[ri][ci].status = 'highlight';
        }
      } else if (t === 'MARK') {
        if (r !== undefined && c !== undefined && newGrid[r]?.[c]) {
          newGrid[r][c].status = 'marked';
          action = `mark [${r}][${c}]`;
        }
      }
    }

    setGrid(newGrid);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findMatrixVar, debugState]);

  const cols = grid[0]?.length ?? 0;

  if (grid.length === 0) {
    return <Container><EmptyMsg>Empty Matrix</EmptyMsg></Container>;
  }

  return (
    <Container>
      {/* Column labels */}
      <ColLabels $cols={cols}>
        <div />
        {Array.from({ length: cols }, (_, i) => <ColLabel key={i}>{i}</ColLabel>)}
      </ColLabels>

      {/* Grid rows */}
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <RowLabel>{ri}</RowLabel>
          <Grid $cols={cols}>
            {row.map((cell, ci) => (
              <CellBox key={ci} $status={cell.status} $heat={cell.heat}>
                {cell.value}
              </CellBox>
            ))}
          </Grid>
        </div>
      ))}

      <InfoLabel>Matrix ({grid.length} x {cols})</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedMatrix;
