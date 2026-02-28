// AnimatedQueue — horizontal FIFO visualization with slide physics
// Elements slide in from the right and exit from the left

import React, { useState, useEffect } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 200px;
`;

const QueueTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1rem;
  border-top: 3px solid #444;
  border-bottom: 3px solid #444;
  min-width: 200px;
  min-height: 60px;
  position: relative;
`;

const DirectionArrow = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  ${({ $side }) => ($side === 'left' ? 'left: -30px' : 'right: -30px')};
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  color: #888;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 0.5rem;
`;

const AnimatedItem = styled(animated.div)<{ $isFront?: boolean; $color?: string }>`
  min-width: 60px;
  padding: 0.75rem 1rem;
  text-align: center;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 6px;
  color: white;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #4facfe, #00f2fe)'};
  box-shadow: ${({ $isFront }) =>
    $isFront
      ? '0 0 16px rgba(79, 172, 254, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.2)'};
  user-select: none;
  white-space: nowrap;
`;

const COLORS = [
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #667eea, #764ba2)',
];

interface QueueItem {
  id: string;
  value: any;
  color: string;
}

interface AnimatedQueueProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedQueue: React.FC<AnimatedQueueProps> = ({ commands, currentFrame, speed }) => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    const newItems: QueueItem[] = [];
    let colorIdx = 0;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';

      if (cmdType === 'ENQUEUE' || cmdType === 'PUSH' || cmdType === 'CREATE') {
        newItems.push({
          id: `q-${i}-${cmd.value ?? cmd.target}`,
          value: cmd.value ?? cmd.target,
          color: COLORS[colorIdx++ % COLORS.length],
        });
        setLastAction(`enqueue(${cmd.value ?? cmd.target})`);
      } else if (cmdType === 'DEQUEUE' || cmdType === 'POP' || cmdType === 'DELETE') {
        if (newItems.length > 0) {
          const removed = newItems.shift();
          setLastAction(`dequeue() → ${removed?.value}`);
        }
      }
    }

    setItems(newItems);
  }, [commands, currentFrame]);

  const springs = useSprings(
    items.length,
    items.map((_, i) => ({
      opacity: 1,
      transform: 'translateX(0px) scale(1)',
      from: { opacity: 0, transform: 'translateX(80px) scale(0.5)' },
      config: { tension: 180, friction: 24 },
    }))
  );

  return (
    <Container>
      <QueueTrack>
        <DirectionArrow $side="left">← out</DirectionArrow>
        {springs.map((style, i) => (
          <AnimatedItem
            key={items[i]?.id || i}
            style={style}
            $isFront={i === 0}
            $color={items[i]?.color}
          >
            {items[i]?.value}
          </AnimatedItem>
        ))}
        {items.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic', padding: '1rem' }}>
            Empty Queue
          </div>
        )}
        <DirectionArrow $side="right">in →</DirectionArrow>
      </QueueTrack>
      <Label>QUEUE ({items.length} items) — FIFO</Label>
      {lastAction && (
        <div style={{ marginTop: '0.5rem', color: '#4facfe', fontSize: '0.85rem' }}>
          Last: {lastAction}
        </div>
      )}
    </Container>
  );
};

export default AnimatedQueue;
