// AnimatedString — store-driven character-by-character string visualization
// Rebuilds string from step variables, applies HIGHLIGHT/COMPARE/SET_VALUE effects

import React, { useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const charFlip = keyframes`
  0%   { transform: rotateY(0deg); }
  50%  { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
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
`;

const CharsRow = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
  padding: 1.5rem;
`;

type CharStatus = 'idle' | 'highlight' | 'comparing' | 'changed' | 'matched';

const statusBg: Record<CharStatus, string> = {
  idle: 'rgba(255,255,255,0.05)',
  highlight: 'rgba(255,215,64,0.2)',
  comparing: 'rgba(24,255,255,0.2)',
  changed: 'rgba(0,230,118,0.2)',
  matched: 'rgba(102,126,234,0.2)',
};
const statusBorder: Record<CharStatus, string> = {
  idle: 'rgba(255,255,255,0.08)',
  highlight: 'rgba(255,215,64,0.4)',
  comparing: 'rgba(24,255,255,0.4)',
  changed: 'rgba(0,230,118,0.45)',
  matched: 'rgba(102,126,234,0.4)',
};

const CharBox = styled(animated.div)<{ $status: CharStatus }>`
  width: 38px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  border-radius: 6px;
  background: ${p => statusBg[p.$status]};
  border: 1px solid ${p => statusBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'changed' && css`animation: ${charFlip} 0.4s ease-out;`}
`;

const IdxRow = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
`;

const IdxLabel = styled.div`
  width: 38px;
  text-align: center;
  font-size: 9px;
  color: var(--text-tertiary, #555);
  font-family: var(--font-mono, monospace);
`;

const StringLabel = styled.div`
  margin-top: 1rem;
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: var(--text-secondary, #aaa);
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

interface CharState { ch: string; status: CharStatus; }

export const AnimatedString: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );
  const previousVariables = useAnimationStore(s => s.previousVariables);

  const [chars, setChars] = useState<CharState[]>([]);
  const [fullStr, setFullStr] = useState('');
  const [actionText, setActionText] = useState('');

  const findStringVar = useCallback((vars: Record<string, any>): string | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.strings ?? [])];
    const names = ['text', 'string', 'str', 'word', 'sentence', 'pattern', 's', 'result'];
    for (const n of [...hints, ...names]) {
      if (typeof vars[n] === 'string' && vars[n].length > 0) return vars[n];
    }
    // Fallback: any string > 1 char
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith('__')) continue;
      if (typeof v === 'string' && v.length > 1) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setChars([]); setFullStr(''); setActionText(''); }
      return;
    }

    const str = findStringVar(currentStep.variables);
    if (str === null) { setChars([]); setFullStr(''); return; }

    const prevStr = findStringVar(previousVariables) ?? '';
    setFullStr(str);

    const newChars: CharState[] = str.split('').map((ch, i) => ({
      ch,
      status: (prevStr[i] !== undefined && prevStr[i] !== ch) ? 'changed' : 'idle' as CharStatus,
    }));

    // Mark new characters
    for (let i = prevStr.length; i < newChars.length; i++) {
      newChars[i].status = 'changed';
    }

    // Apply command effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const indices: number[] = (cmd as any).indices ?? [];
      const vals = cmd.values ?? {};

      if (t === 'HIGHLIGHT' || t === 'COLOR_CHANGE') {
        for (const i of indices) { if (newChars[i]) newChars[i].status = 'highlight'; }
        if (vals.pattern) action = `match "${vals.pattern}"`;
      } else if (t === 'COMPARE') {
        for (const i of indices) { if (newChars[i]) newChars[i].status = 'comparing'; }
        action = 'compare';
      } else if (t === 'SET_VALUE') {
        for (const i of indices) { if (newChars[i]) newChars[i].status = 'changed'; }
        action = `set [${indices.join(',')}]`;
      } else if (t === 'MOVE') {
        for (const i of indices) { if (newChars[i]) newChars[i].status = 'highlight'; }
        action = 'move';
      } else if (t === 'CREATE') {
        action = 'create';
      } else if (t === 'DELETE') {
        action = 'delete';
      }
    }

    setChars(newChars);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, previousVariables, findStringVar, debugState]);

  const springs = useSprings(
    chars.length,
    chars.map(() => ({
      opacity: 1, transform: 'translateY(0px)',
      config: { tension: 200, friction: 20 },
      from: { opacity: 0.5, transform: 'translateY(-8px)' },
    }))
  );

  if (chars.length === 0) {
    return <Container><EmptyMsg>No string data</EmptyMsg></Container>;
  }

  return (
    <Container>
      <CharsRow>
        {springs.map((style, i) => {
          const c = chars[i];
          if (!c) return null;
          return (
            <CharBox key={i} style={style} $status={c.status}>
              {c.ch === ' ' ? '\u00B7' : c.ch}
            </CharBox>
          );
        })}
      </CharsRow>
      <IdxRow>
        {chars.map((_, i) => <IdxLabel key={i}>{i}</IdxLabel>)}
      </IdxRow>
      <StringLabel>"{fullStr}"</StringLabel>
      <InfoLabel>String ({chars.length} chars)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedString;
