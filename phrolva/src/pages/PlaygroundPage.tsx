import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, LayoutGrid, AlertTriangle, X, Share2, Terminal,
  Eye, EyeOff, Upload, Keyboard,
} from 'lucide-react';
import CollapsibleCodePanel from '../components/CollapsibleCodePanel';
import DebuggerToolbar from '../components/DebuggerToolbar';
import DebugPanel from '../components/DebugPanel';
import ResizeHandle from '../components/ResizeHandle';
import CodeUploadOverlay from '../components/CodeUploadOverlay';
import { AnimationOrchestrator } from '../components/AnimationOrchestrator';
import { useAnimationStore } from '../stores/animationStore';
import { api } from '../services/api';
import type { VisualizationData } from '../types/animation.types';

/* ───── keyframes ───── */
const pulseRing = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(0,230,118,0.25)}50%{box-shadow:0 0 0 6px rgba(0,230,118,0)}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

/* ───── layout — full-height IDE-like shell ───── */
const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  overflow: hidden;
`;

/* ── thin top nav ── */
const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 40px;
  flex-shrink: 0;
  background: rgba(5,5,5,0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 50;
`;
const LogoWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;
const LogoIcon = styled.div`
  width: 20px; height: 20px;
  border-radius: 5px;
  font-size: 9px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent-green), #009688);
  color: #000;
`;
const LogoText = styled.span`
  font-size: 13px; font-weight: 700; letter-spacing: .5px;
`;
const NavGroup = styled.div`
  display: flex; align-items: center; gap: 4px;
`;
const NavBtn = styled.button<{ $accent?: boolean }>`
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all var(--transition-fast);
  &:hover { color: var(--text-primary); background: var(--glass); }
  ${p => p.$accent && css`
    background: var(--accent-green); color: #000; font-weight: 600;
    &:hover { background: #00c866; color: #000; }
  `}
`;

/* ── error banner ── */
const ErrorBanner = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  gap: 12px;
  flex-shrink: 0;
  background: rgba(255,82,82,0.07);
  border-bottom: 1px solid rgba(255,82,82,0.12);
`;
const ErrText = styled.span`
  font-size: 12px;
  color: var(--accent-red);
  display: flex;
  align-items: center;
  gap: 6px;
`;
const Dismiss = styled.button`
  color: var(--accent-red);
  opacity: 0.6;
  &:hover { opacity: 1; }
`;

/* ── main area: code panel | canvas | watcher ── */
const WorkArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

/* ── canvas center ── */
const CanvasColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const CanvasArea = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
`;

/* ── empty state ── */
const EmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  animation: ${fadeUp} 0.5s ease-out;
`;

const EmptyIcon = styled.div`
  width: 64px; height: 64px;
  border-radius: var(--radius-xl);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-green);
  opacity: 0.4;
`;

const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
`;

const EmptySub = styled.div`
  font-size: 12.5px;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.7;
`;

const EmptyHint = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
`;

const Kbd = styled.kbd`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 600;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
`;

/* ── status bar ── */
const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 16px;
  flex-shrink: 0;
  background: rgba(5,5,5,0.9);
  border-top: 1px solid var(--glass-border);
  font-size: 10px;
  color: var(--text-tertiary);
`;
const StatusLeft = styled.div`
  display: flex; align-items: center; gap: 8px;
`;
const StatusDot = styled.span<{ $c: string }>`
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: ${p => p.$c};
  animation: ${p => p.$c === 'var(--accent-green)' ? pulseRing : 'none'} 2s ease-in-out infinite;
`;

/* ── default code ── */
const DEFAULT_CODE = `# Bubble Sort — a classic to get started!
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

result = bubble_sort([64, 34, 25, 12, 22, 11, 90])
print(result)
`;

interface PlaygroundPageProps {
  onNavigate: (p: string) => void;
  initialCode?: string;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ onNavigate, initialCode }) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(340);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { loadVisualization, debugState, stepForward, stepBackward } = useAnimationStore();

  /* Keyboard shortcuts for stepping */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && e.altKey) { e.preventDefault(); stepForward(); }
      if (e.key === 'ArrowLeft' && e.altKey) { e.preventDefault(); stepBackward(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepForward, stepBackward]);

  const handleRun = useCallback(async (src: string) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.execute(src, { explain: true });
      if (!res.success) { setError(res.error || 'Execution failed'); return; }
      const data: VisualizationData = {
        metadata: res.metadata,
        execution: res.execution,
        animations: res.animations,
        visualizer_config: res.visualizer_config,
        explanations: res.explanations,
        source_code: src,
      };
      setVizData(data);
      loadVisualization(data);
    } catch (err: any) {
      setError(
        err.message?.includes('fetch')
          ? 'Cannot reach the HAVOC API — start the backend with: python havoc.py serve'
          : err.message || 'Unknown error'
      );
    } finally {
      setIsRunning(false);
    }
  }, [loadVisualization]);

  const handleUploadLoad = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const hasViz = !!vizData;
  const stateColor = isRunning
    ? 'var(--accent-amber)'
    : hasViz ? 'var(--accent-green)' : 'var(--text-tertiary)';

  return (
    <Page>
      {/* ── Thin nav ── */}
      <Nav>
        <LogoWrap onClick={() => onNavigate('/')}>
          <LogoIcon>H</LogoIcon>
          <LogoText>HAVOC</LogoText>
        </LogoWrap>
        <NavGroup>
          <NavBtn onClick={() => onNavigate('/')}>
            <Home size={12} /> Home
          </NavBtn>
          <NavBtn onClick={() => onNavigate('/gallery')}>
            <LayoutGrid size={12} /> Gallery
          </NavBtn>
          <NavBtn onClick={() => setUploadOpen(true)}>
            <Upload size={11} /> Upload
          </NavBtn>
          <NavBtn onClick={() => setPanelOpen(v => !v)} title="Toggle debug panel">
            {panelOpen ? <EyeOff size={11} /> : <Eye size={11} />}
          </NavBtn>
          {hasViz && (
            <NavBtn $accent>
              <Share2 size={11} /> Share
            </NavBtn>
          )}
        </NavGroup>
      </Nav>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <ErrorBanner
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <ErrText><AlertTriangle size={13} />{error}</ErrText>
            <Dismiss onClick={() => setError(null)}><X size={14} /></Dismiss>
          </ErrorBanner>
        )}
      </AnimatePresence>

      {/* ── Main work area: Code | Canvas | Watcher ── */}
      <WorkArea>
        {/* Left: collapsible code panel */}
        <CollapsibleCodePanel
          code={code}
          onChange={setCode}
          onRun={handleRun}
          onUpload={() => setUploadOpen(true)}
          isRunning={isRunning}
        />

        {/* Center: animation canvas + debugger toolbar */}
        <CanvasColumn>
          <CanvasArea>
            {hasViz ? (
              <AnimationOrchestrator visualizationData={vizData!} loadFromFile={false} />
            ) : (
              <EmptyState>
                <EmptyIcon><Terminal size={24} /></EmptyIcon>
                <EmptyTitle>Write code & hit Run</EmptyTitle>
                <EmptySub>
                  The animation canvas will appear here.<br />
                  Step through each line and watch your data structures come alive.
                </EmptySub>
                <EmptyHint>
                  <Keyboard size={11} /> <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to run
                  &nbsp;&middot;&nbsp;
                  <Kbd>Alt</Kbd> + <Kbd>&larr;</Kbd> <Kbd>&rarr;</Kbd> to step
                </EmptyHint>
              </EmptyState>
            )}
          </CanvasArea>

          {/* Debugger toolbar always present at bottom */}
          <DebuggerToolbar />
        </CanvasColumn>

        {/* Right: resizable debug panel */}
        {panelOpen && (
          <>
            <ResizeHandle onResize={(delta) => setPanelWidth(w => Math.max(260, Math.min(600, w - delta)))} />
            <DebugPanel width={panelWidth} explanation={vizData?.explanations} />
          </>
        )}
      </WorkArea>

      {/* ── Status bar ── */}
      <StatusBar>
        <StatusLeft>
          <StatusDot $c={stateColor} />
          {isRunning ? 'Executing...' : hasViz ? `Ready — ${vizData!.execution.total_steps} steps` : 'Idle'}
        </StatusLeft>
        <div>
          {hasViz && (
            <>
              {vizData!.animations.total_commands} animations &middot;{' '}
              {(vizData!.animations.duration_ms / 1000).toFixed(1)}s
            </>
          )}
        </div>
      </StatusBar>

      {/* ── Upload modal ── */}
      <CodeUploadOverlay
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onLoad={handleUploadLoad}
      />
    </Page>
  );
};

export default PlaygroundPage;
