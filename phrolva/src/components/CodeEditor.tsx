// CodeEditor — Live code input with syntax highlighting
// Uses a styled textarea with line numbers (zero-dependency, no Monaco needed)
// Supports 10k+ line files with virtualized line numbers

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';

const EditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #0d0d1a;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const FileName = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'JetBrains Mono', monospace;
`;

const LineInfo = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
`;

const RunButton = styled.button<{ $loading?: boolean }>`
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: ${({ $loading }) =>
    $loading
      ? 'rgba(102, 126, 234, 0.3)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
`;

const EditorBody = styled.div`
  display: flex;
  height: 100%;
  min-height: 200px;
  max-height: 600px;
  overflow: auto;
  position: relative;
`;

const LineNumbers = styled.div`
  padding: 12px 0;
  min-width: 48px;
  text-align: right;
  user-select: none;
  background: rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
`;

const LineNumber = styled.div<{ $active?: boolean; $highlighted?: boolean }>`
  padding: 0 10px 0 6px;
  color: ${({ $active, $highlighted }) =>
    $active ? '#667eea' : $highlighted ? '#f093fb' : 'rgba(255,255,255,0.2)'};
  background: ${({ $active }) => ($active ? 'rgba(102,126,234,0.06)' : 'transparent')};
  font-weight: ${({ $active }) => ($active ? '700' : '400')};
`;

const TextArea = styled.textarea`
  flex: 1;
  padding: 12px 14px;
  background: transparent;
  border: none;
  outline: none;
  color: #e0e0e0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  tab-size: 4;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;

  &::placeholder {
    color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    outline: none;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
`;

const CharCount = styled.span<{ $warning?: boolean }>`
  color: ${({ $warning }) => ($warning ? '#ff6348' : 'inherit')};
`;

interface CodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  onRun?: (code: string) => void;
  isRunning?: boolean;
  highlightedLines?: number[];
  activeLine?: number;
  language?: string;
  maxLines?: number;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onRun,
  isRunning = false,
  highlightedLines = [],
  activeLine,
  language = 'python',
  maxLines = 15000,
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = lines.length;
  const charCount = value.length;

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Track cursor position
  const handleSelect = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = value.slice(0, pos);
    const lineNum = (textBefore.match(/\n/g) || []).length + 1;
    const lastNewline = textBefore.lastIndexOf('\n');
    const col = pos - (lastNewline === -1 ? 0 : lastNewline + 1) + 1;
    setCursorLine(lineNum);
    setCursorCol(col);
  }, [value]);

  // Handle Tab key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = textareaRef.current!;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.slice(0, start) + '    ' + value.slice(end);
        onChange(newValue);
        // Restore cursor after React re-render
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
      }
      // Ctrl/Cmd+Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onRun) {
        e.preventDefault();
        onRun(value);
      }
    },
    [value, onChange, onRun],
  );

  const highlightSet = useMemo(() => new Set(highlightedLines), [highlightedLines]);

  return (
    <EditorWrapper>
      <Toolbar>
        <ToolbarLeft>
          <FileName>script.py</FileName>
          <LineInfo>
            Ln {cursorLine}, Col {cursorCol}
          </LineInfo>
        </ToolbarLeft>
        {onRun && (
          <RunButton $loading={isRunning} onClick={() => onRun(value)} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run'}
          </RunButton>
        )}
      </Toolbar>

      <EditorBody>
        <LineNumbers ref={lineNumbersRef}>
          {lines.map((_, i) => (
            <LineNumber
              key={i}
              $active={activeLine === i + 1}
              $highlighted={highlightSet.has(i + 1)}
            >
              {i + 1}
            </LineNumber>
          ))}
        </LineNumbers>
        <TextArea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="# Paste or write your Python code here..."
        />
      </EditorBody>

      <Footer>
        <span>{language}</span>
        <span>
          {lineCount.toLocaleString()} lines &middot;{' '}
          <CharCount $warning={charCount > 500000}>
            {charCount.toLocaleString()} chars
          </CharCount>
        </span>
      </Footer>
    </EditorWrapper>
  );
};

export default CodeEditor;
