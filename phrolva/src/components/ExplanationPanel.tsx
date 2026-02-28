import React, { useState } from 'react';
import styled from 'styled-components';
import type { ExplanationData } from '../types/animation.types';

/* ───── shell ───── */
const Panel = styled.div`
  background:var(--bg-elevated);border-radius:var(--radius-lg);
  border:1px solid var(--glass-border);overflow:hidden;
`;

/* ── header ── */
const Head = styled.div`
  padding:10px 16px;display:flex;justify-content:space-between;align-items:center;
  background:var(--bg-card);border-bottom:1px solid var(--glass-border);
`;
const AlgoName = styled.h3`
  margin:0;font-size:13.5px;font-weight:700;
  background:linear-gradient(135deg,var(--accent-green),var(--accent-cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
`;
const Badge = styled.span<{$kind:'time'|'space'}>`
  display:inline-block;padding:2px 7px;border-radius:4px;
  font-size:10.5px;font-family:var(--font-mono);font-weight:600;margin-left:5px;
  background:${p=>p.$kind==='time'?'var(--accent-green-dim)':'rgba(24,255,255,0.1)'};
  color:${p=>p.$kind==='time'?'var(--accent-green)':'var(--accent-cyan)'};
`;

/* ── body ── */
const Body = styled.div`padding:12px 16px;display:flex;flex-direction:column;gap:12px;max-height:400px;overflow-y:auto;`;
const Overview = styled.p`margin:0;font-size:12.5px;line-height:1.6;color:var(--text-secondary);`;
const Label = styled.div`font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-tertiary);margin-bottom:4px;font-weight:600;`;

const ConceptTag = styled.span`
  display:inline-block;padding:2px 9px;border-radius:100px;font-size:10.5px;
  background:var(--accent-green-dim);border:1px solid rgba(0,230,118,0.15);
  color:var(--accent-green);margin:0 4px 4px 0;
`;

const StepCard = styled.div<{$active?:boolean}>`
  padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;
  background:${p=>p.$active?'rgba(0,230,118,0.06)':'var(--bg-card)'};
  border:1px solid ${p=>p.$active?'rgba(0,230,118,0.2)':'var(--glass-border)'};
  transition:all var(--transition-fast);margin-bottom:4px;
  &:hover{background:rgba(0,230,118,0.04);}
`;
const StepTitle = styled.div`font-size:12.5px;font-weight:600;margin-bottom:2px;`;
const StepSummary = styled.div`font-size:11.5px;line-height:1.5;color:var(--text-secondary);`;
const StepDetail = styled.div`font-size:11.5px;line-height:1.5;color:var(--text-secondary);margin-top:5px;padding-top:5px;border-top:1px solid var(--glass-border);`;
const TipsList = styled.ul`margin:4px 0 0;padding-left:14px;font-size:10.5px;color:var(--text-tertiary);line-height:1.6;`;

const FunFact = styled.div`
  padding:8px 10px;border-radius:var(--radius-sm);
  background:rgba(0,230,118,0.04);border-left:2px solid var(--accent-green);
  font-size:11.5px;color:var(--text-secondary);line-height:1.5;
`;

const PathItem = styled.div`
  display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--text-secondary);
`;
const PathNum = styled.span`
  width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:700;flex-shrink:0;
  background:var(--accent-green-dim);color:var(--accent-green);
`;

const Empty = styled.div`padding:20px 16px;text-align:center;color:var(--text-tertiary);font-size:12px;`;

/* ───── component ───── */
interface ExplanationPanelProps { data?:ExplanationData|null; currentStep?:number; }

const ExplanationPanel:React.FC<ExplanationPanelProps> = ({ data, currentStep=0 }) => {
  const [expanded, setExpanded] = useState<number|null>(null);

  if(!data) return <Panel><Empty>Run code to see AI-generated explanations</Empty></Panel>;

  const activeIdx = data.step_explanations?.findIndex(se=>{
    const [s,e]=se.step_range; return currentStep>=s&&currentStep<=e;
  });

  return(
    <Panel>
      <Head>
        <AlgoName>{data.algorithm_name||'Explanation'}</AlgoName>
        <div>
          {data.time_complexity&&<Badge $kind="time">T: {data.time_complexity}</Badge>}
          {data.space_complexity&&<Badge $kind="space">S: {data.space_complexity}</Badge>}
        </div>
      </Head>
      <Body>
        {data.overview&&<Overview>{data.overview}</Overview>}

        {data.key_concepts&&data.key_concepts.length>0&&(
          <div><Label>Key Concepts</Label><div>{data.key_concepts.map((c,i)=><ConceptTag key={i}>{c}</ConceptTag>)}</div></div>
        )}

        {data.step_explanations&&data.step_explanations.length>0&&(
          <div><Label>Step-by-Step</Label>
            {data.step_explanations.map((step,i)=>{
              const isActive=i===activeIdx;
              const isOpen=expanded===i||isActive;
              return(
                <StepCard key={i} $active={isActive} onClick={()=>setExpanded(isOpen?null:i)}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepSummary>{step.summary}</StepSummary>
                  {isOpen&&(
                    <>
                      <StepDetail>{step.detail}</StepDetail>
                      {step.analogy&&<StepDetail style={{fontStyle:'italic',color:'var(--accent-green)'}}> Analogy: {step.analogy}</StepDetail>}
                      {step.tips&&step.tips.length>0&&<TipsList>{step.tips.map((t,j)=><li key={j}>{t}</li>)}</TipsList>}
                    </>
                  )}
                </StepCard>
              );
            })}
          </div>
        )}

        {data.fun_fact&&(<div><Label>Fun Fact</Label><FunFact>{data.fun_fact}</FunFact></div>)}

        {data.learning_path&&data.learning_path.length>0&&(
          <div><Label>What to Learn Next</Label>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {data.learning_path.map((item,i)=><PathItem key={i}><PathNum>{i+1}</PathNum>{item}</PathItem>)}
            </div>
          </div>
        )}
      </Body>
    </Panel>
  );
};

export default ExplanationPanel;
