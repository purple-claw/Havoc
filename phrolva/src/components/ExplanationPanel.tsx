// ExplanationPanel — AI-generated algorithm explanations sidebar
// Shows overview, complexity, step-by-step breakdowns, fun facts, and learning paths

import React, { useState } from 'react';
import styled from 'styled-components';
import type { ExplanationData } from '../types/animation.types';

const Panel = styled.div`
  background: #12122a;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 14px 16px;
  background: rgba(102, 126, 234, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AlgoName = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ComplexityBadge = styled.span<{ $kind: 'time' | 'space' }>`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  background: ${({ $kind }) =>
    $kind === 'time' ? 'rgba(67, 233, 123, 0.12)' : 'rgba(79, 172, 254, 0.12)'};
  color: ${({ $kind }) => ($kind === 'time' ? '#43e97b' : '#4facfe')};
  margin-right: 6px;
`;

const Body = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Overview = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
`;

const SectionLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #666;
  margin-bottom: 6px;
`;

const ConceptTag = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  background: rgba(240, 147, 251, 0.1);
  border: 1px solid rgba(240, 147, 251, 0.2);
  color: #f093fb;
  margin: 0 4px 4px 0;
`;

const StepCard = styled.div<{ $active?: boolean }>`
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'rgba(102,126,234,0.1)' : 'rgba(0,0,0,0.2)')};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(102,126,234,0.3)' : 'transparent')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(102, 126, 234, 0.08);
  }
`;

const StepTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
`;

const StepSummary = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
`;

const StepDetail = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const TipsList = styled.ul`
  margin: 4px 0 0;
  padding-left: 16px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
`;

const FunFact = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(240, 147, 251, 0.06);
  border-left: 3px solid #f093fb;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
`;

const LearningPath = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PathItem = styled.div<{ $index: number }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
`;

const PathNumber = styled.span<{ $index: number }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  background: rgba(102, 126, 234, 0.15);
  color: #667eea;
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: #555;
  font-size: 13px;
`;

interface ExplanationPanelProps {
  data?: ExplanationData | null;
  currentStep?: number;
}

const ExplanationPanel: React.FC<ExplanationPanelProps> = ({ data, currentStep = 0 }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!data) {
    return (
      <Panel>
        <EmptyState>Run code to see AI-generated explanations</EmptyState>
      </Panel>
    );
  }

  // Find active step explanation based on current animation frame
  const activeStepIdx = data.step_explanations?.findIndex((se) => {
    const [start, end] = se.step_range;
    return currentStep >= start && currentStep <= end;
  });

  return (
    <Panel>
      <PanelHeader>
        <AlgoName>{data.algorithm_name || 'Code Explanation'}</AlgoName>
        <div>
          {data.time_complexity && <ComplexityBadge $kind="time">T: {data.time_complexity}</ComplexityBadge>}
          {data.space_complexity && <ComplexityBadge $kind="space">S: {data.space_complexity}</ComplexityBadge>}
        </div>
      </PanelHeader>

      <Body>
        {/* Overview */}
        {data.overview && <Overview>{data.overview}</Overview>}

        {/* Key Concepts */}
        {data.key_concepts && data.key_concepts.length > 0 && (
          <div>
            <SectionLabel>Key Concepts</SectionLabel>
            <div>
              {data.key_concepts.map((c, i) => (
                <ConceptTag key={i}>{c}</ConceptTag>
              ))}
            </div>
          </div>
        )}

        {/* Step-by-step Explanations */}
        {data.step_explanations && data.step_explanations.length > 0 && (
          <div>
            <SectionLabel>Step-by-Step</SectionLabel>
            {data.step_explanations.map((step, i) => {
              const isActive = i === activeStepIdx;
              const isExpanded = expandedStep === i || isActive;
              return (
                <StepCard
                  key={i}
                  $active={isActive}
                  onClick={() => setExpandedStep(isExpanded ? null : i)}
                  style={{ marginBottom: 6 }}
                >
                  <StepTitle>{step.title}</StepTitle>
                  <StepSummary>{step.summary}</StepSummary>
                  {isExpanded && (
                    <>
                      <StepDetail>{step.detail}</StepDetail>
                      {step.analogy && (
                        <StepDetail style={{ fontStyle: 'italic', color: '#f093fb' }}>
                          Analogy: {step.analogy}
                        </StepDetail>
                      )}
                      {step.tips && step.tips.length > 0 && (
                        <TipsList>
                          {step.tips.map((t, j) => (
                            <li key={j}>{t}</li>
                          ))}
                        </TipsList>
                      )}
                    </>
                  )}
                </StepCard>
              );
            })}
          </div>
        )}

        {/* Fun Fact */}
        {data.fun_fact && (
          <div>
            <SectionLabel>Fun Fact</SectionLabel>
            <FunFact>{data.fun_fact}</FunFact>
          </div>
        )}

        {/* Learning Path */}
        {data.learning_path && data.learning_path.length > 0 && (
          <div>
            <SectionLabel>What to Learn Next</SectionLabel>
            <LearningPath>
              {data.learning_path.map((item, i) => (
                <PathItem key={i} $index={i}>
                  <PathNumber $index={i}>{i + 1}</PathNumber>
                  {item}
                </PathItem>
              ))}
            </LearningPath>
          </div>
        )}
      </Body>
    </Panel>
  );
};

export default ExplanationPanel;
