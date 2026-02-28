// AnimatedGeneric — fallback visualization for any code
// Shows variable state timeline, control flow, and function calls as a dashboard

import React, { useState, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  min-height: 400px;
`;

const Section = styled.div`
  background: #1a1a2e;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #2a2a4e;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0.75rem;
`;

const VariablesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
`;

const VarCard = styled(animated.div)<{ $isNew?: boolean; $isChanged?: boolean }>`
  padding: 0.6rem 0.8rem;
  background: #0d0d1a;
  border-radius: 6px;
  border: 1px solid ${({ $isNew, $isChanged }) =>
    $isNew ? '#43e97b' : $isChanged ? '#4facfe' : '#333'};
  transition: border-color 0.3s;
`;

const VarName = styled.div`
  font-size: 0.75rem;
  color: #4facfe;
  font-weight: bold;
  margin-bottom: 2px;
`;

const VarValue = styled.div`
  font-size: 0.9rem;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
  max-height: 60px;
  overflow: hidden;
`;

const VarType = styled.span`
  font-size: 0.65rem;
  color: #666;
  margin-left: 4px;
`;

const Timeline = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  align-items: center;
`;

const TimelineEvent = styled.div<{ $type: string; $isCurrent?: boolean }>`
  width: ${({ $isCurrent }) => ($isCurrent ? '10px' : '6px')};
  height: ${({ $isCurrent }) => ($isCurrent ? '10px' : '6px')};
  border-radius: 50%;
  background: ${({ $type }) => {
    switch ($type) {
      case 'function_call': return '#667eea';
      case 'function_return': return '#764ba2';
      case 'condition': return '#fa709a';
      case 'loop': return '#4facfe';
      case 'assignment': return '#43e97b';
      default: return '#555';
    }
  }};
  ${({ $isCurrent }) =>
    $isCurrent ? 'box-shadow: 0 0 8px currentColor;' : ''}
`;

const ConsoleOutput = styled.div`
  background: #0d0d1a;
  border-radius: 6px;
  padding: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #43e97b;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const CallStackItem = styled.div<{ $depth: number }>`
  padding: 0.3rem 0.5rem;
  padding-left: ${({ $depth }) => $depth * 16 + 8}px;
  font-size: 0.8rem;
  color: ${({ $depth }) => ($depth === 0 ? '#667eea' : '#888')};
  border-left: 2px solid ${({ $depth }) => ($depth === 0 ? '#667eea' : '#333')};
`;

const Legend = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.7rem;
  color: #666;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

interface GenericState {
  variables: Record<string, { value: any; type: string; isNew: boolean; isChanged: boolean }>;
  callStack: Array<{ function: string; line: number }>;
  stdout: string;
  events: Array<{ type: string; line: number }>;
  currentLine: number;
}

interface AnimatedGenericProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedGeneric: React.FC<AnimatedGenericProps> = ({ commands, currentFrame, speed }) => {
  const [state, setState] = useState<GenericState>({
    variables: {},
    callStack: [],
    stdout: '',
    events: [],
    currentLine: 0,
  });

  useEffect(() => {
    const vars: Record<string, { value: any; type: string; isNew: boolean; isChanged: boolean }> = {};
    const stack: Array<{ function: string; line: number }> = [];
    let output = '';
    const events: Array<{ type: string; line: number }> = [];
    let line = 0;
    const prevVarValues: Record<string, any> = {};

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const meta = cmd.metadata || {};
      const target = String(cmd.target ?? '');

      // Reset change flags
      Object.values(vars).forEach((v) => {
        v.isNew = false;
        v.isChanged = false;
      });

      if (cmdType === 'SET_VALUE' || cmdType === 'CREATE') {
        const varName = target || meta.name || `var_${i}`;
        const isExisting = varName in vars;
        const valueStr = JSON.stringify(cmd.value);
        const typeStr = typeof cmd.value;

        vars[varName] = {
          value: cmd.value,
          type: typeStr,
          isNew: !isExisting,
          isChanged: isExisting && prevVarValues[varName] !== valueStr,
        };
        prevVarValues[varName] = valueStr;
        events.push({ type: 'assignment', line: meta.line || line });
      } else if (cmdType === 'DELETE') {
        delete vars[target];
      } else if (cmdType === 'HIGHLIGHT') {
        line = meta.line || line;
        events.push({ type: meta.event_type || 'highlight', line });
      } else if (cmdType === 'VISIT') {
        events.push({ type: meta.event_type || 'visit', line: meta.line || line });
      } else if (cmdType === 'PUSH') {
        // Function call
        stack.push({ function: target || 'anonymous', line: meta.line || line });
        events.push({ type: 'function_call', line: meta.line || line });
      } else if (cmdType === 'POP') {
        // Function return
        stack.pop();
        events.push({ type: 'function_return', line: meta.line || line });
      } else if (cmdType === 'LABEL') {
        // Console output
        if (meta.stdout) output += meta.stdout;
        else if (cmd.value) output += String(cmd.value) + '\n';
      }

      if (meta.line) line = meta.line;
    }

    setState({
      variables: vars,
      callStack: stack,
      stdout: output,
      events,
      currentLine: line,
    });
  }, [commands, currentFrame]);

  const varEntries = Object.entries(state.variables);

  return (
    <Container>
      {/* Variables */}
      <Section>
        <SectionTitle>Variables ({varEntries.length})</SectionTitle>
        <VariablesGrid>
          {varEntries.map(([name, info]) => (
            <VarCard key={name} $isNew={info.isNew} $isChanged={info.isChanged}>
              <VarName>
                {name}
                <VarType>{info.type}</VarType>
              </VarName>
              <VarValue>{JSON.stringify(info.value)}</VarValue>
            </VarCard>
          ))}
          {varEntries.length === 0 && (
            <span style={{ color: '#666', fontStyle: 'italic' }}>No variables yet</span>
          )}
        </VariablesGrid>
      </Section>

      {/* Execution Timeline */}
      <Section>
        <SectionTitle>Execution Timeline</SectionTitle>
        <Timeline>
          {state.events.map((evt, i) => (
            <TimelineEvent
              key={i}
              $type={evt.type}
              $isCurrent={i === state.events.length - 1}
              title={`${evt.type} at line ${evt.line}`}
            />
          ))}
          {state.events.length === 0 && (
            <span style={{ color: '#666', fontSize: '0.8rem' }}>No events yet</span>
          )}
        </Timeline>
        <Legend style={{ marginTop: '0.5rem' }}>
          <LegendItem><LegendDot $color="#43e97b" /> Assignment</LegendItem>
          <LegendItem><LegendDot $color="#667eea" /> Function Call</LegendItem>
          <LegendItem><LegendDot $color="#764ba2" /> Return</LegendItem>
          <LegendItem><LegendDot $color="#fa709a" /> Condition</LegendItem>
          <LegendItem><LegendDot $color="#4facfe" /> Loop</LegendItem>
        </Legend>
      </Section>

      {/* Call Stack */}
      {state.callStack.length > 0 && (
        <Section>
          <SectionTitle>Call Stack ({state.callStack.length})</SectionTitle>
          {state.callStack.map((frame, i) => (
            <CallStackItem key={i} $depth={i}>
              {frame.function}() — line {frame.line}
            </CallStackItem>
          ))}
        </Section>
      )}

      {/* Console Output */}
      {state.stdout && (
        <Section>
          <SectionTitle>Console Output</SectionTitle>
          <ConsoleOutput>{state.stdout || 'No output'}</ConsoleOutput>
        </Section>
      )}

      <div style={{ color: '#666', fontSize: '0.75rem', textAlign: 'center' }}>
        Line {state.currentLine} • Frame {currentFrame + 1}/{commands.length}
      </div>
    </Container>
  );
};

export default AnimatedGeneric;
