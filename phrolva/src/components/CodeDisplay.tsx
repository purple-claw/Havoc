import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';

/* ───── styled ───── */
const Wrap = styled.div`
  background:var(--bg-elevated);border-radius:var(--radius-lg);
  border:1px solid var(--glass-border);overflow:hidden;
`;
const Head = styled.div`
  display:flex;align-items:center;gap:8px;padding:8px 14px;
  background:var(--bg-card);border-bottom:1px solid var(--glass-border);
`;
const Dot = styled.span<{$c:string}>`width:8px;height:8px;border-radius:50%;background:${p=>p.$c};opacity:.6;`;
const FName = styled.span`font-size:11px;font-family:var(--font-mono);color:var(--text-tertiary);margin-left:6px;`;

const Body = styled.div`max-height:400px;overflow:auto;`;

const Line = styled.div<{$active?:boolean;$executed?:boolean}>`
  display:flex;padding:2px 0;
  background:${p=>p.$active?'rgba(0,230,118,0.07)':p.$executed?'rgba(0,230,118,0.02)':'transparent'};
  border-left:2.5px solid ${p=>p.$active?'var(--accent-green)':p.$executed?'rgba(0,230,118,0.15)':'transparent'};
  transition:all .2s;
  &:hover{background:rgba(255,255,255,0.015);}
`;
const LNum = styled.span`
  display:inline-block;width:36px;text-align:right;padding-right:12px;
  font-family:var(--font-mono);font-size:11.5px;color:var(--text-tertiary);user-select:none;
`;
const LContent = styled.span`
  flex:1;font-family:var(--font-mono);font-size:11.5px;color:var(--text-secondary);white-space:pre;
`;

const Empty = styled.div`text-align:center;color:var(--text-tertiary);padding:28px;font-size:12px;`;

/* ── default code ── */
const SAMPLE = `arr = [5, 2, 4, 1, 3]
n = len(arr)

for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            temp = arr[j]
            arr[j] = arr[j + 1]
            arr[j + 1] = temp

print(f"Sorted: {arr}")`;

/* ───── component ───── */
export const CodeDisplay:React.FC = () => {
  const { visualizationData, playbackState } = useAnimationStore();
  const [lines, setLines] = useState<string[]>([]);
  const [curLine, setCurLine] = useState<number|null>(null);
  const [executed, setExecuted] = useState<Set<number>>(new Set());

  useEffect(()=>{
    if(visualizationData?.source_code){
      setLines(visualizationData.source_code.split('\n'));
    } else if(visualizationData?.metadata){
      setLines(SAMPLE.split('\n'));
    }
  },[visualizationData]);

  useEffect(()=>{
    if(visualizationData&&playbackState.currentFrame<visualizationData.execution.steps.length){
      const step=visualizationData.execution.steps[playbackState.currentFrame];
      if(step){
        const ln=step.line_number??step.line??0;
        setCurLine(ln);
        setExecuted(prev=>{const s=new Set(prev);s.add(ln);return s;});
      }
    }
  },[playbackState.currentFrame,visualizationData]);

  if(lines.length===0) return <Wrap><Empty>No code loaded</Empty></Wrap>;

  return(
    <Wrap>
      <Head>
        <Dot $c="var(--accent-red)"/><Dot $c="var(--accent-amber)"/><Dot $c="var(--accent-green)"/>
        <FName>input.py</FName>
      </Head>
      <Body>
        {lines.map((line,i)=>{
          const n=i+1;
          return(
            <Line key={i} $active={curLine===n} $executed={executed.has(n)}>
              <LNum>{n}</LNum>
              <LContent>{line}</LContent>
            </Line>
          );
        })}
      </Body>
    </Wrap>
  );
};
