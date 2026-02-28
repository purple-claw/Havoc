// AnimatedStack — vertical LIFO visualization with spring physics
// Elements drop in from the top and fly out when popped

import React, { useState, useEffect } from 'react';
import { animated, useSprings } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 400px;
  position: relative;
`;

const StackContainer = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 4px;
  padding: 1rem;
  border-left: 3px solid #444;
  border-right: 3px solid #444;
  border-bottom: 3px solid #444;
  border-radius: 0 0 8px 8px;
  min-width: 120px;
  min-height: 60px;
  position: relative;
`;

const StackLabel = styled.div`
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 0.5rem;
`;

const TopIndicator = styled.div`
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: #00d4ff;
  font-weight: bold;
`;

const AnimatedItem = styled(animated.div)<{ $isTop?: boolean; $color?: string }>`
  width: 100px;
  padding: 0.75rem 1rem;
  text-align: center;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 6px;
  color: white;
  background: ${({ $color }) => $color || 'linear-gradient(135deg, #667eea, #764ba2)'};
  box-shadow: ${({ $isTop }) =>
    $isTop
      ? '0 0 20px rgba(102, 126, 234, 0.5), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.2)'};
  cursor: default;
  user-select: none;
`;

interface StackItem {
  id: string;
  value: any;
  color: string;
}

const COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];

interface AnimatedStackProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedStack: React.FC<AnimatedStackProps> = ({ commands, currentFrame, speed }) => {
  const [items, setItems] = useState<StackItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  // Process commands up to current frame
  useEffect(() => {
    const newItems: StackItem[] = [];
    let colorIdx = 0;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';

      if (cmdType === 'PUSH' || cmdType === 'CREATE') {
        newItems.push({
          id: `item-${i}-${cmd.value ?? cmd.target}`,
          value: cmd.value ?? cmd.target,
          color: COLORS[colorIdx++ % COLORS.length],
        });
        setLastAction(`push(${cmd.value ?? cmd.target})`);
      } else if (cmdType === 'POP' || cmdType === 'DELETE') {
        if (newItems.length > 0) {
          const popped = newItems.pop();
          setLastAction(`pop() → ${popped?.value}`);
        }
      } else if (cmdType === 'HIGHLIGHT' || cmdType === 'VISIT') {
        setHighlightIndex(newItems.length - 1);
      }
    }

    setItems(newItems);
  }, [commands, currentFrame]);

  // Spring animations for each item
  const springs = useSprings(
    items.length,
    items.map((_, i) => ({
      opacity: 1,
      transform: 'translateY(0px) scale(1)',
      from: { opacity: 0, transform: 'translateY(-50px) scale(0.5)' },
      config: { tension: 250, friction: 22 },
    }))
  );

  return (
    <Container>
      <TopIndicator>↓ TOP</TopIndicator>
      <StackContainer>
        {springs.map((style, i) => (
          <AnimatedItem
            key={items[i]?.id || i}
            style={style}
            $isTop={i === items.length - 1}
            $color={items[i]?.color}
          >
            {items[i]?.value}
          </AnimatedItem>
        ))}
        {items.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic', padding: '2rem' }}>
            Empty Stack
          </div>
        )}
      </StackContainer>
      <StackLabel>STACK ({items.length} items)</StackLabel>
      {lastAction && (
        <div style={{ marginTop: '0.5rem', color: '#00d4ff', fontSize: '0.85rem' }}>
          Last: {lastAction}
        </div>
      )}
    </Container>
  );
};

export default AnimatedStack;
