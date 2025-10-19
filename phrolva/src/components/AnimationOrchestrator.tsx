// The maestro of animations - coordinates everything
// This is where all the components come together to create magic

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AnimatedArray } from './AnimatedArray';
import { AnimatedGraph } from './AnimatedGraph';
import { AnimatedString } from './AnimatedString';
import { PlaybackControls } from './PlaybackControls';
import { CodeDisplay } from './CodeDisplay';
import { useAnimationStore } from '../stores/animationStore';
import { VisualizationData } from '../types/animation.types';

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
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.h1`
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
  font-size: 14px;
  opacity: 0.8;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  
  span:first-child {
    font-size: 20px;
    font-weight: bold;
    color: #f093fb;
  }
  
  span:last-child {
    font-size: 12px;
    opacity: 0.6;
  }
`;

const MainContent = styled.main`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  padding: 24px;
  flex: 1;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const VisualizationArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ErrorMessage = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
  border-radius: 12px;
  text-align: center;
  margin: 20px;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 24px;
  
  &::after {
    content: '⚡';
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

interface AnimationOrchestratorProps {
  visualizationData?: VisualizationData;
  loadFromFile?: boolean;
}

export const AnimationOrchestrator: React.FC<AnimationOrchestratorProps> = ({
  visualizationData: propData,
  loadFromFile = true
}) => {
  const { visualizationData, loadVisualization } = useAnimationStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load visualization data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (propData) {
          // Use provided data
          loadVisualization(propData);
        } else if (loadFromFile) {
          // Load from JSON file (output from backend)
          const response = await fetch('/visualization.json');
          
          if (!response.ok) {
            throw new Error(`Failed to load visualization: ${response.statusText}`);
          }
          
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
  
  // Determine which visualizer to use
  const renderVisualizer = () => {
    if (!visualizationData) return null;
    
    const visualizerType = visualizationData.visualizer_config.type;
    
    switch (visualizerType) {
      case 'ArrayAdapter':
        // Extract initial array from execution steps
        const firstStep = visualizationData.execution.steps[0];
        const arrayVar = visualizationData.metadata.data_structures.arrays[0];
        const initialArray = firstStep?.variables[arrayVar] || [64, 34, 25, 12, 22, 11, 90];
        
        return <AnimatedArray initialArray={initialArray} />;
        
      case 'GraphAdapter':
        return <AnimatedGraph />;
        
      case 'StringAdapter':
        return <AnimatedString />;
        
      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
            Generic visualization (adapter type: {visualizerType})
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <OrchestratorContainer>
        <LoadingSpinner />
      </OrchestratorContainer>
    );
  }
  
  if (error) {
    return (
      <OrchestratorContainer>
        <ErrorMessage>
          <h2>⚠️ Visualization Error</h2>
          <p>{error}</p>
          <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
            Make sure visualization.json is available or provide data directly
          </p>
        </ErrorMessage>
      </OrchestratorContainer>
    );
  }
  
  if (!visualizationData) {
    return (
      <OrchestratorContainer>
        <ErrorMessage>
          No visualization data available
        </ErrorMessage>
      </OrchestratorContainer>
    );
  }
  
  return (
    <OrchestratorContainer>
      <Header>
        <Logo>🚀 PHROLVA</Logo>
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
      </Header>
      
      <MainContent>
        <VisualizationArea>
          {renderVisualizer()}
          <PlaybackControls />
        </VisualizationArea>
        
        <Sidebar>
          <CodeDisplay />
        </Sidebar>
      </MainContent>
    </OrchestratorContainer>
  );
};
