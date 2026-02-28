// VariableWatcher — Right-side drawer showing current variable state
// Updates in real time as you step through code

import React, { useMemo, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ChevronRight, ChevronDown, Search,
  Layers, ArrowRight, GitBranch,
} from 'lucide-react';
import { useAnimationStore } from '../stores/animationStore';

const flash = keyframes`
  0% { background: rgba(0,230,118,0.12); }
  100% { background: transparent; }
`;

/* Shell */
const Shell = styled.div<{ $open: boolean }>`
  width: ${p => p.$open ? '280px' : '0px'};
  min-width: ${p => p.$open ? '240px' : '0px'};
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4,0,0.2,1),
              min-width 0.3s cubic-bezier(0.4,0,0.2,1);
  border-left: ${p => p.$open ? '1px solid var(--glass-border)' : 'none'};
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
`;

const InnerContent = styled.div`
  min-width: 240px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

/* Header */
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  background: rgba(0,0,0,0.2);
`;
const HeaderTitle = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
`;

/* Sections */
const Section = styled.div`
  border-bottom: 1px solid var(--glass-border);
`;
const SectionHead = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 12px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  &:hover { background: rgba(255,255,255,0.02); color: var(--text-secondary); }
`;

const SectionBody = styled.div`
  padding: 0 0 4px;
`;

/* Variable rows */
const VarRow = styled.div<{ $isNew?: boolean; $changed?: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  padding: 3px 12px 3px 20px;
  font-size: 11.5px;
  transition: background 0.2s;
  ${p => p.$isNew && css`animation: ${flash} 1s ease-out;`}
  &:hover { background: rgba(255,255,255,0.015); }
`;

const VarName = styled.span<{ $changed?: boolean; $isNew?: boolean }>`
  font-family: var(--font-mono);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${p => p.$isNew ? 'var(--accent-green)' : p.$changed ? 'var(--accent-cyan)' : 'var(--text-primary)'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VarValue = styled.span<{ $changed?: boolean }>`
  font-family: var(--font-mono);
  color: ${p => p.$changed ? 'var(--accent-amber)' : 'var(--text-secondary)'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  max-width: 140px;
`;

const TypeBadge = styled.span`
  font-size: 9px;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(255,255,255,0.04);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  flex-shrink: 0;
`;

const ChangeIndicator = styled.span`
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
`;

/* Call stack */
const StackItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px 3px 20px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
`;
const StackLine = styled.span`
  color: var(--text-tertiary);
  font-size: 10px;
`;

/* Empty */
const Empty = styled.div`
  padding: 20px 12px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 11.5px;
`;

/* Helpers */
function inferType(v: any): string {
  if (v === null || v === undefined) return 'None';
  if (Array.isArray(v)) return 'list';
  if (typeof v === 'object') return 'dict';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'str';
  return typeof v;
}

function fmt(v: any, maxLen = 40): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'string') return `"${v.length > maxLen ? v.slice(0, maxLen - 3) + '...' : v}"`;
  if (Array.isArray(v)) {
    if (v.length > 6) return `[${v.slice(0, 5).map(x => fmt(x, 10)).join(', ')}, +${v.length - 5}]`;
    return `[${v.map(x => fmt(x, 10)).join(', ')}]`;
  }
  if (typeof v === 'object') {
    const e = Object.entries(v);
    if (e.length > 3) return `{${e.slice(0, 3).map(([k, val]) => `${k}: ${fmt(val, 8)}`).join(', ')}, ...}`;
    return `{${e.map(([k, val]) => `${k}: ${fmt(val, 8)}`).join(', ')}}`;
  }
  return String(v);
}

interface VariableWatcherProps {
  open: boolean;
  onToggle: () => void;
}

const VariableWatcher: React.FC<VariableWatcherProps> = ({ open, onToggle }) => {
  const { currentVariables, previousVariables, currentStep, debugState } = useAnimationStore();
  const [varsOpen, setVarsOpen] = useState(true);
  const [stackOpen, setStackOpen] = useState(true);

  const vars = useMemo(() => {
    const prev = previousVariables ?? {};
    return Object.entries(currentVariables ?? {})
      .filter(([n]) => !n.startsWith('__'))
      .map(([name, value]) => {
        const isNew = !(name in prev);
        const isChanged = !isNew && JSON.stringify(prev[name]) !== JSON.stringify(value);
        return { name, value, type: inferType(value), formatted: fmt(value), isNew, isChanged };
      })
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isChanged !== b.isChanged) return a.isChanged ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentVariables, previousVariables]);

  const callStack = currentStep?.callStack ?? [];

  return (
    <Shell $open={open}>
      <InnerContent>
        <Header>
          <HeaderTitle>Watch</HeaderTitle>
        </Header>

        {debugState === 'idle' || debugState === 'ready' ? (
          <Empty>Run code and step through to inspect variables</Empty>
        ) : (
          <>
            {/* Variables section */}
            <Section>
              <SectionHead onClick={() => setVarsOpen(v => !v)}>
                {varsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Eye size={11} />
                Variables ({vars.length})
              </SectionHead>
              {varsOpen && (
                <SectionBody>
                  {vars.length === 0 ? (
                    <Empty style={{ padding: '8px 12px' }}>No variables in scope</Empty>
                  ) : (
                    vars.map(v => (
                      <VarRow key={v.name} $isNew={v.isNew} $changed={v.isChanged}>
                        <VarName $changed={v.isChanged} $isNew={v.isNew}>
                          {v.isNew && <ChangeIndicator style={{ background: 'var(--accent-green)' }} />}
                          {v.isChanged && !v.isNew && <ChangeIndicator style={{ background: 'var(--accent-cyan)' }} />}
                          {v.name}
                          <TypeBadge>{v.type}</TypeBadge>
                        </VarName>
                        <VarValue $changed={v.isChanged} title={v.formatted}>{v.formatted}</VarValue>
                      </VarRow>
                    ))
                  )}
                </SectionBody>
              )}
            </Section>

            {/* Call Stack section */}
            {callStack.length > 0 && (
              <Section>
                <SectionHead onClick={() => setStackOpen(v => !v)}>
                  {stackOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <Layers size={11} />
                  Call Stack ({callStack.length})
                </SectionHead>
                {stackOpen && (
                  <SectionBody>
                    {callStack.map((frame, i) => (
                      <StackItem key={i}>
                        <GitBranch size={10} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                        {frame.function}
                        <StackLine>:{frame.line}</StackLine>
                      </StackItem>
                    ))}
                  </SectionBody>
                )}
              </Section>
            )}

            {/* Stdout */}
            {currentStep?.stdout && (
              <Section>
                <SectionHead>
                  <ArrowRight size={11} />
                  Output
                </SectionHead>
                <SectionBody>
                  <div style={{
                    padding: '4px 12px 4px 20px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {currentStep.stdout}
                  </div>
                </SectionBody>
              </Section>
            )}
          </>
        )}
      </InnerContent>
    </Shell>
  );
};

export default VariableWatcher;
