// The maestro of animations - coordinates everything
// Routes to the correct visualizer based on adapter type & manages playback

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import styled from 'styled-components';
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
import { PlaybackControls } from './PlaybackControls';
import { CodeDisplay } from './CodeDisplay';
import { useAnimationStore } from '../stores/animationStore';
import type { VisualizationData, AdapterType, AnimationCommand, ExplanationData } from '../types/animation.types';

/* ──────────────────────── Styled Components ──────────────────────── */

const OrchestratorContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.h1`
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  cursor: pointer;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const AdapterBadge = styled.div`
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: #667eea;
  font-weight: 600;
`;

const Stats = styled.div`
  display: flex;
  gap: 20px;
  font-size: 13px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  span:first-child {
    font-size: 18px;
    font-weight: bold;
    color: #f093fb;
  }

  span:last-child {
    font-size: 11px;
    opacity: 0.6;
  }
`;

const MainContent = styled.main`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow: hidden;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
`;

const VisualizationArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;

const VisualizerWrapper = styled.div`
  flex: 1;
  min-height: 300px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: auto;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
`;

const ExplanationBox = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
`;

const ExplanationTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #f093fb;
`;

const ExplanationText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
`;

const ComplexityChip = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(67, 233, 123, 0.12);
  color: #43e97b;
  margin-right: 6px;
`;

const ErrorMessage = styled.div`
  padding: 24px;
  background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
  border-radius: 12px;
  text-align: center;
  margin: 24px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/* ──────────────────── Component → Adapter Map ──────────────────── */

const ADAPTER_TO_COMPONENT: Record<string, AdapterType> = {
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

/* ──────────────────────── Props ──────────────────────── */

interface AnimationOrchestratorProps {
  visualizationData?: VisualizationData;
  loadFromFile?: boolean;
}

/* ──────────────────────── Component ──────────────────────── */

export const AnimationOrchestrator: React.FC<AnimationOrchestratorProps> = ({
  visualizationData: propData,
  loadFromFile = true,
}) => {
  const { visualizationData, loadVisualization, playbackState } = useAnimationStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load visualization data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (propData) {
          loadVisualization(propData);
        } else if (loadFromFile) {
          const response = await fetch('/visualization.json');
          if (!response.ok) throw new Error(`Failed to load visualization: ${response.statusText}`);
          const data: VisualizationData = await response.json();
          loadVisualization(data);
        }
      } catch (err) {
        console.error('Failed to load visualization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [propData, loadFromFile, loadVisualization]);

  // Resolve which component to render
  const resolvedComponent: AdapterType = useMemo(() => {
    if (!visualizationData) return 'AnimatedGeneric';

    const cfg = visualizationData.visualizer_config;
    // Check component field first (new API)
    if (cfg.component) return cfg.component;
    // Fall back to adapter name mapping
    if (cfg.adapter && ADAPTER_TO_COMPONENT[cfg.adapter]) {
      return ADAPTER_TO_COMPONENT[cfg.adapter];
    }
    // Legacy: check type field from old orchestrator format
    const legacyType = (cfg as any).type;
    if (legacyType && ADAPTER_TO_COMPONENT[legacyType]) {
      return ADAPTER_TO_COMPONENT[legacyType];
    }
    return 'AnimatedGeneric';
  }, [visualizationData]);

  // Build adapter-specific props
  const commands = visualizationData?.animations.commands ?? [];
  const currentFrame = playbackState.currentFrame;
  const speed = playbackState.speed;

  // Render the visualizer
  const renderVisualizer = useCallback(() => {
    if (!visualizationData) return null;

    const sharedProps = { commands, currentFrame, speed };

    switch (resolvedComponent) {
      case 'AnimatedArray': {
        const firstStep = visualizationData.execution.steps[0];
        const ds = visualizationData.metadata?.data_structures;
        const arrayVarName = ds?.arrays?.[0];
        const initialArray = firstStep?.variables[arrayVarName] ?? [64, 34, 25, 12, 22, 11, 90];
        return <AnimatedArray initialArray={initialArray} />;
      }
      case 'AnimatedGraph':
        return <AnimatedGraph />;
      case 'AnimatedString':
        return <AnimatedString />;
      case 'AnimatedStack':
        return <AnimatedStack {...sharedProps} />;
      case 'AnimatedQueue':
        return <AnimatedQueue {...sharedProps} />;
      case 'AnimatedLinkedList':
        return <AnimatedLinkedList {...sharedProps} />;
      case 'AnimatedTree':
        return <AnimatedTree {...sharedProps} />;
      case 'AnimatedHeap':
        return <AnimatedHeap {...sharedProps} />;
      case 'AnimatedMatrix':
        return <AnimatedMatrix {...sharedProps} />;
      case 'AnimatedHashMap':
        return <AnimatedHashMap {...sharedProps} />;
      case 'AnimatedSet':
        return <AnimatedSet {...sharedProps} />;
      case 'AnimatedGeneric':
      default:
        return <AnimatedGeneric {...sharedProps} />;
    }
  }, [visualizationData, resolvedComponent, commands, currentFrame, speed]);

  // Explanation panel
  const explanation: ExplanationData | undefined = visualizationData?.explanations;

  /* ── Early-return screens ── */

  if (loading) {
    return (
      <OrchestratorContainer>
        <LoadingContainer>
          <Spinner />
          <span style={{ color: '#888', fontSize: 14 }}>Loading visualization...</span>
        </LoadingContainer>
      </OrchestratorContainer>
    );
  }

  if (error) {
    return (
      <OrchestratorContainer>
        <ErrorMessage>
          <h2>Visualization Error</h2>
          <p>{error}</p>
          <p style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
            Make sure visualization.json is available or provide data directly.
          </p>
        </ErrorMessage>
      </OrchestratorContainer>
    );
  }

  if (!visualizationData) {
    return (
      <OrchestratorContainer>
        <ErrorMessage>No visualization data available.</ErrorMessage>
      </OrchestratorContainer>
    );
  }

  /* ── Main render ── */

  return (
    <OrchestratorContainer>
      <Header>
        <Logo>HAVOC</Logo>
        <HeaderRight>
          <AdapterBadge>{resolvedComponent.replace('Animated', '')}</AdapterBadge>
          <Stats>
            <StatItem>
              <span>{visualizationData.execution.total_steps}</span>
              <span>Steps</span>
            </StatItem>
            <StatItem>
              <span>{visualizationData.animations.total_commands}</span>
              <span>Animations</span>
            </StatItem>
            <StatItem>
              <span>{(visualizationData.animations.duration_ms / 1000).toFixed(1)}s</span>
              <span>Duration</span>
            </StatItem>
          </Stats>
        </HeaderRight>
      </Header>

      <MainContent>
        <VisualizationArea>
          <VisualizerWrapper>{renderVisualizer()}</VisualizerWrapper>
          <PlaybackControls />
        </VisualizationArea>

        <Sidebar>
          <CodeDisplay />

          {explanation && (
            <ExplanationBox>
              <ExplanationTitle>
                {explanation.algorithm_name || 'Explanation'}
              </ExplanationTitle>

              {(explanation.time_complexity || explanation.space_complexity) && (
                <div style={{ marginBottom: 8 }}>
                  {explanation.time_complexity && (
                    <ComplexityChip>Time: {explanation.time_complexity}</ComplexityChip>
                  )}
                  {explanation.space_complexity && (
                    <ComplexityChip>Space: {explanation.space_complexity}</ComplexityChip>
                  )}
                </div>
              )}

              {explanation.overview && <ExplanationText>{explanation.overview}</ExplanationText>}

              {explanation.fun_fact && (
                <ExplanationText style={{ marginTop: 12, color: '#f093fb' }}>
                  Fun fact: {explanation.fun_fact}
                </ExplanationText>
              )}
            </ExplanationBox>
          )}
        </Sidebar>
      </MainContent>
    </OrchestratorContainer>
  );
};
