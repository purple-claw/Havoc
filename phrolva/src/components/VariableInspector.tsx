// VariableInspector — Shows variable state at each execution step
// Displays a live table of all variables with change tracking

import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ExecutionStep } from '../types/animation.types';

const Panel = styled.div`
  background: #12122a;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.span`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #666;
  font-weight: 600;
`;

const StepBadge = styled.span`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;
  font-family: 'JetBrains Mono', monospace;
`;

const Body = styled.div`
  max-height: 350px;
  overflow-y: auto;
`;

const VarRow = styled.div<{ $changed?: boolean; $new?: boolean }>`
  display: grid;
  grid-template-columns: 100px 60px 1fr;
  gap: 8px;
  padding: 6px 16px;
  font-size: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  background: ${({ $new }) => ($new ? 'rgba(67, 233, 123, 0.04)' : 'transparent')};
  transition: background 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const VarName = styled.span<{ $changed?: boolean; $new?: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  color: ${({ $new, $changed }) =>
    $new ? '#43e97b' : $changed ? '#4facfe' : 'rgba(255,255,255,0.8)'};
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VarType = styled.span`
  color: rgba(255, 255, 255, 0.3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
`;

const VarValue = styled.span<{ $changed?: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  color: ${({ $changed }) => ($changed ? '#f093fb' : 'rgba(255,255,255,0.7)')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: #444;
  font-size: 12px;
`;

const ChangeIndicator = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
`;

interface VariableInspectorProps {
  currentStep?: ExecutionStep | null;
  previousStep?: ExecutionStep | null;
}

function inferType(value: any): string {
  if (value === null || value === undefined) return 'None';
  if (Array.isArray(value)) return 'list';
  if (typeof value === 'object') return 'dict';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'string') return 'str';
  return typeof value;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'string') return `"${value}"`;
  if (Array.isArray(value)) {
    if (value.length > 8) {
      return `[${value.slice(0, 6).map(formatValue).join(', ')}, ... +${value.length - 6}]`;
    }
    return `[${value.map(formatValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 5) {
      return `{${entries.slice(0, 4).map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}, ...}`;
    }
    return `{${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}}`;
  }
  return String(value);
}

const VariableInspector: React.FC<VariableInspectorProps> = ({
  currentStep,
  previousStep,
}) => {
  const variables = useMemo(() => {
    if (!currentStep) return [];

    const prevVars = previousStep?.variables || {};
    const entries = Object.entries(currentStep.variables || {});

    return entries
      .filter(([name]) => !name.startsWith('__'))
      .map(([name, value]) => {
        const prevValue = prevVars[name];
        const isNew = !(name in prevVars);
        const isChanged = !isNew && JSON.stringify(prevValue) !== JSON.stringify(value);

        return {
          name,
          value,
          type: inferType(value),
          formatted: formatValue(value),
          isNew,
          isChanged,
        };
      })
      .sort((a, b) => {
        // New vars first, then changed, then stable
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isChanged !== b.isChanged) return a.isChanged ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentStep, previousStep]);

  return (
    <Panel>
      <Header>
        <Title>Variables</Title>
        {currentStep && (
          <StepBadge>
            Line {currentStep.line || currentStep.line_number}
          </StepBadge>
        )}
      </Header>

      <Body>
        {variables.length === 0 ? (
          <EmptyState>No variables in scope</EmptyState>
        ) : (
          variables.map((v) => (
            <VarRow key={v.name} $changed={v.isChanged} $new={v.isNew}>
              <VarName $changed={v.isChanged} $new={v.isNew}>
                {v.isNew && <ChangeIndicator style={{ background: '#43e97b' }} />}
                {v.isChanged && !v.isNew && <ChangeIndicator style={{ background: '#4facfe' }} />}
                {v.name}
              </VarName>
              <VarType>{v.type}</VarType>
              <VarValue $changed={v.isChanged} title={v.formatted}>
                {v.formatted}
              </VarValue>
            </VarRow>
          ))
        )}
      </Body>
    </Panel>
  );
};

export default VariableInspector;
