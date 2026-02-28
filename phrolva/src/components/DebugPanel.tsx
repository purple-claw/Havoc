// DebugPanel — Resizable right sidebar with rich variable inspector,
// call stack, console output, and AI explanations in beautiful containers
// Dynamically populated from the animation store's step data

import React, { useState, useMemo, useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, ChevronRight, ChevronDown, Layers, ArrowRight,
  Braces, Hash, Type as TypeIcon, List, ToggleLeft, Box,
  Sparkles, BookOpen, Lightbulb, TrendingUp, Zap,
  GripVertical, Minimize2, Maximize2,
} from 'lucide-react';
import { useAnimationStore } from '../stores/animationStore';
import type { ExplanationData } from '../types/animation.types';

/* ─────────── animations ─────────── */
const flash = keyframes`
  0%   { background: rgba(0,230,118,0.15); }
  100% { background: transparent; }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(6px); }
  to   { opacity: 1; transform: translateX(0); }
`;

/* ─────────── outer shell ─────────── */
const Shell = styled.div<{ $w: number }>`
  width: ${p => p.$w}px;
  min-width: 260px;
  max-width: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-left: 1px solid var(--glass-border);
  height: 100%;
`;

const ScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 16px;
`;

/* ─────────── section container ─────────── */
const SectionWrap = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid var(--glass-border);
  }
`;

const SectionHeader = styled.button<{ $accent?: string }>`
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${p => p.$accent || 'var(--text-tertiary)'};
  background: rgba(0,0,0,0.15);
  transition: all var(--transition-fast);
  &:hover {
    background: rgba(255,255,255,0.02);
    color: var(--text-secondary);
  }
`;

const SectionBadge = styled.span<{ $c?: string }>`
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 100px;
  background: ${p => p.$c || 'rgba(255,255,255,0.05)'};
  color: var(--text-secondary);
  letter-spacing: 0;
  text-transform: none;
`;

const SectionBody = styled(motion.div)`
  padding: 6px 10px 10px;
`;

/* ─────────── variable cards ─────────── */
const VarCard = styled.div<{ $isNew?: boolean; $changed?: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: var(--bg-card);
  border: 1px solid ${p =>
    p.$isNew ? 'rgba(0,230,118,0.2)' :
    p.$changed ? 'rgba(24,255,255,0.15)' :
    'var(--glass-border)'
  };
  transition: all var(--transition-fast);
  animation: ${p => (p.$isNew || p.$changed) ? css`${slideIn} 0.25s ease-out` : 'none'};

  &:hover {
    background: var(--bg-card-hover);
    border-color: rgba(255,255,255,0.1);
  }
`;

const VarCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const VarName = styled.span<{ $c?: string }>`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: ${p => p.$c || 'var(--text-primary)'};
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VarTypePill = styled.span<{ $bg: string; $fg: string }>`
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${p => p.$bg};
  color: ${p => p.$fg};
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
  flex-shrink: 0;
  text-transform: uppercase;
`;

const VarValueBox = styled.div<{ $changed?: boolean }>`
  margin-top: 5px;
  padding: 5px 8px;
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.5;
  color: ${p => p.$changed ? 'var(--accent-amber)' : 'var(--text-secondary)'};
  background: rgba(0,0,0,0.25);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
  overflow-y: auto;
`;

const DiffBadge = styled.span<{ $type: 'new' | 'changed' }>`
  font-size: 8px;
  font-weight: 800;
  padding: 0 5px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  border-radius: 3px;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  background: ${p => p.$type === 'new' ? 'rgba(0,230,118,0.15)' : 'rgba(24,255,255,0.12)'};
  color: ${p => p.$type === 'new' ? 'var(--accent-green)' : 'var(--accent-cyan)'};
`;

/* Array value inline display */
const ArrayInline = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
`;
const ArrayItem = styled.span<{ $hl?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: ${p => p.$hl ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${p => p.$hl ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.06)'};
  color: ${p => p.$hl ? 'var(--accent-green)' : 'var(--text-secondary)'};
`;

/* ─────────── Call Stack list ─────────── */
const StackCard = styled.div<{ $top?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: ${p => p.$top ? 'rgba(0,230,118,0.05)' : 'var(--bg-card)'};
  border: 1px solid ${p => p.$top ? 'rgba(0,230,118,0.15)' : 'var(--glass-border)'};
`;
const StackFunc = styled.span`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const StackMeta = styled.span`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
`;
const StackBadge = styled.span<{ $top?: boolean }>`
  font-size: 8px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  background: ${p => p.$top ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.05)'};
  color: ${p => p.$top ? 'var(--accent-green)' : 'var(--text-tertiary)'};
  flex-shrink: 0;
`;

/* ─────────── Console output ─────────── */
const ConsoleBox = styled.pre`
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border);
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
`;

/* ─────────── AI Explanation ─────────── */
const ExplainHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
`;
const AlgoLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-green), var(--accent-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;
const ComplexBadge = styled.span<{ $kind: 'time' | 'space' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  background: ${p => p.$kind === 'time' ? 'rgba(0,230,118,0.08)' : 'rgba(24,255,255,0.08)'};
  color: ${p => p.$kind === 'time' ? 'var(--accent-green)' : 'var(--accent-cyan)'};
  border: 1px solid ${p => p.$kind === 'time' ? 'rgba(0,230,118,0.12)' : 'rgba(24,255,255,0.1)'};
`;
const ExplainOverview = styled.p`
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
`;
const ConceptTagWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
`;
const ConceptTag = styled.span`
  padding: 2px 9px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0,230,118,0.06);
  border: 1px solid rgba(0,230,118,0.12);
  color: var(--accent-green);
`;
const StepExCard = styled.div<{ $active?: boolean }>`
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  background: ${p => p.$active ? 'rgba(0,230,118,0.05)' : 'var(--bg-card)'};
  border: 1px solid ${p => p.$active ? 'rgba(0,230,118,0.18)' : 'var(--glass-border)'};
  transition: all var(--transition-fast);
  &:hover { background: rgba(0,230,118,0.03); }
`;
const StepExTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
`;
const StepExSub = styled.div`
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
`;
const StepExDetail = styled.div`
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--glass-border);
`;
const TipsList = styled.ul`
  margin: 5px 0 0;
  padding-left: 14px;
  font-size: 10.5px;
  color: var(--text-tertiary);
  line-height: 1.6;
`;
const FunFactBox = styled.div`
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0,230,118,0.04);
  border-left: 3px solid var(--accent-green);
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 4px;
`;
const PathRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 0;
`;
const PathNum = styled.span`
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; flex-shrink: 0;
  background: rgba(0,230,118,0.1);
  color: var(--accent-green);
`;

/* ─────────── Empty state ─────────── */
const EmptyBox = styled.div`
  padding: 28px 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.7;
`;
const EmptyIcon = styled.div`
  width: 40px; height: 40px;
  border-radius: 10px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  color: var(--text-tertiary);
`;

/* ─────────── helpers ─────────── */
type PyType = 'list' | 'dict' | 'int' | 'float' | 'str' | 'bool' | 'None' | 'tuple' | 'set' | 'object';

function inferType(v: any): PyType {
  if (v === null || v === undefined) return 'None';
  if (Array.isArray(v)) return 'list';
  if (typeof v === 'object') return 'dict';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'str';
  return 'object';
}

const TYPE_COLORS: Record<PyType, { bg: string; fg: string; icon: React.ReactNode }> = {
  list:   { bg: 'rgba(0,230,118,0.1)',    fg: '#00e676', icon: <List size={10} /> },
  dict:   { bg: 'rgba(255,215,64,0.1)',   fg: '#ffd740', icon: <Braces size={10} /> },
  int:    { bg: 'rgba(24,255,255,0.1)',    fg: '#18ffff', icon: <Hash size={10} /> },
  float:  { bg: 'rgba(24,255,255,0.1)',    fg: '#18ffff', icon: <Hash size={10} /> },
  str:    { bg: 'rgba(255,82,82,0.1)',     fg: '#ff5252', icon: <TypeIcon size={10} /> },
  bool:   { bg: 'rgba(156,39,176,0.12)',   fg: '#ce93d8', icon: <ToggleLeft size={10} /> },
  None:   { bg: 'rgba(255,255,255,0.04)',  fg: '#888',    icon: <Box size={10} /> },
  tuple:  { bg: 'rgba(0,230,118,0.08)',    fg: '#66bb6a', icon: <List size={10} /> },
  set:    { bg: 'rgba(255,152,0,0.1)',     fg: '#ffb74d', icon: <Braces size={10} /> },
  object: { bg: 'rgba(255,255,255,0.05)',  fg: '#bbb',    icon: <Box size={10} /> },
};

function fmtValue(v: any, maxLen = 60): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'string') return `"${v.length > maxLen ? v.slice(0, maxLen - 3) + '...' : v}"`;
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (v.length > 20) return `[${v.slice(0, 8).join(', ')}, ... +${v.length - 8} more]`;
    return `[${v.map(x => fmtValue(x, 10)).join(', ')}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v);
    if (entries.length === 0) return '{}';
    if (entries.length > 5) {
      return `{${entries.slice(0, 4).map(([k, val]) => `${k}: ${fmtValue(val, 8)}`).join(', ')}, ...}`;
    }
    return `{${entries.map(([k, val]) => `${k}: ${fmtValue(val, 10)}`).join(', ')}}`;
  }
  return String(v);
}

/* ─────────── section toggle hook ─────────── */
function useSection(initial: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(initial);
  return [open, () => setOpen(v => !v)];
}

/* ─────────── main component ─────────── */
interface DebugPanelProps {
  width: number;
  explanation?: ExplanationData | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ width, explanation }) => {
  const {
    currentVariables, previousVariables, currentStep,
    debugState, currentStepIndex, totalSteps,
  } = useAnimationStore();

  const [varsOpen, toggleVars] = useSection(true);
  const [stackOpen, toggleStack] = useSection(true);
  const [consoleOpen, toggleConsole] = useSection(true);
  const [aiOpen, toggleAI] = useSection(true);
  const [expandedStepEx, setExpandedStepEx] = useState<number | null>(null);

  /* ── Build variable list ── */
  const vars = useMemo(() => {
    const prev = previousVariables ?? {};
    return Object.entries(currentVariables ?? {})
      .filter(([n]) => !n.startsWith('__'))
      .map(([name, value]) => {
        const isNew = !(name in prev);
        const isChanged = !isNew && JSON.stringify(prev[name]) !== JSON.stringify(value);
        const type = inferType(value);
        return { name, value, type, formatted: fmtValue(value), isNew, isChanged };
      })
      .sort((a, b) => {
        if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
        if (a.isChanged !== b.isChanged) return a.isChanged ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentVariables, previousVariables]);

  const callStack = currentStep?.callStack ?? [];
  const stdout = currentStep?.stdout ?? '';

  const isActive = debugState !== 'idle' && debugState !== 'ready';

  /* AI — find current step explanation */
  const activeExIdx = useMemo(() => {
    if (!explanation?.step_explanations) return -1;
    return explanation.step_explanations.findIndex(se => {
      const [s, e] = se.step_range;
      return currentStepIndex >= s && currentStepIndex <= e;
    });
  }, [explanation, currentStepIndex]);

  /* Render variable value — special-case arrays */
  const renderValue = useCallback((v: any, changed: boolean) => {
    if (Array.isArray(v) && v.length <= 30 && v.every((x: any) => typeof x === 'number' || typeof x === 'string')) {
      return (
        <ArrayInline>
          {v.map((item: any, i: number) => (
            <ArrayItem key={i} $hl={false}>{typeof item === 'string' ? `"${item}"` : item}</ArrayItem>
          ))}
        </ArrayInline>
      );
    }
    return <VarValueBox $changed={changed}>{fmtValue(v)}</VarValueBox>;
  }, []);

  return (
    <Shell $w={width}>
      <ScrollArea>
        {/* ── Empty state ── */}
        {!isActive && (
          <EmptyBox>
            <EmptyIcon><Eye size={18} /></EmptyIcon>
            Run your code and step through<br />
            to inspect variables, calls & output
          </EmptyBox>
        )}

        {/* ══════════ VARIABLES ══════════ */}
        {isActive && (
          <SectionWrap>
            <SectionHeader onClick={toggleVars} $accent="var(--accent-cyan)">
              {varsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Eye size={11} />
              Variables
              <SectionBadge $c="rgba(24,255,255,0.1)">{vars.length}</SectionBadge>
            </SectionHeader>
            <AnimatePresence initial={false}>
              {varsOpen && (
                <SectionBody
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                >
                  {vars.length === 0 ? (
                    <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>
                      No variables in scope
                    </div>
                  ) : (
                    vars.map(v => {
                      const tc = TYPE_COLORS[v.type] || TYPE_COLORS.object;
                      return (
                        <VarCard key={v.name} $isNew={v.isNew} $changed={v.isChanged}>
                          <VarCardTop>
                            <VarName $c={v.isNew ? 'var(--accent-green)' : v.isChanged ? 'var(--accent-cyan)' : undefined}>
                              {tc.icon}
                              {v.name}
                              {v.isNew && <DiffBadge $type="new">NEW</DiffBadge>}
                              {v.isChanged && !v.isNew && <DiffBadge $type="changed">MOD</DiffBadge>}
                            </VarName>
                            <VarTypePill $bg={tc.bg} $fg={tc.fg}>{v.type}</VarTypePill>
                          </VarCardTop>
                          {renderValue(v.value, v.isChanged)}
                        </VarCard>
                      );
                    })
                  )}
                </SectionBody>
              )}
            </AnimatePresence>
          </SectionWrap>
        )}

        {/* ══════════ CALL STACK ══════════ */}
        {isActive && callStack.length > 0 && (
          <SectionWrap>
            <SectionHeader onClick={toggleStack} $accent="var(--accent-amber)">
              {stackOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Layers size={11} />
              Call Stack
              <SectionBadge $c="rgba(255,215,64,0.1)">{callStack.length}</SectionBadge>
            </SectionHeader>
            <AnimatePresence initial={false}>
              {stackOpen && (
                <SectionBody
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                >
                  {callStack.map((frame, i) => (
                    <StackCard key={i} $top={i === 0}>
                      <StackBadge $top={i === 0}>{i === 0 ? 'TOP' : `#${i}`}</StackBadge>
                      <StackFunc>{frame.function || '<module>'}</StackFunc>
                      <StackMeta>line {frame.line}</StackMeta>
                    </StackCard>
                  ))}
                </SectionBody>
              )}
            </AnimatePresence>
          </SectionWrap>
        )}

        {/* ══════════ CONSOLE OUTPUT ══════════ */}
        {isActive && stdout.length > 0 && (
          <SectionWrap>
            <SectionHeader onClick={toggleConsole}>
              {consoleOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <ArrowRight size={11} />
              Console Output
            </SectionHeader>
            <AnimatePresence initial={false}>
              {consoleOpen && (
                <SectionBody
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                >
                  <ConsoleBox>{stdout}</ConsoleBox>
                </SectionBody>
              )}
            </AnimatePresence>
          </SectionWrap>
        )}

        {/* ══════════ AI EXPLANATIONS ══════════ */}
        {explanation && (
          <SectionWrap>
            <SectionHeader onClick={toggleAI} $accent="var(--accent-green)">
              {aiOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Sparkles size={11} />
              AI Explanation
            </SectionHeader>
            <AnimatePresence initial={false}>
              {aiOpen && (
                <SectionBody
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                >
                  {/* Algorithm name + complexity badges */}
                  <ExplainHeader>
                    <AlgoLabel>{explanation.algorithm_name || 'Analysis'}</AlgoLabel>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {explanation.time_complexity && (
                        <ComplexBadge $kind="time"><TrendingUp size={9} /> {explanation.time_complexity}</ComplexBadge>
                      )}
                      {explanation.space_complexity && (
                        <ComplexBadge $kind="space"><Zap size={9} /> {explanation.space_complexity}</ComplexBadge>
                      )}
                    </div>
                  </ExplainHeader>

                  {/* Overview */}
                  {explanation.overview && <ExplainOverview>{explanation.overview}</ExplainOverview>}

                  {/* Key concepts */}
                  {explanation.key_concepts && explanation.key_concepts.length > 0 && (
                    <ConceptTagWrap>
                      {explanation.key_concepts.map((c, i) => <ConceptTag key={i}>{c}</ConceptTag>)}
                    </ConceptTagWrap>
                  )}

                  {/* Step explanations */}
                  {explanation.step_explanations && explanation.step_explanations.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <BookOpen size={10} /> Step-by-Step
                      </div>
                      {explanation.step_explanations.map((step, i) => {
                        const isAct = i === activeExIdx;
                        const isOpen = expandedStepEx === i || isAct;
                        return (
                          <StepExCard key={i} $active={isAct} onClick={() => setExpandedStepEx(isOpen && !isAct ? null : i)}>
                            <StepExTitle>
                              {isAct && <Lightbulb size={10} style={{ marginRight: 4, color: 'var(--accent-green)' }} />}
                              {step.title}
                            </StepExTitle>
                            <StepExSub>{step.summary}</StepExSub>
                            {isOpen && (
                              <>
                                <StepExDetail>{step.detail}</StepExDetail>
                                {step.analogy && (
                                  <StepExDetail style={{ fontStyle: 'italic', color: 'var(--accent-green)' }}>
                                    Analogy: {step.analogy}
                                  </StepExDetail>
                                )}
                                {step.tips && step.tips.length > 0 && (
                                  <TipsList>{step.tips.map((t, j) => <li key={j}>{t}</li>)}</TipsList>
                                )}
                              </>
                            )}
                          </StepExCard>
                        );
                      })}
                    </div>
                  )}

                  {/* Fun fact */}
                  {explanation.fun_fact && <FunFactBox>{explanation.fun_fact}</FunFactBox>}

                  {/* Learning path */}
                  {explanation.learning_path && explanation.learning_path.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6,
                      }}>
                        What to Learn Next
                      </div>
                      {explanation.learning_path.map((item, i) => (
                        <PathRow key={i}><PathNum>{i + 1}</PathNum>{item}</PathRow>
                      ))}
                    </div>
                  )}
                </SectionBody>
              )}
            </AnimatePresence>
          </SectionWrap>
        )}

        {/* ── Step info footer ── */}
        {isActive && (
          <div style={{
            padding: '10px 14px',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Step {Math.max(0, currentStepIndex + 1)} / {totalSteps}</span>
            {currentStep && <span>Line {currentStep.line}</span>}
          </div>
        )}
      </ScrollArea>
    </Shell>
  );
};

export default DebugPanel;
