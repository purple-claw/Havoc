// SharedViewPage — Render a shared visualization from a share link
// Decodes the share ID and renders the AnimationOrchestrator

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AnimationOrchestrator } from '../components/AnimationOrchestrator';
import { api } from '../services/api';
import type { VisualizationData } from '../types/animation.types';

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: white;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
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

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Center = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorBox = styled.div`
  padding: 28px 40px;
  background: rgba(255, 71, 87, 0.08);
  border: 1px solid rgba(255, 71, 87, 0.2);
  border-radius: 12px;
  text-align: center;
  max-width: 500px;
`;

interface SharedViewPageProps {
  shareId: string;
  onNavigate: (path: string) => void;
}

const SharedViewPage: React.FC<SharedViewPageProps> = ({ shareId, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<VisualizationData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const shared = await api.getShared(shareId);

        if (!shared || !shared.code) {
          setError('Share link is invalid or has expired.');
          return;
        }

        // Execute the shared code to generate a visualization
        const response = await api.execute(shared.code, { explain: true });

        if (!response.success) {
          setError(response.error || 'Failed to visualize shared code');
          return;
        }

        setVizData({
          metadata: response.metadata,
          execution: response.execution,
          animations: response.animations,
          visualizer_config: response.visualizer_config,
          explanations: response.explanations,
          source_code: shared.code,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load shared visualization');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [shareId]);

  return (
    <Page>
      <TopBar>
        <Brand onClick={() => onNavigate('/')}>HAVOC</Brand>
        <TopBarLinks>
          <TopBarLink onClick={() => onNavigate('/playground')}>Open in Playground</TopBarLink>
          <TopBarLink onClick={() => onNavigate('/gallery')}>Gallery</TopBarLink>
        </TopBarLinks>
      </TopBar>

      <Content>
        {loading && (
          <Center>
            <Spinner />
            <span style={{ color: '#888', fontSize: 14 }}>Loading shared visualization...</span>
          </Center>
        )}

        {error && (
          <Center>
            <ErrorBox>
              <h3 style={{ margin: '0 0 8px', color: '#ff6b6b' }}>Could not load</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{error}</p>
            </ErrorBox>
          </Center>
        )}

        {!loading && !error && vizData && (
          <AnimationOrchestrator visualizationData={vizData} loadFromFile={false} />
        )}
      </Content>
    </Page>
  );
};

export default SharedViewPage;
