// CodeDisplay - Shows the source code being visualized
// With line highlighting as execution progresses

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';

const CodeContainer = styled.div`
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 14px;
  overflow: auto;
  max-height: 600px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const CodeHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const FileName = styled.div`
  color: #f093fb;
  font-weight: bold;
  margin-left: 8px;
`;

const CodeLine = styled.div<{ $active?: boolean; $executed?: boolean }>`
  display: flex;
  padding: 4px 0;
  background: ${props => 
    props.$active ? 'rgba(240, 147, 251, 0.2)' :
    props.$executed ? 'rgba(102, 126, 234, 0.1)' :
    'transparent'};
  border-left: 3px solid ${props =>
    props.$active ? '#f093fb' :
    props.$executed ? '#667eea' :
    'transparent'};
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const LineNumber = styled.span`
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
  color: #666;
  user-select: none;
`;

const LineContent = styled.span`
  flex: 1;
  color: #e0e0e0;
  white-space: pre;
`;

const NoCodeMessage = styled.div`
  text-align: center;
  color: #888;
  padding: 40px;
`;

// Sample code - in real app this comes from visualization data
const sampleCode = `arr = [5, 2, 4, 1, 3]
n = len(arr)

for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            temp = arr[j]
            arr[j] = arr[j + 1]
            arr[j + 1] = temp

print(f"Sorted: {arr}")`;

export const CodeDisplay: React.FC = () => {
  const { visualizationData, playbackState } = useAnimationStore();
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [executedLines, setExecutedLines] = useState<Set<number>>(new Set());
  
  // Load code from visualization data
  useEffect(() => {
    if (visualizationData?.metadata) {
      // In a real implementation, we'd get the actual source code
      // For now, use sample code
      const lines = sampleCode.split('\n');
      setCodeLines(lines);
    }
  }, [visualizationData]);
  
  // Update current line based on playback
  useEffect(() => {
    if (visualizationData && playbackState.currentFrame < visualizationData.execution.steps.length) {
      const currentStep = visualizationData.execution.steps[playbackState.currentFrame];
      if (currentStep) {
        const lineNum = currentStep.line_number;
        setCurrentLine(lineNum);
        
        // Mark as executed
        setExecutedLines(prev => {
          const newSet = new Set(prev);
          newSet.add(lineNum);
          return newSet;
        });
      }
    }
  }, [playbackState.currentFrame, visualizationData]);
  
  if (codeLines.length === 0) {
    return (
      <CodeContainer>
        <NoCodeMessage>
          📄 No code to display
        </NoCodeMessage>
      </CodeContainer>
    );
  }
  
  return (
    <CodeContainer>
      <CodeHeader>
        <span>📄</span>
        <FileName>input.py</FileName>
      </CodeHeader>
      
      {codeLines.map((line, index) => {
        const lineNumber = index + 1;
        const isActive = currentLine === lineNumber;
        const wasExecuted = executedLines.has(lineNumber);
        
        return (
          <CodeLine
            key={index}
            $active={isActive}
            $executed={wasExecuted}
          >
            <LineNumber>{lineNumber}</LineNumber>
            <LineContent>{line}</LineContent>
          </CodeLine>
        );
      })}
    </CodeContainer>
  );
};
