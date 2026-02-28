// AnimatedArray — real-time step-driven array visualizer
// Reacts to every step in the store: SWAP, COMPARE, HIGHLIGHT, SET_VALUE, CREATE
// Uses spring physics for smooth bar animations

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { animated, useSprings, config as springPresets } from '@react-spring/web';
import styled, { keyframes, css } from 'styled-components';
import { CommandType } from '../types/animation.types';
import type { AnimationCommand } from '../types/animation.types';
import { useAnimationStore } from '../stores/animationStore';

/* ───── animations ───── */
const flashGreen = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(0,230,118,0.5); }
  50%  { box-shadow: 0 0 12px 4px rgba(0,230,118,0.3); }
  100% { box-shadow: 0 0 0 0 rgba(0,230,118,0); }
`;
const bounceIn = keyframes`
  0%   { transform: scaleY(0); opacity: 0; }
  60%  { transform: scaleY(1.06); }
  100% { transform: scaleY(1); opacity: 1; }
`;

/* ───── styled ───── */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 32px 24px 48px;
  user-select: none;
`;

const BarsRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-height: 80px;
  max-height: 420px;
  width: 100%;
  max-width: 900px;
`;

const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 64px;
  min-width: 28px;
`;

const ValueLabel = styled.div<{ $flash: boolean }>`
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  margin-bottom: 4px;
  min-height: 18px;
  transition: color 0.2s;
  ${p => p.$flash && css`
    color: var(--accent-green, #00e676);
  `}
`;

type BarStatus = 'idle' | 'comparing' | 'swapping' | 'highlight' | 'sorted';

const BAR_GRADIENTS: Record<BarStatus, string> = {
  idle:      'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
  comparing: 'linear-gradient(180deg, rgba(24,255,255,0.45) 0%, rgba(24,255,255,0.10) 100%)',
  swapping:  'linear-gradient(180deg, rgba(255,82,82,0.55) 0%, rgba(255,82,82,0.15) 100%)',
  highlight: 'linear-gradient(180deg, rgba(255,215,64,0.50) 0%, rgba(255,215,64,0.12) 100%)',
  sorted:    'linear-gradient(180deg, rgba(0,230,118,0.50) 0%, rgba(0,230,118,0.12) 100%)',
};

const Bar = styled(animated.div)<{ $status: BarStatus }>`
  width: 100%;
  border-radius: 6px 6px 2px 2px;
  background: ${p => BAR_GRADIENTS[p.$status]};
  border: 1px solid ${p =>
    p.$status === 'comparing' ? 'rgba(24,255,255,0.35)' :
    p.$status === 'swapping'  ? 'rgba(255,82,82,0.4)' :
    p.$status === 'highlight' ? 'rgba(255,215,64,0.35)' :
    p.$status === 'sorted'    ? 'rgba(0,230,118,0.35)' :
    'rgba(255,255,255,0.06)'
  };
  transition: background 0.25s, border-color 0.25s;
  transform-origin: bottom center;
  animation: ${bounceIn} 0.35s ease-out;
  cursor: default;
  position: relative;
  ${p => p.$status === 'sorted' && css`
    animation: ${flashGreen} 0.6s ease-out;
  `}
`;

const IndexLabel = styled.div`
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  color: var(--text-tertiary, #666);
  margin-top: 4px;
`;

const Legend = styled.div`
  display: flex;
  gap: 14px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;
const LegendItem = styled.div`
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--text-tertiary, #888);
`;
const LegendDot = styled.span<{ $c: string }>`
  width: 8px; height: 8px; border-radius: 2px;
  background: ${p => p.$c};
`;

/* ───── types ───── */
interface BarState {
  value: number;
  status: BarStatus;
}

interface AnimatedArrayProps {
  initialArray?: number[];
  width?: number;
  height?: number;
}

/* ───── component ───── */
export const AnimatedArray: React.FC<AnimatedArrayProps> = ({
  initialArray = [64, 34, 25, 12, 22, 11, 90],
  height = 380,
}) => {
  const {
    currentStepIndex,
    currentStep,
    debugState,
  } = useAnimationStore();

  // Get currentStepCommands from the store (all commands for the current step)
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [bars, setBars] = useState<BarState[]>([]);
  const maxVal = useRef(100);

  // Initialize from initialArray
  useEffect(() => {
    const b = initialArray.map(v => ({ value: v, status: 'idle' as BarStatus }));
    setBars(b);
    maxVal.current = Math.max(...initialArray, 1);
  }, [initialArray]);

  // --- Rebuild array from step variables when we step backward ---
  // When the user steps backward, we can't "undo" a swap — but the step snapshot
  // contains the full variable state. We rebuild the bars from that.
  const rebuildFromVariables = useCallback((vars: Record<string, any>) => {
    // Find the array variable in the variables
    const arrNames = Object.keys(vars).filter(k => Array.isArray(vars[k]));
    if (arrNames.length === 0) return;
    // Prefer the one matching initialArray length, or the first one
    const name = arrNames.find(n => vars[n].length === initialArray.length) ?? arrNames[0];
    const arr: number[] = vars[name];
    if (!arr || !Array.isArray(arr)) return;
    maxVal.current = Math.max(...arr, 1);
    setBars(arr.map(v => ({ value: v, status: 'idle' as BarStatus })));
  }, [initialArray]);

  // React to step changes
  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) return;

    // Always rebuild from variables for correctness (O(n) but small n)
    if (currentStep.variables) {
      rebuildFromVariables(currentStep.variables);
    }

    // Then apply visual states from commands
    if (currentStepCommands.length === 0) return;

    // Small delay so the bar rebuild renders first, then we overlay visual state
    const timeout = setTimeout(() => {
      setBars(prev => {
        const next = prev.map(b => ({ ...b, status: 'idle' as BarStatus }));
        for (const cmd of currentStepCommands) {
          const indices: number[] = (cmd as any).indices ?? (cmd as any).target_indices ?? [];
          const t = typeof cmd.type === 'string' ? cmd.type : '';

          switch (t) {
            case 'COMPARE':
              for (const i of indices) {
                if (next[i]) next[i].status = 'comparing';
              }
              break;
            case 'SWAP':
              for (const i of indices) {
                if (next[i]) next[i].status = 'swapping';
              }
              break;
            case 'HIGHLIGHT':
            case 'COLOR_CHANGE':
              for (const i of indices) {
                if (next[i]) {
                  next[i].status = cmd.values?.celebration ? 'sorted' : 'highlight';
                }
              }
              break;
            case 'SET_VALUE':
              for (const i of indices) {
                if (next[i]) next[i].status = 'highlight';
              }
              break;
            case 'CREATE':
              // Array just appeared — all idle, already handled by rebuild
              break;
            default:
              break;
          }
        }
        return next;
      });
    }, 30);

    return () => clearTimeout(timeout);
  }, [currentStepIndex, currentStep, currentStepCommands, rebuildFromVariables]);

  // Spring physics for bar heights
  const springs = useSprings(
    bars.length,
    bars.map(bar => ({
      height: Math.max(4, (bar.value / maxVal.current) * (height - 80)),
      scale: bar.status === 'swapping' ? 1.08 : bar.status === 'comparing' ? 1.03 : 1,
      config: bar.status === 'swapping'
        ? { tension: 280, friction: 18, mass: 1.3 }
        : { tension: 200, friction: 22 },
    }))
  );

  return (
    <Wrapper>
      <BarsRow>
        {springs.map((spring, idx) => {
          const bar = bars[idx];
          if (!bar) return null;
          return (
            <BarCol key={idx}>
              <ValueLabel $flash={bar.status === 'swapping' || bar.status === 'sorted'}>
                {bar.value}
              </ValueLabel>
              <Bar
                $status={bar.status}
                style={{
                  height: spring.height.to(h => `${h}px`),
                  transform: spring.scale.to(s => `scaleY(${s})`),
                }}
              />
              <IndexLabel>{idx}</IndexLabel>
            </BarCol>
          );
        })}
      </BarsRow>
      <Legend>
        <LegendItem><LegendDot $c="rgba(255,255,255,0.12)" /> Idle</LegendItem>
        <LegendItem><LegendDot $c="rgba(24,255,255,0.45)" /> Comparing</LegendItem>
        <LegendItem><LegendDot $c="rgba(255,82,82,0.55)" /> Swapping</LegendItem>
        <LegendItem><LegendDot $c="rgba(255,215,64,0.50)" /> Changed</LegendItem>
        <LegendItem><LegendDot $c="rgba(0,230,118,0.50)" /> Sorted</LegendItem>
      </Legend>
    </Wrapper>
  );
};
