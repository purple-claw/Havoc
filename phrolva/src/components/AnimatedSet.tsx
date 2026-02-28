// AnimatedSet — store-driven set/bubble visualization
// Rebuilds set from step variables, applies CREATE/DELETE/HIGHLIGHT effects

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const bubbleIn = keyframes`
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
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

const BubbleArea = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
  max-width: 500px;
  padding: 2rem;
  border-radius: 50%;
  min-width: 200px;
  min-height: 200px;
  background: radial-gradient(ellipse at center, rgba(102,126,234,0.06) 0%, transparent 70%);
  border: 1px dashed rgba(255,255,255,0.06);
`;

type BubbleStatus = 'idle' | 'added' | 'removed' | 'highlight';

const statusBg: Record<BubbleStatus, string> = {
  idle: 'rgba(102,126,234,0.15)',
  added: 'rgba(0,230,118,0.2)',
  removed: 'rgba(255,82,82,0.2)',
  highlight: 'rgba(255,215,64,0.2)',
};
const statusBorder: Record<BubbleStatus, string> = {
  idle: 'rgba(102,126,234,0.3)',
  added: 'rgba(0,230,118,0.5)',
  removed: 'rgba(255,82,82,0.5)',
  highlight: 'rgba(255,215,64,0.45)',
};

const Bubble = styled(animated.div)<{ $status: BubbleStatus }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 8px 14px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  background: ${p => statusBg[p.$status]};
  border: 1.5px solid ${p => statusBorder[p.$status]};
  transition: background 0.3s, border-color 0.3s;
  ${p => p.$status === 'added' && css`animation: ${bubbleIn} 0.4s ease-out;`}
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 12px;
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

interface BubbleState { value: string; status: BubbleStatus; }

const AnimatedSet: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );
  const previousVariables = useAnimationStore(s => s.previousVariables);

  const [bubbles, setBubbles] = useState<BubbleState[]>([]);
  const [actionText, setActionText] = useState('');

  const findSetVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.sets ?? [])];
    const names = ['set', 's', 'seen', 'visited', 'unique', 'result_set'];
    for (const n of [...hints, ...names]) {
      const v = vars[n];
      // Sets are serialized as arrays by JSON
      if (Array.isArray(v)) return v;
      // Some tracers keep set type info
      if (v && typeof v === 'object' && (v as any).__type === 'set') return (v as any).elements ?? [];
    }
    // Fallback: check for set-like arrays (unique elements, not 2D)
    for (const [k, v] of Object.entries(vars)) {
      if (k.startsWith('__')) continue;
      if (Array.isArray(v) && v.length > 0 && !Array.isArray(v[0])) {
        const unique = new Set(v.map(String));
        if (unique.size === v.length) return v;
      }
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setBubbles([]); setActionText(''); }
      return;
    }

    const arr = findSetVar(currentStep.variables);
    if (!arr) { setBubbles([]); return; }

    const prevArr = findSetVar(previousVariables) ?? [];
    const prevSet = new Set(prevArr.map(String));

    const newBubbles: BubbleState[] = arr.map((v: any) => {
      const s = String(v);
      return {
        value: typeof v === 'object' ? JSON.stringify(v) : s,
        status: prevSet.has(s) ? 'idle' : 'added' as BubbleStatus,
      };
    });

    // Apply command effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const vals = cmd.values ?? {};

      if (t === 'CREATE') {
        const el = vals.element ?? vals.value;
        if (el !== undefined) {
          const b = newBubbles.find(x => x.value === String(el));
          if (b) b.status = 'added';
          action = `add(${el})`;
        }
      } else if (t === 'DELETE') {
        action = `remove(${vals.element ?? vals.value ?? ''})`;
      } else if (t === 'HIGHLIGHT') {
        const indices: number[] = (cmd as any).indices ?? [];
        for (const i of indices) { if (newBubbles[i]) newBubbles[i].status = 'highlight'; }
        if (vals.operation) action = vals.operation;
      }
    }

    setBubbles(newBubbles);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, previousVariables, findSetVar, debugState]);

  const springs = useSprings(
    bubbles.length,
    bubbles.map(() => ({
      opacity: 1, transform: 'scale(1)',
      config: { tension: 190, friction: 22 },
      from: { opacity: 0, transform: 'scale(0.5)' },
    }))
  );

  if (bubbles.length === 0) {
    return <Container><EmptyMsg>Empty Set</EmptyMsg></Container>;
  }

  return (
    <Container>
      <BubbleArea>
        {springs.map((style, i) => {
          const b = bubbles[i];
          if (!b) return null;
          return <Bubble key={b.value} style={style} $status={b.status}>{b.value}</Bubble>;
        })}
      </BubbleArea>
      <InfoLabel>Set ({bubbles.length} elements)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedSet;
