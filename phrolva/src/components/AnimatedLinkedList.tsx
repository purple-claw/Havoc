// AnimatedLinkedList — node-and-pointer visualization
// Nodes appear with spring-in, arrows animate between them, traversal pulses through

import React, { useState, useEffect } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  overflow-x: auto;
  min-height: 200px;
`;

const ListTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  padding: 1rem 2rem;
`;

const NodeBox = styled(animated.div)<{ $isVisited?: boolean; $isHighlighted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0;
`;

const DataBox = styled.div<{ $color?: string; $isHighlighted?: boolean }>`
  min-width: 56px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
  color: white;
  background: ${({ $color }) => $color || '#667eea'};
  border-radius: 6px 0 0 6px;
  border: 2px solid ${({ $isHighlighted }) => ($isHighlighted ? '#00d4ff' : '#444')};
  border-right: 1px solid #444;
  box-shadow: ${({ $isHighlighted }) =>
    $isHighlighted ? '0 0 16px rgba(0, 212, 255, 0.4)' : 'none'};
`;

const PointerBox = styled.div<{ $isNull?: boolean }>`
  width: 28px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: ${({ $isNull }) => ($isNull ? '#e94560' : '#888')};
  background: #1a1a2e;
  border-radius: 0 6px 6px 0;
  border: 2px solid #444;
  border-left: 0;
`;

const Arrow = styled.div<{ $isTraversed?: boolean }>`
  width: 32px;
  height: 2px;
  background: ${({ $isTraversed }) => ($isTraversed ? '#43e97b' : '#555')};
  position: relative;
  margin: 0 2px;

  &::after {
    content: '';
    position: absolute;
    right: -6px;
    top: -4px;
    width: 0;
    height: 0;
    border-left: 8px solid ${({ $isTraversed }) => ($isTraversed ? '#43e97b' : '#555')};
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }
`;

const NullTerminator = styled.div`
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  border: 2px solid #e94560;
  border-radius: 6px;
  color: #e94560;
  font-size: 0.6rem;
  font-weight: bold;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: #888;
  letter-spacing: 2px;
  margin-top: 0.5rem;
`;

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

interface ListNode {
  id: string;
  value: any;
  color: string;
  isVisited: boolean;
  isHighlighted: boolean;
}

interface AnimatedLinkedListProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedLinkedList: React.FC<AnimatedLinkedListProps> = ({
  commands,
  currentFrame,
  speed,
}) => {
  const [nodes, setNodes] = useState<ListNode[]>([]);
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    const list: ListNode[] = [];
    const visitedSet = new Set<string>();
    let highlightedId: string | null = null;
    let colorIdx = 0;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const target = String(cmd.target ?? '');
      const meta = cmd.metadata || {};

      if (cmdType === 'CREATE' || cmdType.includes('INSERT')) {
        const nodeId = target || `node_${i}`;
        const position = meta.position ?? list.length; // Default: append
        const node: ListNode = {
          id: nodeId,
          value: cmd.value ?? nodeId,
          color: COLORS[colorIdx++ % COLORS.length],
          isVisited: false,
          isHighlighted: false,
        };

        if (position >= list.length) {
          list.push(node);
        } else {
          list.splice(position, 0, node);
        }
        setLastAction(`insert(${node.value})`);
      } else if (cmdType === 'DELETE') {
        const idx = list.findIndex((n) => n.id === target);
        if (idx >= 0) {
          setLastAction(`delete(${list[idx].value})`);
          list.splice(idx, 1);
        } else if (list.length > 0) {
          const removed = list.pop();
          setLastAction(`delete(${removed?.value})`);
        }
      } else if (cmdType === 'VISIT' || cmdType === 'TRAVERSE') {
        visitedSet.add(target);
        highlightedId = target;
      } else if (cmdType === 'HIGHLIGHT') {
        highlightedId = target;
      } else if (cmdType === 'UNMARK') {
        highlightedId = null;
      }
    }

    // Apply states
    list.forEach((n) => {
      n.isVisited = visitedSet.has(n.id);
      n.isHighlighted = n.id === highlightedId;
    });

    setNodes(list);
  }, [commands, currentFrame]);

  const springs = useSprings(
    nodes.length,
    nodes.map(() => ({
      opacity: 1,
      transform: 'scale(1)',
      from: { opacity: 0, transform: 'scale(0.3)' },
      config: { tension: 160, friction: 28 },
    }))
  );

  return (
    <Container>
      <ListTrack>
        {springs.map((style, i) => {
          const node = nodes[i];
          if (!node) return null;

          return (
            <React.Fragment key={node.id}>
              <NodeBox style={style}>
                <DataBox
                  $color={node.isVisited ? '#43e97b' : node.color}
                  $isHighlighted={node.isHighlighted}
                >
                  {node.value}
                </DataBox>
                <PointerBox $isNull={i === nodes.length - 1}>
                  {i === nodes.length - 1 ? '∅' : '→'}
                </PointerBox>
              </NodeBox>
              {i < nodes.length - 1 && <Arrow $isTraversed={node.isVisited} />}
            </React.Fragment>
          );
        })}
        {nodes.length > 0 && <NullTerminator>NULL</NullTerminator>}
        {nodes.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>Empty Linked List</div>
        )}
      </ListTrack>
      <Label>LINKED LIST ({nodes.length} nodes)</Label>
      {lastAction && (
        <div style={{ marginTop: '0.5rem', color: '#667eea', fontSize: '0.85rem' }}>
          Last: {lastAction}
        </div>
      )}
    </Container>
  );
};

export default AnimatedLinkedList;
