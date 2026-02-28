// AnimatedGeneric — store-driven catch-all variable dashboard
// Shows all variables from the current step as a live-updating dashboard
// Handles any data structure type the other adapters don't cover

import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  user-select: none;
  overflow: auto;
`;

const VarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 800px;
`;

type VarStatus = 'idle' | 'new' | 'changed' | 'highlight';

const statusBg: Record<VarStatus, string> = {
  idle: 'rgba(255,255,255,0.03)',
  new: 'rgba(0,230,118,0.1)',
  changed: 'rgba(255,215,64,0.1)',
  highlight: 'rgba(24,255,255,0.1)',
};
const statusBorder: Record<VarStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  new: 'rgba(0,230,118,0.3)',
  changed: 'rgba(255,215,64,0.3)',
  highlight: 'rgba(24,255,255,0.3)',
};

const VarCard = styled.div<{ $status: VarStatus }>`
  padding: 10px 14px;
  border-radius: 8px;
  background: ${p => statusBg[p.$status]};
  border: 1px solid ${p => statusBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  animation: ${fadeIn} 0.3s ease-out;
`;

const VarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
`;

const VarName = styled.span`
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
`;

const TypeBadge = styled.span<{ $color: string }>`
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
  background: ${p => p.$color}22;
  color: ${p => p.$color};
  border: 1px solid ${p => p.$color}44;
  text-transform: uppercase;
`;

const StatusBadge = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 99px;
  background: ${p => p.$color};
  color: #000;
  margin-left: auto;
`;

const VarValue = styled.div`
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  padding: 6px 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
  max-height: 80px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

const StdoutBox = styled.div`
  width: 100%;
  max-width: 800px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
`;

const StdoutTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary, #666);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 4px;
`;

const StdoutContent = styled.pre`
  margin: 0;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-green, #00e676);
  max-height: 100px;
  overflow: auto;
  white-space: pre-wrap;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 12px;
`;

const EmptyMsg = styled.div`
  color: var(--text-tertiary, #555);
  font-style: italic;
  padding: 3rem;
  font-size: 13px;
`;

function getTypeName(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (Array.isArray(val)) return 'list';
  if (typeof val === 'object') return 'dict';
  if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'string') return 'str';
  return typeof val;
}

const typeColors: Record<string, string> = {
  list: '#00e676',
  dict: '#ffd740',
  int: '#18ffff',
  float: '#18ffff',
  str: '#ff5252',
  bool: '#ce93d8',
  None: '#888',
};

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'object') return JSON.stringify(val, null, 1);
  return String(val);
}

interface VarEntry { name: string; value: any; typeName: string; status: VarStatus; }

const AnimatedGeneric: React.FC = () => {
  const { currentStepIndex, currentStep, debugState } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );
  const previousVariables = useAnimationStore(s => s.previousVariables);

  const [vars, setVars] = useState<VarEntry[]>([]);
  const [stdout, setStdout] = useState('');

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setVars([]); setStdout(''); }
      return;
    }

    const current = currentStep.variables ?? {};
    const prev = previousVariables ?? {};

    const entries: VarEntry[] = Object.entries(current)
      .filter(([k]) => !k.startsWith('__'))
      .map(([k, v]) => {
        let status: VarStatus = 'idle';
        if (!(k in prev)) status = 'new';
        else if (JSON.stringify(prev[k]) !== JSON.stringify(v)) status = 'changed';
        return {
          name: k,
          value: v,
          typeName: getTypeName(v),
          status,
        };
      });

    // Apply command effects (HIGHLIGHT etc.)
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      if (t === 'HIGHLIGHT') {
        const varName = cmd.values?.variable_name;
        if (varName) {
          const e = entries.find(x => x.name === varName);
          if (e) e.status = 'highlight';
        }
      } else if (t === 'LABEL' && cmd.values?.output) {
        // Console output command
      }
    }

    // Sort: new first, changed second, alphabetical
    entries.sort((a, b) => {
      const order = { new: 0, changed: 1, highlight: 2, idle: 3 };
      const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

    setVars(entries);
    setStdout(currentStep.stdout || '');
  }, [currentStepIndex, currentStep, currentStepCommands, previousVariables, debugState]);

  if (vars.length === 0 && !stdout) {
    return <Container><EmptyMsg>No variables to display</EmptyMsg></Container>;
  }

  return (
    <Container>
      <VarGrid>
        {vars.map(v => (
          <VarCard key={v.name} $status={v.status}>
            <VarHeader>
              <VarName>{v.name}</VarName>
              <TypeBadge $color={typeColors[v.typeName] ?? '#888'}>{v.typeName}</TypeBadge>
              {v.status === 'new' && <StatusBadge $color="#00e676">NEW</StatusBadge>}
              {v.status === 'changed' && <StatusBadge $color="#ffd740">MOD</StatusBadge>}
            </VarHeader>
            <VarValue>{formatValue(v.value)}</VarValue>
          </VarCard>
        ))}
      </VarGrid>

      {stdout && (
        <StdoutBox>
          <StdoutTitle>Console Output</StdoutTitle>
          <StdoutContent>{stdout}</StdoutContent>
        </StdoutBox>
      )}

      <InfoLabel>Generic ({vars.length} variables)</InfoLabel>
    </Container>
  );
};

export default AnimatedGeneric;
