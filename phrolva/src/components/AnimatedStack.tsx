// AnimatedStack — store-driven vertical LIFO visualization
// Rebuilds stack state from step variables, decorates with PUSH/POP command effects

import React, { useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const dropIn = keyframes`
  0%   { transform: translateY(-40px) scale(0.7); opacity: 0; }
  60%  { transform: translateY(4px) scale(1.04); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
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

const StackColumn = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 4px;
  padding: 1rem 1.5rem;
  border-left: 3px solid rgba(255,255,255,0.08);
  border-right: 3px solid rgba(255,255,255,0.08);
  border-bottom: 3px solid rgba(255,255,255,0.08);
  border-radius: 0 0 10px 10px;
  min-width: 140px;
  min-height: 80px;
  position: relative;
  background: rgba(255,255,255,0.015);
`;

const TopBadge = styled.div`
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-cyan, #18ffff);
  letter-spacing: 1px;
`;

type ItemStatus = 'idle' | 'pushing' | 'popping' | 'highlight' | 'top';

const statusBg: Record<ItemStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  pushing: 'rgba(0,230,118,0.18)',
  popping: 'rgba(255,82,82,0.18)',
  highlight: 'rgba(255,215,64,0.15)',
  top: 'rgba(24,255,255,0.12)',
};
const statusBorder: Record<ItemStatus, string> = {
  idle: 'rgba(255,255,255,0.08)',
  pushing: 'rgba(0,230,118,0.4)',
  popping: 'rgba(255,82,82,0.4)',
  highlight: 'rgba(255,215,64,0.35)',
  top: 'rgba(24,255,255,0.3)',
};

const ItemBox = styled(animated.div)<{ $status: ItemStatus }>`
  width: 120px;
  padding: 10px 14px;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-mono, monospace);
  border-radius: 8px;
  color: var(--text-primary, #e0e0e0);
  background: ${p => statusBg[p.$status]};
  border: 1px solid ${p => statusBorder[p.$status]};
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'pushing' && css`animation: ${dropIn} 0.4s ease-out;`}
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 10px;
`;

const ActionLabel = styled.div`
  margin-top: 6px;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
`;

const EmptyMsg = styled.div`
  color: var(--text-tertiary, #555);
  font-style: italic;
  padding: 2rem;
  font-size: 13px;
`;

interface StackItemState { value: string; status: ItemStatus; }

const AnimatedStack: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [items, setItems] = useState<StackItemState[]>([]);
  const [actionText, setActionText] = useState('');

  const findStackVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['stack', 'stk', 'call_stack', 'undo', 'history', 's'];
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
      if (debugState === 'idle' || debugState === 'ready') { setItems([]); setActionText(''); }
      return;
    }

    const arr = findStackVar(currentStep.variables);
    if (!arr) return;

    const newItems: StackItemState[] = arr.map((v: any, i: number) => ({
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      status: (i === arr.length - 1 ? 'top' : 'idle') as ItemStatus,
    }));

    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      if (t === 'PUSH' || t === 'CREATE') {
        if (newItems.length > 0) newItems[newItems.length - 1].status = 'pushing';
        action = `push(${cmd.values?.value ?? ''})`;
      } else if (t === 'POP' || t === 'DELETE') {
        action = `pop() -> ${cmd.values?.value ?? ''}`;
      } else if (t === 'HIGHLIGHT' || t === 'VISIT') {
        const indices: number[] = (cmd as any).indices ?? [];
        for (const i of indices) { if (newItems[i]) newItems[i].status = 'highlight'; }
      }
    }

    setItems(newItems);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findStackVar, debugState]);

  const springs = useSprings(
    items.length,
    items.map(() => ({
      opacity: 1, transform: 'translateY(0px)',
      config: { tension: 250, friction: 22 },
      from: { opacity: 0.5, transform: 'translateY(-20px)' },
    }))
  );

  return (
    <Container>
      <TopBadge>{'\\u2193'} TOP</TopBadge>
      <StackColumn>
        {springs.map((style, i) => {
          const item = items[i];
          if (!item) return null;
          return <ItemBox key={i} style={style} $status={item.status}>{item.value}</ItemBox>;
        })}
        {items.length === 0 && <EmptyMsg>Empty Stack</EmptyMsg>}
      </StackColumn>
      <InfoLabel>Stack ({items.length} items)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedStack;
