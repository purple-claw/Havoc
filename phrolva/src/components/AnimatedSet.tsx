// AnimatedSet — set operations with Venn diagram-style visualization
// Elements bubble in/out, union/intersection/difference highlight regions

import React, { useState, useEffect } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 300px;
`;

const SetsRow = styled.div`
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const SetBox = styled.div<{ $color?: string }>`
  min-width: 160px;
  border: 2px solid ${({ $color }) => $color || '#667eea'};
  border-radius: 50%;
  padding: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  align-items: center;
  background: ${({ $color }) =>
    $color ? `${$color}11` : 'rgba(102, 126, 234, 0.06)'};
  min-height: 120px;
  position: relative;
`;

const SetLabel = styled.div<{ $color?: string }>`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #0d0d1a;
  padding: 0 8px;
  font-size: 0.75rem;
  color: ${({ $color }) => $color || '#667eea'};
  font-weight: bold;
  white-space: nowrap;
`;

const Element = styled(animated.div)<{ $isHighlighted?: boolean; $color?: string }>`
  padding: 0.4rem 0.6rem;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
  background: ${({ $color }) => $color || '#667eea'};
  box-shadow: ${({ $isHighlighted }) =>
    $isHighlighted ? '0 0 12px rgba(102, 126, 234, 0.5)' : '0 2px 4px rgba(0,0,0,0.2)'};
  cursor: default;
  user-select: none;
`;

const ResultSection = styled.div`
  margin-top: 1.5rem;
  text-align: center;
`;

const ResultLabel = styled.div`
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.5rem;
`;

const ResultSet = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
`;

const SET_COLORS = ['#667eea', '#e94560', '#43e97b', '#fa709a', '#4facfe'];

interface SetData {
  name: string;
  elements: Set<string>;
  color: string;
}

interface AnimatedSetProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedSet: React.FC<AnimatedSetProps> = ({ commands, currentFrame, speed }) => {
  const [sets, setSets] = useState<SetData[]>([]);
  const [result, setResult] = useState<{ label: string; elements: string[] } | null>(null);
  const [highlightedElements, setHighlightedElements] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    const setMap = new Map<string, Set<string>>();
    let resultData: { label: string; elements: string[] } | null = null;
    const highlighted = new Set<string>();

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const target = String(cmd.target ?? 'default');
      const meta = cmd.metadata || {};

      if (cmdType === 'CREATE') {
        // Create a new set
        const setName = meta.set_name || target;
        const elements = cmd.value;
        if (Array.isArray(elements)) {
          setMap.set(setName, new Set(elements.map(String)));
        } else {
          setMap.set(setName, new Set());
        }
      } else if (cmdType === 'SET_VALUE' || cmdType === 'PUSH') {
        // Add element to set
        const setName = meta.set_name || 'default';
        if (!setMap.has(setName)) setMap.set(setName, new Set());
        setMap.get(setName)!.add(String(cmd.value ?? target));
        highlighted.add(String(cmd.value ?? target));
        setLastAction(`${setName}.add(${cmd.value ?? target})`);
      } else if (cmdType === 'DELETE' || cmdType === 'POP') {
        // Remove from set
        const setName = meta.set_name || 'default';
        if (setMap.has(setName)) {
          setMap.get(setName)!.delete(String(cmd.value ?? target));
          setLastAction(`${setName}.remove(${cmd.value ?? target})`);
        }
      } else if (cmdType === 'HIGHLIGHT' || cmdType === 'VISIT') {
        highlighted.add(String(target));
      } else if (cmdType === 'LABEL') {
        // Set a result (union, intersection, etc.)
        const label = String(cmd.value ?? 'Result');
        const elements = meta.elements || [];
        resultData = { label, elements: elements.map(String) };
        setLastAction(label);
      }
    }

    // Convert map to array
    const setList: SetData[] = [];
    let colorIdx = 0;
    setMap.forEach((elements, name) => {
      setList.push({
        name,
        elements,
        color: SET_COLORS[colorIdx++ % SET_COLORS.length],
      });
    });

    setSets(setList);
    setResult(resultData);
    setHighlightedElements(highlighted);
  }, [commands, currentFrame]);

  return (
    <Container>
      <SetsRow>
        {sets.map((s) => (
          <SetBox key={s.name} $color={s.color}>
            <SetLabel $color={s.color}>{s.name} ({s.elements.size})</SetLabel>
            {Array.from(s.elements).map((el) => (
              <Element
                key={el}
                $isHighlighted={highlightedElements.has(el)}
                $color={s.color}
              >
                {el}
              </Element>
            ))}
            {s.elements.size === 0 && (
              <span style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>∅</span>
            )}
          </SetBox>
        ))}
      </SetsRow>

      {sets.length === 0 && (
        <div style={{ color: '#666', fontStyle: 'italic' }}>Set visualization will appear here</div>
      )}

      {result && (
        <ResultSection>
          <ResultLabel>{result.label}</ResultLabel>
          <ResultSet>
            {result.elements.length > 0 ? (
              result.elements.map((el) => (
                <Element key={el} $color="#fccb90">
                  {el}
                </Element>
              ))
            ) : (
              <span style={{ color: '#666' }}>∅ (empty set)</span>
            )}
          </ResultSet>
        </ResultSection>
      )}

      {lastAction && (
        <div style={{ marginTop: '1rem', color: '#667eea', fontSize: '0.85rem' }}>
          Last: {lastAction}
        </div>
      )}
    </Container>
  );
};

export default AnimatedSet;
