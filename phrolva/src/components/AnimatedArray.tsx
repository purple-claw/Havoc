// AnimatedArray - Where arrays come to life with spring physics
// Bar charts that bounce, swap, and glow

import React, { useEffect, useState, useRef } from 'react';
import { animated, useSpring, useSprings } from '@react-spring/web';
import styled from 'styled-components';
import { AnimationCommand, CommandType } from '../types/animation.types';
import { useAnimationStore } from '../stores/animationStore';

const ArrayContainer = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  height: 400px;
  padding: 20px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const ArrayBar = styled(animated.div)<{ $isHighlighted: boolean; $isComparing: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 50px;
  background: ${props => 
    props.$isHighlighted ? 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)' :
    props.$isComparing ? 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)' :
    'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
  };
  border-radius: 8px 8px 0 0;
  transition: background 0.3s ease;
  cursor: pointer;
  
  &:hover {
    filter: brightness(1.2);
  }
`;

const BarValue = styled.div`
  position: absolute;
  top: -25px;
  color: white;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const BarIndex = styled.div`
  position: absolute;
  bottom: -25px;
  color: #888;
  font-size: 12px;
`;

interface ArrayElement {
  value: number;
  index: number;
  isHighlighted: boolean;
  isComparing: boolean;
  isSwapping: boolean;
}

interface AnimatedArrayProps {
  initialArray?: number[];
  width?: number;
  height?: number;
}

export const AnimatedArray: React.FC<AnimatedArrayProps> = ({
  initialArray = [64, 34, 25, 12, 22, 11, 90],
  height = 400
}) => {
  const { currentCommand, visualizationData } = useAnimationStore();
  const [arrayElements, setArrayElements] = useState<ArrayElement[]>([]);
  const [maxValue, setMaxValue] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize array elements
  useEffect(() => {
    const elements = initialArray.map((value, index) => ({
      value,
      index,
      isHighlighted: false,
      isComparing: false,
      isSwapping: false
    }));
    setArrayElements(elements);
    setMaxValue(Math.max(...initialArray, 100));
  }, [initialArray]);
  
  // Spring animations for each bar
  const springs = useSprings(
    arrayElements.length,
    arrayElements.map((element, idx) => ({
      height: `${(element.value / maxValue) * (height - 100)}px`,
      transform: element.isSwapping ? 'scale(1.1)' : 'scale(1)',
      config: {
        tension: 200,
        friction: 20,
        mass: element.isSwapping ? 2 : 1  // Heavier when swapping for bounce
      }
    }))
  );
  
  // Handle animation commands
  useEffect(() => {
    if (!currentCommand) return;
    
    const updatedElements = [...arrayElements];
    
    switch (currentCommand.type) {
      case CommandType.HIGHLIGHT:
        // Reset all highlights first
        updatedElements.forEach(el => el.isHighlighted = false);
        // Highlight specified indices
        currentCommand.indices?.forEach(idx => {
          if (updatedElements[idx]) {
            updatedElements[idx].isHighlighted = true;
          }
        });
        break;
        
      case CommandType.COMPARE:
        // Reset comparisons
        updatedElements.forEach(el => el.isComparing = false);
        // Mark comparing elements
        currentCommand.indices?.forEach(idx => {
          if (updatedElements[idx]) {
            updatedElements[idx].isComparing = true;
          }
        });
        break;
        
      case CommandType.SWAP:
        if (currentCommand.indices && currentCommand.indices.length === 2) {
          const [idx1, idx2] = currentCommand.indices;
          
          // Mark as swapping
          updatedElements[idx1].isSwapping = true;
          updatedElements[idx2].isSwapping = true;
          
          // Perform the swap
          const temp = updatedElements[idx1].value;
          updatedElements[idx1].value = updatedElements[idx2].value;
          updatedElements[idx2].value = temp;
          
          // Clear swap flag after animation
          setTimeout(() => {
            setArrayElements(prev => prev.map(el => ({ ...el, isSwapping: false })));
          }, currentCommand.duration);
        }
        break;
        
      case CommandType.SET_VALUE:
        if (currentCommand.indices && currentCommand.indices[0] !== undefined) {
          const idx = currentCommand.indices[0];
          const newValue = currentCommand.values?.new_value;
          if (newValue !== undefined && updatedElements[idx]) {
            updatedElements[idx].value = newValue;
            updatedElements[idx].isHighlighted = true;
          }
        }
        break;
        
      case CommandType.CLEAR:
        // Reset all visual states
        updatedElements.forEach(el => {
          el.isHighlighted = false;
          el.isComparing = false;
          el.isSwapping = false;
        });
        break;
    }
    
    setArrayElements(updatedElements);
  }, [currentCommand]);
  
  return (
    <ArrayContainer ref={containerRef}>
      {springs.map((springProps, idx) => {
        const element = arrayElements[idx];
        if (!element) return null;
        
        return (
          <ArrayBar
            key={idx}
            style={springProps}
            $isHighlighted={element.isHighlighted}
            $isComparing={element.isComparing}
            onClick={() => console.log(`Clicked bar ${idx}: ${element.value}`)}
          >
            <BarValue>{element.value}</BarValue>
            <BarIndex>{idx}</BarIndex>
          </ArrayBar>
        );
      })}
    </ArrayContainer>
  );
};
