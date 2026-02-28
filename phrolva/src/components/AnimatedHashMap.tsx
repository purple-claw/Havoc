// AnimatedHashMap — store-driven key-value visualization
// Rebuilds dictionary from step variables, applies SET_VALUE/DELETE/HIGHLIGHT effects

import React, { useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const flashIn = keyframes`
  0%   { transform: scaleX(0.3); opacity: 0; }
  60%  { transform: scaleX(1.03); }
  100% { transform: scaleX(1); opacity: 1; }
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

const BucketGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 500px;
  width: 100%;
`;

type EntryStatus = 'idle' | 'inserted' | 'updated' | 'deleted' | 'lookup' | 'highlight';

const statusBg: Record<EntryStatus, string> = {
  idle: 'rgba(255,255,255,0.04)',
  inserted: 'rgba(0,230,118,0.15)',
  updated: 'rgba(255,215,64,0.15)',
  deleted: 'rgba(255,82,82,0.15)',
  lookup: 'rgba(24,255,255,0.15)',
  highlight: 'rgba(102,126,234,0.15)',
};
const statusBorder: Record<EntryStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  inserted: 'rgba(0,230,118,0.35)',
  updated: 'rgba(255,215,64,0.35)',
  deleted: 'rgba(255,82,82,0.35)',
  lookup: 'rgba(24,255,255,0.35)',
  highlight: 'rgba(102,126,234,0.35)',
};

const EntryRow = styled(animated.div)<{ $status: EntryStatus }>`
  display: flex;
  align-items: stretch;
  border-radius: 6px;
  overflow: hidden;
  background: ${p => statusBg[p.$status]};
  border: 1px solid ${p => statusBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'inserted' && css`animation: ${flashIn} 0.35s ease-out;`}
`;

const KeyCell = styled.div`
  min-width: 100px;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
  background: rgba(255,255,255,0.02);
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
`;

const ValueCell = styled.div`
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  display: flex;
  align-items: center;
`;

const HashBadge = styled.span`
  font-size: 9px;
  font-weight: 600;
  color: var(--text-tertiary, #555);
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 99px;
  background: rgba(255,255,255,0.04);
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

interface EntryState { key: string; value: string; status: EntryStatus; hash: number; }

function simpleHash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 97;
}

const AnimatedHashMap: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );
  const previousVariables = useAnimationStore(s => s.previousVariables);

  const [entries, setEntries] = useState<EntryState[]>([]);
  const [actionText, setActionText] = useState('');

  const findDictVar = useCallback((vars: Record<string, any>): Record<string, any> | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.dicts ?? [])];
    const names = ['hash_map', 'hashmap', 'map', 'dict', 'table', 'cache', 'memo', 'counter', 'freq', 'count', 'lookup', 'd'];
    for (const n of [...hints, ...names]) {
      if (vars[n] && typeof vars[n] === 'object' && !Array.isArray(vars[n])) return vars[n];
    }
    // Fallback: first dict variable
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith('__')) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setEntries([]); setActionText(''); }
      return;
    }

    const dict = findDictVar(currentStep.variables);
    if (!dict) { setEntries([]); return; }

    const prevDict = findDictVar(previousVariables) ?? {};

    const newEntries: EntryState[] = Object.entries(dict).map(([k, v]) => {
      let status: EntryStatus = 'idle';
      if (!(k in prevDict)) status = 'inserted';
      else if (JSON.stringify(prevDict[k]) !== JSON.stringify(v)) status = 'updated';
      return {
        key: String(k),
        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
        status,
        hash: simpleHash(String(k)),
      };
    });

    // Apply command effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const vals = cmd.values ?? {};

      if (t === 'CREATE' || t === 'SET_VALUE') {
        const key = vals.key as string | undefined;
        if (key) {
          const entry = newEntries.find(e => e.key === key);
          if (entry) entry.status = t === 'CREATE' ? 'inserted' : 'updated';
          action = t === 'CREATE' ? `insert("${key}")` : `update("${key}")`;
        }
      } else if (t === 'DELETE') {
        action = `delete("${vals.key ?? ''}")`;
      } else if (t === 'HIGHLIGHT') {
        const key = vals.key as string | undefined;
        if (key) {
          const entry = newEntries.find(e => e.key === key);
          if (entry) entry.status = 'lookup';
          action = `lookup("${key}")`;
        }
      }
    }

    // Sort by hash for visual bucket grouping
    newEntries.sort((a, b) => a.hash - b.hash);
    setEntries(newEntries);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, previousVariables, findDictVar, debugState]);

  const springs = useSprings(
    entries.length,
    entries.map(() => ({
      opacity: 1, transform: 'translateX(0px)',
      config: { tension: 180, friction: 25 },
      from: { opacity: 0.5, transform: 'translateX(-15px)' },
    }))
  );

  if (entries.length === 0) {
    return <Container><EmptyMsg>Empty HashMap</EmptyMsg></Container>;
  }

  return (
    <Container>
      <BucketGrid>
        {springs.map((style, i) => {
          const entry = entries[i];
          if (!entry) return null;
          return (
            <EntryRow key={entry.key} style={style} $status={entry.status}>
              <KeyCell>{entry.key}</KeyCell>
              <ValueCell>
                {entry.value}
                <HashBadge>#{entry.hash}</HashBadge>
              </ValueCell>
            </EntryRow>
          );
        })}
      </BucketGrid>
      <InfoLabel>HashMap ({entries.length} entries)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedHashMap;
