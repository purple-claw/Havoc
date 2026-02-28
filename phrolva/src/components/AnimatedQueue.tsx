// AnimatedQueue — store-driven horizontal FIFO visualization
// Rebuilds queue from step variables, decorates with ENQUEUE/DEQUEUE effects

import React, { useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const slideIn = keyframes`
  0%   { transform: translateX(50px) scale(0.7); opacity: 0; }
  60%  { transform: translateX(-3px) scale(1.02); }
  100% { transform: translateX(0) scale(1); opacity: 1; }
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

const QueueTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1rem 2rem;
  border-top: 3px solid rgba(255,255,255,0.08);
  border-bottom: 3px solid rgba(255,255,255,0.08);
  min-width: 200px;
  min-height: 60px;
  position: relative;
  background: rgba(255,255,255,0.015);
  border-radius: 2px;
`;

const Arrow = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  ${p => (p.$side === 'left' ? 'left: -36px' : 'right: -36px')};
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary, #666);
`;

type ItemStatus = 'idle' | 'enqueuing' | 'dequeuing' | 'highlight' | 'front';

const statusBg: Record<ItemStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  enqueuing: 'rgba(0,230,118,0.18)',
  dequeuing: 'rgba(255,82,82,0.18)',
  highlight: 'rgba(255,215,64,0.15)',
  front: 'rgba(79,172,254,0.15)',
};
const statusBorder: Record<ItemStatus, string> = {
  idle: 'rgba(255,255,255,0.08)',
  enqueuing: 'rgba(0,230,118,0.4)',
  dequeuing: 'rgba(255,82,82,0.4)',
  highlight: 'rgba(255,215,64,0.35)',
  front: 'rgba(79,172,254,0.35)',
};

const ItemBox = styled(animated.div)<{ $status: ItemStatus }>`
  min-width: 60px;
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
  white-space: nowrap;
  ${p => p.$status === 'enqueuing' && css`animation: ${slideIn} 0.4s ease-out;`}
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
  padding: 1rem 2rem;
  font-size: 13px;
`;

interface QueueItemState { value: string; status: ItemStatus; }

const AnimatedQueue: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [items, setItems] = useState<QueueItemState[]>([]);
  const [actionText, setActionText] = useState('');

  const findQueueVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['queue', 'q', 'fifo', 'bfs_queue', 'frontier', 'deque', 'pq', 'priority'];
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

    const arr = findQueueVar(currentStep.variables);
    if (!arr) return;

    const newItems: QueueItemState[] = arr.map((v: any, i: number) => ({
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      status: (i === 0 ? 'front' : 'idle') as ItemStatus,
    }));

    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      if (t === 'ENQUEUE' || t === 'PUSH' || t === 'CREATE') {
        if (newItems.length > 0) newItems[newItems.length - 1].status = 'enqueuing';
        action = `enqueue(${cmd.values?.value ?? ''})`;
      } else if (t === 'DEQUEUE' || t === 'POP' || t === 'DELETE') {
        action = `dequeue() -> ${cmd.values?.value ?? ''}`;
      } else if (t === 'HIGHLIGHT') {
        const indices: number[] = (cmd as any).indices ?? [];
        for (const i of indices) { if (newItems[i]) newItems[i].status = 'highlight'; }
      }
    }

    setItems(newItems);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findQueueVar, debugState]);

  const springs = useSprings(
    items.length,
    items.map(() => ({
      opacity: 1, transform: 'translateX(0px)',
      config: { tension: 180, friction: 24 },
      from: { opacity: 0.5, transform: 'translateX(30px)' },
    }))
  );

  return (
    <Container>
      <QueueTrack>
        <Arrow $side="left">{'<-'} out</Arrow>
        {springs.map((style, i) => {
          const item = items[i];
          if (!item) return null;
          return <ItemBox key={i} style={style} $status={item.status}>{item.value}</ItemBox>;
        })}
        {items.length === 0 && <EmptyMsg>Empty Queue</EmptyMsg>}
        <Arrow $side="right">in {'->'}  </Arrow>
      </QueueTrack>
      <InfoLabel>Queue ({items.length} items) - FIFO</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedQueue;
