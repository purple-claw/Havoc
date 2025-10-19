// AnimatedString - Character-by-character animations for string operations
// Letters that dance, flip, and transform

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { animated, useSpring } from '@react-spring/web';
import { useAnimationStore } from '../stores/animationStore';
import { CommandType } from '../types/animation.types';

const StringContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  font-family: 'Fira Code', 'Monaco', monospace;
`;

const CharacterBox = styled(animated.div)<{ $highlighted?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 50px;
  margin: 0 2px;
  background: ${props => props.$highlighted 
    ? 'linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%)'
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 8px;
  color: white;
  font-size: 24px;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
`;

const IndexLabel = styled.div`
  position: absolute;
  bottom: -20px;
  font-size: 10px;
  color: #888;
`;

interface CharacterData {
  char: string;
  index: number;
  highlighted: boolean;
  isNew: boolean;
}

export const AnimatedString: React.FC = () => {
  const { currentCommand } = useAnimationStore();
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [stringValue, setStringValue] = useState('HELLO WORLD');
  
  // Initialize characters
  useEffect(() => {
    const chars = stringValue.split('').map((char, index) => ({
      char,
      index,
      highlighted: false,
      isNew: false
    }));
    setCharacters(chars);
  }, [stringValue]);
  
  // Handle animation commands
  useEffect(() => {
    if (!currentCommand) return;
    
    const updatedChars = [...characters];
    
    switch (currentCommand.type) {
      case CommandType.CREATE:
        // Add new characters
        if (currentCommand.values?.characters) {
          const newChars = currentCommand.values.characters.split('');
          newChars.forEach((char: string, idx: number) => {
            updatedChars.push({
              char,
              index: updatedChars.length,
              highlighted: true,
              isNew: true
            });
          });
        }
        break;
        
      case CommandType.DELETE:
        // Remove characters at indices
        if (currentCommand.indices) {
          // Sort indices in descending order to remove from end first
          const indicesToRemove = [...currentCommand.indices].sort((a, b) => b - a);
          indicesToRemove.forEach(idx => {
            if (idx < updatedChars.length) {
              updatedChars.splice(idx, 1);
            }
          });
          // Re-index
          updatedChars.forEach((char, idx) => char.index = idx);
        }
        break;
        
      case CommandType.SET_VALUE:
        // Replace characters
        if (currentCommand.indices && currentCommand.values?.new_char) {
          currentCommand.indices.forEach(idx => {
            if (updatedChars[idx]) {
              updatedChars[idx].char = currentCommand.values.new_char;
              updatedChars[idx].highlighted = true;
            }
          });
        }
        break;
        
      case CommandType.HIGHLIGHT:
        // Reset all highlights first
        updatedChars.forEach(char => char.highlighted = false);
        // Highlight specified indices
        if (currentCommand.indices) {
          currentCommand.indices.forEach(idx => {
            if (updatedChars[idx]) {
              updatedChars[idx].highlighted = true;
            }
          });
        }
        break;
        
      case CommandType.MOVE:
        // Rearrange characters (for reversal, etc.)
        if (currentCommand.values?.to_positions && currentCommand.indices) {
          const temp = [...updatedChars];
          currentCommand.indices.forEach((fromIdx, i) => {
            const toIdx = currentCommand.values.to_positions[i];
            if (temp[fromIdx] && toIdx !== undefined) {
              updatedChars[toIdx] = temp[fromIdx];
            }
          });
        }
        break;
    }
    
    setCharacters(updatedChars);
    
    // Clear highlights after animation
    if (currentCommand.type !== CommandType.HIGHLIGHT) {
      setTimeout(() => {
        setCharacters(prev => prev.map(char => ({ ...char, highlighted: false, isNew: false })));
      }, currentCommand.duration);
    }
  }, [currentCommand]);
  
  return (
    <StringContainer>
      {characters.map((charData, idx) => {
        const springProps = useSpring({
          from: { opacity: charData.isNew ? 0 : 1, transform: 'scale(1) rotate(0deg)' },
          to: { 
            opacity: 1, 
            transform: charData.highlighted 
              ? 'scale(1.2) rotate(5deg)' 
              : 'scale(1) rotate(0deg)'
          },
          config: { tension: 200, friction: 20 }
        });
        
        return (
          <CharacterBox
            key={`${idx}-${charData.char}`}
            style={springProps}
            $highlighted={charData.highlighted}
          >
            {charData.char}
            <IndexLabel>{idx}</IndexLabel>
          </CharacterBox>
        );
      })}
    </StringContainer>
  );
};
