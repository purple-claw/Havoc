// DebuggerToolbar — VS Code-style debug controls
// Fixed bar at the bottom of the animation canvas
// Step forward/backward, play/pause, speed, progress scrubber

import React, { useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  StepForward, StepBack, Square, Zap, ChevronFirst, ChevronLast,
} from 'lucide-react';
import { useAnimationStore, DebugState } from '../stores/animationStore';

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,118,0.15); }
  50% { box-shadow: 0 0 12px 2px rgba(0,230,118,0.08); }
`;

const Bar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--glass-border);
  user-select: none;
`;

/* Progress scrubber */
const ScrubberWrap = styled.div`
  position: relative;
  height: 20px;
  padding: 7px 16px;
  cursor: pointer;
  &:hover > div:first-child { height: 5px; }
`;
const ScrubberTrack = styled.div`
  position: relative;
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.06);
  transition: height 0.15s ease;
  overflow: visible;
`;
const ScrubberFill = styled.div<{ $pct: number }>`
  position: absolute;
  left: 0; top: 0; height: 100%;
  width: ${p => p.$pct}%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));
  transition: width 0.15s ease;
`;
const ScrubberThumb = styled.div<{ $pct: number }>`
  position: absolute;
  top: 50%;
  left: ${p => p.$pct}%;
  transform: translate(-50%, -50%);
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--accent-green);
  border: 2px solid #0a0a0a;
  opacity: 0;
  transition: opacity 0.15s;
  ${ScrubberWrap}:hover & { opacity: 1; }
`;

/* Control row */
const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px 8px;
  gap: 12px;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean; $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all var(--transition-fast);

  ${p => p.$primary ? css`
    width: 36px; height: 36px;
    background: var(--accent-green);
    color: #000;
    animation: ${pulseGlow} 3s ease infinite;
    &:hover:not(:disabled) { background: #00f080; transform: scale(1.05); }
  ` : css`
    width: 30px; height: 30px;
    background: transparent;
    color: var(--text-secondary);
    &:hover:not(:disabled) { background: rgba(255,255,255,0.06); color: var(--text-primary); }
  `}

  ${p => p.$danger && css`
    &:hover:not(:disabled) { background: rgba(255,82,82,0.1); color: var(--accent-red); }
  `}

  ${p => p.$active && css`
    background: var(--accent-green-dim) !important;
    color: var(--accent-green) !important;
  `}

  &:active:not(:disabled) { transform: scale(0.92); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

/* Step info */
const StepInfo = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
`;

const StepBadge = styled.span<{ $state: DebugState }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  ${p => {
    switch (p.$state) {
      case 'playing': return css`background:rgba(0,230,118,0.1);color:var(--accent-green);`;
      case 'paused': return css`background:rgba(255,215,64,0.1);color:var(--accent-amber);`;
      case 'finished': return css`background:rgba(24,255,255,0.1);color:var(--accent-cyan);`;
      case 'ready': return css`background:rgba(255,255,255,0.04);color:var(--text-tertiary);`;
      default: return css`background:transparent;color:var(--text-tertiary);`;
    }
  }}
`;

const StatusDot = styled.span<{ $state: DebugState }>`
  width: 6px; height: 6px; border-radius: 50%;
  background: ${p => {
    switch (p.$state) {
      case 'playing': return 'var(--accent-green)';
      case 'paused': return 'var(--accent-amber)';
      case 'finished': return 'var(--accent-cyan)';
      default: return 'var(--text-tertiary)';
    }
  }};
  ${p => p.$state === 'playing' && css`animation: ${pulseGlow} 1.5s ease infinite;`}
`;

/* Speed */
const SpeedGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
`;
const SpeedBtn = styled.button<{ $active?: boolean }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  transition: all var(--transition-fast);
  border: 1px solid ${p => p.$active ? 'rgba(0,230,118,0.3)' : 'transparent'};
  background: ${p => p.$active ? 'var(--accent-green-dim)' : 'transparent'};
  color: ${p => p.$active ? 'var(--accent-green)' : 'var(--text-tertiary)'};
  &:hover { color: var(--accent-green); background: rgba(0,230,118,0.06); }
`;

/* Line indicator */
const LineTag = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10.5px;
  font-family: var(--font-mono);
  font-weight: 600;
  background: rgba(0,230,118,0.08);
  color: var(--accent-green);
`;

const SPEEDS = [0.25, 0.5, 1, 2, 4];

const stateLabel: Record<DebugState, string> = {
  idle: 'Idle',
  ready: 'Ready',
  playing: 'Running',
  paused: 'Paused',
  finished: 'Done',
};

const DebuggerToolbar: React.FC = () => {
  const {
    debugState, currentStepIndex, totalSteps, speed, currentLine,
    stepForward, stepBackward, play, pause, stop, setSpeed, goToStep,
  } = useAnimationStore();

  const trackRef = useRef<HTMLDivElement>(null);

  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;
  const isPlaying = debugState === 'playing';
  const canStep = debugState !== 'idle' && totalSteps > 0;

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || totalSteps === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    goToStep(Math.floor(pct * totalSteps));
  }, [totalSteps, goToStep]);

  return (
    <Bar>
      <ScrubberWrap ref={trackRef} onClick={handleScrub}>
        <ScrubberTrack>
          <ScrubberFill $pct={progress} />
          <ScrubberThumb $pct={progress} />
        </ScrubberTrack>
      </ScrubberWrap>

      <ControlRow>
        {/* Left: step info */}
        <StepInfo>
          <StatusDot $state={debugState} />
          <StepBadge $state={debugState}>{stateLabel[debugState]}</StepBadge>
          {currentStepIndex >= 0 && (
            <span>{currentStepIndex + 1} / {totalSteps}</span>
          )}
        </StepInfo>

        {/* Center: controls */}
        <ControlGroup>
          <Btn onClick={() => goToStep(0)} disabled={!canStep || currentStepIndex <= 0} title="Go to start">
            <ChevronFirst size={14} />
          </Btn>
          <Btn onClick={stepBackward} disabled={!canStep || currentStepIndex <= 0} title="Step Back (←)">
            <StepBack size={14} />
          </Btn>
          <Btn
            $primary
            onClick={isPlaying ? pause : play}
            disabled={debugState === 'idle'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </Btn>
          <Btn onClick={stepForward} disabled={!canStep || currentStepIndex >= totalSteps - 1} title="Step Forward (→)">
            <StepForward size={14} />
          </Btn>
          <Btn onClick={() => goToStep(totalSteps - 1)} disabled={!canStep || currentStepIndex >= totalSteps - 1} title="Go to end">
            <ChevronLast size={14} />
          </Btn>
          <div style={{ width: 8 }} />
          <Btn $danger onClick={stop} disabled={debugState === 'idle'} title="Reset">
            <RotateCcw size={13} />
          </Btn>
        </ControlGroup>

        {/* Right: speed + line */}
        <ControlGroup style={{ gap: 10 }}>
          {currentLine > 0 && <LineTag>Ln {currentLine}</LineTag>}
          <SpeedGroup>
            <Zap size={10} style={{ color: 'var(--text-tertiary)' }} />
            {SPEEDS.map(s => (
              <SpeedBtn key={s} $active={speed === s} onClick={() => setSpeed(s)}>
                {s}x
              </SpeedBtn>
            ))}
          </SpeedGroup>
        </ControlGroup>
      </ControlRow>
    </Bar>
  );
};

export default DebuggerToolbar;
