// PlaygroundPage — Full code editor + visualizer + explanations
// The main interactive experience: write/paste code, run, and visualize

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import CodeEditor from '../components/CodeEditor';
import { AnimationOrchestrator } from '../components/AnimationOrchestrator';
import ExplanationPanel from '../components/ExplanationPanel';
import VariableInspector from '../components/VariableInspector';
import { useAnimationStore } from '../stores/animationStore';
import { api } from '../services/api';
import type { VisualizationData, ExplanationData, ExecutionStep } from '../types/animation.types';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: white;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const Brand = styled.a`
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  cursor: pointer;
`;

const TopBarLinks = styled.div`
  display: flex;
  gap: 16px;
  font-size: 13px;
`;

const TopBarLink = styled.a`
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  cursor: pointer;
  &:hover { color: white; }
`;

const WorkArea = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  overflow: hidden;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`;

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
`;

const EditorSection = styled.div`
  flex: 1;
  padding: 16px;
  overflow: auto;
`;

const RightPanel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const VisualizerSection = styled.div`
  flex: 1;
  overflow: auto;
`;

const BottomPanels = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 6px;
`;

const ErrorBanner = styled.div`
  padding: 10px 24px;
  background: rgba(255, 71, 87, 0.12);
  border-bottom: 1px solid rgba(255, 71, 87, 0.2);
  color: #ff6b6b;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

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
  onNavigate: (path: string) => void;
  initialCode?: string;
}

const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ onNavigate, initialCode }) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [activeLine, setActiveLine] = useState<number | undefined>(undefined);
  const { playbackState } = useAnimationStore();

  // Derive current and previous execution step from playback
  const currentStep: ExecutionStep | null =
    vizData && playbackState.currentFrame < (vizData.execution.steps.length)
      ? vizData.execution.steps[playbackState.currentFrame]
      : null;
  const previousStep: ExecutionStep | null =
    vizData && playbackState.currentFrame > 0
      ? vizData.execution.steps[playbackState.currentFrame - 1]
      : null;

  // Highlight line in editor based on current step
  useEffect(() => {
    if (currentStep) {
      setActiveLine(currentStep.line || currentStep.line_number);
    }
  }, [currentStep]);

  const handleRun = useCallback(async (sourceCode: string) => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await api.execute(sourceCode, { explain: true });

      if (!response.success) {
        setError(response.error || 'Execution failed');
        return;
      }

      const data: VisualizationData = {
        metadata: response.metadata,
        execution: response.execution,
        animations: response.animations,
        visualizer_config: response.visualizer_config,
        explanations: response.explanations,
        source_code: sourceCode,
      };

      setVizData(data);
      setExplanation(response.explanations || null);
    } catch (err: any) {
      // If the API is not running, show a helpful message
      if (err.message?.includes('fetch')) {
        setError('Cannot reach the HAVOC API. Start the backend with: python havoc.py serve');
      } else {
        setError(err.message || 'Unknown error');
      }
    } finally {
      setIsRunning(false);
    }
  }, []);

  return (
    <Page>
      <TopBar>
        <Brand onClick={() => onNavigate('/')}>HAVOC</Brand>
        <TopBarLinks>
          <TopBarLink onClick={() => onNavigate('/gallery')}>Gallery</TopBarLink>
          <TopBarLink onClick={() => onNavigate('/')}>Home</TopBarLink>
        </TopBarLinks>
      </TopBar>

      {error && (
        <ErrorBanner>
          <span>{error}</span>
          <span
            style={{ cursor: 'pointer', fontWeight: 700 }}
            onClick={() => setError(null)}
          >
            Dismiss
          </span>
        </ErrorBanner>
      )}

      <WorkArea>
        <LeftPanel>
          <EditorSection>
            <CodeEditor
              value={code}
              onChange={setCode}
              onRun={handleRun}
              isRunning={isRunning}
              activeLine={activeLine}
            />
          </EditorSection>
        </LeftPanel>

        <RightPanel>
          {vizData ? (
            <VisualizerSection>
              <AnimationOrchestrator
                visualizationData={vizData}
                loadFromFile={false}
              />
            </VisualizerSection>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: '#444',
              }}
            >
              <span style={{ fontSize: 40 }}>&#9654;</span>
              <span style={{ fontSize: 14 }}>
                Write code on the left and click <strong>Run</strong> to visualize
              </span>
              <span style={{ fontSize: 12, color: '#333' }}>
                or press Ctrl+Enter
              </span>
            </div>
          )}
        </RightPanel>
      </WorkArea>

      {vizData && (
        <BottomPanels>
          <VariableInspector
            currentStep={currentStep}
            previousStep={previousStep}
          />
          <ExplanationPanel
            data={explanation}
            currentStep={playbackState.currentFrame}
          />
        </BottomPanels>
      )}

      <StatusBar>
        <div>
          <StatusDot $color={isRunning ? '#f7b731' : vizData ? '#43e97b' : '#555'} />
          {isRunning ? 'Executing...' : vizData ? 'Ready' : 'Idle'}
        </div>
        <div>
          {vizData && (
            <>
              {vizData.execution.total_steps} steps &middot;{' '}
              {vizData.animations.total_commands} animations &middot;{' '}
              {(vizData.animations.duration_ms / 1000).toFixed(1)}s
            </>
          )}
        </div>
      </StatusBar>
    </Page>
  );
};

export default PlaygroundPage;
