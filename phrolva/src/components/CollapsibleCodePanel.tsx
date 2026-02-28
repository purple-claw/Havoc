// CollapsibleCodePanel — Smart left sidebar with code editor & line tracing
// Collapsible to icon-only strip. Shows active line, executed lines, breakpoints feel.

import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, ChevronLeft, ChevronRight, Play, Loader2, Upload,
  FileCode, Copy, Check,
} from 'lucide-react';
import { useAnimationStore } from '../stores/animationStore';

const slideGlow = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

/* Shell */
const Shell = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${p => p.$collapsed ? '42px' : '380px'};
  min-width: ${p => p.$collapsed ? '42px' : '320px'};
  max-width: ${p => p.$collapsed ? '42px' : '460px'};
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid var(--glass-border);
  background: var(--bg-elevated);
  overflow: hidden;
  position: relative;
  z-index: 10;
`;

/* Collapsed icon strip */
const IconStrip = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12px;
  gap: 8px;
`;
const IconBtn = styled.button<{ $active?: boolean }>`
  width: 30px; height: 30px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: ${p => p.$active ? 'var(--accent-green)' : 'var(--text-tertiary)'};
  background: ${p => p.$active ? 'var(--accent-green-dim)' : 'transparent'};
  transition: all var(--transition-fast);
  &:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
`;

/* Expanded content */
const Content = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 320px;
`;

/* Header */
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.2);
  flex-shrink: 0;
`;
const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const FileName = styled.span`
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
`;
const LangBadge = styled.span`
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(0,230,118,0.1);
  color: var(--accent-green);
`;
const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;
const SmallBtn = styled.button<{ $accent?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  transition: all var(--transition-fast);

  ${p => p.$accent ? css`
    background: var(--accent-green);
    color: #000;
    &:hover { background: #00f080; }
    &:disabled { opacity: 0.5; cursor: wait; }
  ` : css`
    color: var(--text-tertiary);
    &:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
  `}
`;

/* Toggle button */
const ToggleBtn = styled.button`
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  width: 24px; height: 48px;
  border-radius: 0 8px 8px 0;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-left: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  z-index: 20;
  transition: all var(--transition-fast);
  &:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
`;

/* Code area */
const CodeArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  min-height: 0;
`;

const LineGutter = styled.div`
  padding: 10px 0;
  min-width: 48px;
  text-align: right;
  user-select: none;
  flex-shrink: 0;
  background: rgba(0,0,0,0.15);
  border-right: 1px solid var(--glass-border);
  overflow-y: hidden;
`;

const LineNumber = styled.div<{ $active?: boolean; $executed?: boolean; $hasBreakpoint?: boolean }>`
  padding: 0 8px 0 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  position: relative;

  color: ${p => p.$active ? 'var(--accent-green)' : p.$executed ? 'rgba(0,230,118,0.4)' : 'var(--text-tertiary)'};
  font-weight: ${p => p.$active ? '700' : '400'};

  ${p => p.$active && css`
    background: rgba(0,230,118,0.06);
    &::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: var(--accent-green);
    }
  `}

  ${p => p.$hasBreakpoint && css`
    &::after {
      content: '';
      position: absolute;
      left: 4px; top: 50%;
      transform: translateY(-50%);
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--accent-red);
    }
  `}
`;

const EditorTextArea = styled.textarea`
  flex: 1;
  padding: 10px 14px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  resize: none;
  tab-size: 4;
  white-space: pre;
  overflow-wrap: normal;
  &::placeholder { color: var(--text-tertiary); opacity: 0.35; }
`;

const ReadOnlyCode = styled.div`
  flex: 1;
  padding: 10px 14px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre;
`;

const CodeLine = styled.div<{ $active?: boolean; $executed?: boolean }>`
  ${p => p.$active && css`
    background: rgba(0,230,118,0.06);
    color: var(--text-primary);
    border-radius: 3px;
    margin: 0 -4px;
    padding: 0 4px;
  `}
`;

/* Footer */
const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border-top: 1px solid var(--glass-border);
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
`;

interface CollapsibleCodePanelProps {
  code: string;
  onChange: (code: string) => void;
  onRun: (code: string) => void;
  onUpload: () => void;
  isRunning: boolean;
  readOnly?: boolean;
}

const CollapsibleCodePanel: React.FC<CollapsibleCodePanelProps> = ({
  code, onChange, onRun, onUpload, isRunning, readOnly = false,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { currentLine, executedLines, debugState } = useAnimationStore();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  // Determine if we're in trace mode (viewing execution)
  const tracing = debugState !== 'idle' && debugState !== 'ready';

  const lines = useMemo(() => code.split('\n'), [code]);

  const syncScroll = useCallback(() => {
    if (taRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
    if (codeRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = codeRef.current.scrollTop;
    }
  }, []);

  // Auto-scroll to active line
  useEffect(() => {
    if (currentLine > 0 && codeRef.current) {
      const lineEl = codeRef.current.querySelector(`[data-line="${currentLine}"]`);
      if (lineEl) lineEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentLine]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = taRef.current!;
      const s = ta.selectionStart, end = ta.selectionEnd;
      const nv = code.slice(0, s) + '    ' + code.slice(end);
      onChange(nv);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(code); }
  }, [code, onChange, onRun]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <Shell $collapsed={collapsed}>
      <ToggleBtn onClick={() => setCollapsed(v => !v)}>
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </ToggleBtn>

      {collapsed ? (
        <IconStrip>
          <IconBtn onClick={() => setCollapsed(false)} $active title="Expand code panel">
            <Code2 size={16} />
          </IconBtn>
          <IconBtn onClick={onUpload} title="Upload code">
            <Upload size={14} />
          </IconBtn>
        </IconStrip>
      ) : (
        <Content>
          <Header>
            <HeaderLeft>
              <FileCode size={13} style={{ color: 'var(--accent-green)' }} />
              <FileName>script.py</FileName>
              <LangBadge>Python</LangBadge>
            </HeaderLeft>
            <HeaderActions>
              <SmallBtn onClick={handleCopy} title="Copy code">
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </SmallBtn>
              <SmallBtn onClick={onUpload} title="Upload file">
                <Upload size={11} />
              </SmallBtn>
              <SmallBtn
                $accent
                onClick={() => onRun(code)}
                disabled={isRunning}
              >
                {isRunning ? (
                  <><Loader2 size={11} style={{ animation: 'spin .8s linear infinite' }} /> Running</>
                ) : (
                  <><Play size={11} /> Run</>
                )}
              </SmallBtn>
            </HeaderActions>
          </Header>

          <CodeArea>
            <LineGutter ref={gutterRef}>
              {lines.map((_, i) => (
                <LineNumber
                  key={i}
                  $active={currentLine === i + 1 && tracing}
                  $executed={executedLines.has(i + 1) && tracing}
                >
                  {i + 1}
                </LineNumber>
              ))}
            </LineGutter>

            {tracing ? (
              <ReadOnlyCode ref={codeRef} onScroll={syncScroll}>
                {lines.map((line, i) => (
                  <CodeLine
                    key={i}
                    data-line={i + 1}
                    $active={currentLine === i + 1}
                    $executed={executedLines.has(i + 1)}
                  >
                    {line || ' '}
                  </CodeLine>
                ))}
              </ReadOnlyCode>
            ) : (
              <EditorTextArea
                ref={taRef}
                value={code}
                onChange={e => onChange(e.target.value)}
                onScroll={syncScroll}
                onKeyDown={handleKey}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                placeholder="# Paste or write your Python code here..."
              />
            )}
          </CodeArea>

          <Footer>
            <span>{lines.length} lines</span>
            {tracing && currentLine > 0 && <span>Line {currentLine}</span>}
            <span>{code.length.toLocaleString()} chars</span>
          </Footer>
        </Content>
      )}
    </Shell>
  );
};

export default CollapsibleCodePanel;
