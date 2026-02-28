import React, { useEffect, useState, useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { AnimatedArray } from './AnimatedArray';
import { AnimatedGraph } from './AnimatedGraph';
import { AnimatedString } from './AnimatedString';
import AnimatedStack from './AnimatedStack';
import AnimatedQueue from './AnimatedQueue';
import AnimatedLinkedList from './AnimatedLinkedList';
import AnimatedTree from './AnimatedTree';
import AnimatedHeap from './AnimatedHeap';
import AnimatedMatrix from './AnimatedMatrix';
import AnimatedHashMap from './AnimatedHashMap';
import AnimatedSet from './AnimatedSet';
import AnimatedGeneric from './AnimatedGeneric';
import { useAnimationStore } from '../stores/animationStore';
import type { VisualizationData, AdapterType } from '../types/animation.types';

const spin = keyframes`to{transform:rotate(360deg)}`;

/* ───── layout — canvas-only, fills parent ───── */
const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
`;

const AdapterTag = styled.div`
  position: absolute;
  top: 10px;
  left: 12px;
  z-index: 5;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(0,230,118,0.08);
  border: 1px solid rgba(0,230,118,0.12);
  color: var(--accent-green);
  backdrop-filter: blur(8px);
`;

const StepTag = styled.div`
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 5;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--glass-border);
  color: var(--text-tertiary);
  backdrop-filter: blur(8px);
`;

const VizFill = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrBox = styled.div`
  padding: 20px;
  border-radius: var(--radius-lg);
  text-align: center;
  margin: 20px;
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.15);
  color: var(--accent-red);
`;

const LoadWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
`;
const Spinner = styled.div`
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2.5px solid rgba(0,230,118,0.15);
  border-top-color: var(--accent-green);
  animation: ${spin} .7s linear infinite;
`;

/* ───── adapter map ───── */
const MAP: Record<string, AdapterType> = {
  ArrayAdapter: 'AnimatedArray',
  GraphAdapter: 'AnimatedGraph',
  StringAdapter: 'AnimatedString',
  StackAdapter: 'AnimatedStack',
  QueueAdapter: 'AnimatedQueue',
  LinkedListAdapter: 'AnimatedLinkedList',
  TreeAdapter: 'AnimatedTree',
  HeapAdapter: 'AnimatedHeap',
  MatrixAdapter: 'AnimatedMatrix',
  HashMapAdapter: 'AnimatedHashMap',
  SetAdapter: 'AnimatedSet',
  GenericAdapter: 'AnimatedGeneric',
};

/* ───── component ───── */
interface AnimationOrchestratorProps {
  visualizationData?: VisualizationData;
  loadFromFile?: boolean;
}

export const AnimationOrchestrator: React.FC<AnimationOrchestratorProps> = ({
  visualizationData: propData,
  loadFromFile = true,
}) => {
  const {
    vizData: storeData,
    loadVisualization,
    currentStepIndex,
    totalSteps,
  } = useAnimationStore();

  const visualizationData = propData ?? storeData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propData) return; // Already passed as prop
    if (!loadFromFile) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch('/visualization.json');
        if (!r.ok) throw new Error(`Failed: ${r.statusText}`);
        loadVisualization(await r.json());
      } catch (e: any) {
        setError(e.message || 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [propData, loadFromFile, loadVisualization]);

  const resolved: AdapterType = useMemo(() => {
    if (!visualizationData) return 'AnimatedGeneric';
    const cfg = visualizationData.visualizer_config;
    if (cfg.component) return cfg.component;
    if (cfg.adapter && MAP[cfg.adapter]) return MAP[cfg.adapter];
    const lt = (cfg as any).type;
    if (lt && MAP[lt]) return MAP[lt];
    return 'AnimatedGeneric';
  }, [visualizationData]);

  const renderViz = useCallback(() => {
    if (!visualizationData) return null;
    switch (resolved) {
      case 'AnimatedArray': {
        // Extract initial array from the first step that has an array variable
        const steps = visualizationData.execution.steps ?? [];
        const ds = visualizationData.visualizer_config?.data_structures;
        const arrVarName = ds?.arrays?.[0];
        let init: number[] = [64, 34, 25, 12, 22, 11, 90]; // fallback
        for (const s of steps) {
          const vars = s.variables ?? {};
          if (arrVarName && Array.isArray(vars[arrVarName])) {
            init = vars[arrVarName];
            break;
          }
          for (const [, v] of Object.entries(vars)) {
            if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'number') {
              init = v as number[];
              break;
            }
          }
          if (init !== undefined && init.length > 0 && init[0] !== 64) break;
        }
        return <AnimatedArray initialArray={init} />;
      }
      case 'AnimatedGraph':      return <AnimatedGraph />;
      case 'AnimatedString':     return <AnimatedString />;
      case 'AnimatedStack':      return <AnimatedStack />;
      case 'AnimatedQueue':      return <AnimatedQueue />;
      case 'AnimatedLinkedList': return <AnimatedLinkedList />;
      case 'AnimatedTree':       return <AnimatedTree />;
      case 'AnimatedHeap':       return <AnimatedHeap />;
      case 'AnimatedMatrix':     return <AnimatedMatrix />;
      case 'AnimatedHashMap':    return <AnimatedHashMap />;
      case 'AnimatedSet':        return <AnimatedSet />;
      default:                   return <AnimatedGeneric />;
    }
  }, [visualizationData, resolved]);

  if (loading) {
    return (
      <Shell>
        <LoadWrap>
          <Spinner />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading...</span>
        </LoadWrap>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <ErrBox>
          <h3 style={{ margin: '0 0 6px' }}>Error</h3>
          <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
        </ErrBox>
      </Shell>
    );
  }

  if (!visualizationData) {
    return <Shell><ErrBox>No visualization data.</ErrBox></Shell>;
  }

  return (
    <Shell>
      <AdapterTag>{resolved.replace('Animated', '')}</AdapterTag>
      {totalSteps > 0 && (
        <StepTag>
          Step {Math.max(0, currentStepIndex + 1)} / {totalSteps}
        </StepTag>
      )}
      <VizFill>{renderViz()}</VizFill>
    </Shell>
  );
};
