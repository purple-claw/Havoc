import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ExecutionStep } from '../types/animation.types';

/* ───── shell ───── */
const Panel = styled.div`
  background:var(--bg-elevated);border-radius:var(--radius-lg);
  border:1px solid var(--glass-border);overflow:hidden;
`;
const Head = styled.div`
  padding:8px 16px;display:flex;justify-content:space-between;align-items:center;
  background:var(--bg-card);border-bottom:1px solid var(--glass-border);
`;
const Title = styled.span`font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary);font-weight:600;`;
const StepBadge = styled.span`
  font-size:10.5px;padding:2px 7px;border-radius:4px;
  background:var(--accent-green-dim);color:var(--accent-green);
  font-family:var(--font-mono);
`;

const Body = styled.div`max-height:300px;overflow-y:auto;`;

const Row = styled.div<{$changed?:boolean;$new?:boolean}>`
  display:grid;grid-template-columns:100px 52px 1fr;gap:6px;
  padding:5px 16px;font-size:11.5px;
  border-bottom:1px solid rgba(255,255,255,0.02);
  background:${p=>p.$new?'rgba(0,230,118,0.03)':'transparent'};
  transition:background .2s;
  &:hover{background:rgba(255,255,255,0.015);}
`;
const VarName = styled.span<{$changed?:boolean;$new?:boolean}>`
  font-family:var(--font-mono);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:${p=>p.$new?'var(--accent-green)':p.$changed?'var(--accent-cyan)':'var(--text-primary)'};
`;
const VarType = styled.span`color:var(--text-tertiary);font-family:var(--font-mono);font-size:10px;`;
const VarVal = styled.span<{$changed?:boolean}>`
  font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:${p=>p.$changed?'var(--accent-red)':'var(--text-secondary)'};
`;
const Dot = styled.span<{$c:string}>`
  display:inline-block;width:5px;height:5px;border-radius:50%;
  background:${p=>p.$c};margin-right:3px;vertical-align:middle;
`;
const Empty = styled.div`padding:16px;text-align:center;color:var(--text-tertiary);font-size:11.5px;`;

/* ───── helpers ───── */
function inferType(v:any):string{
  if(v===null||v===undefined)return'None';
  if(Array.isArray(v))return'list';
  if(typeof v==='object')return'dict';
  if(typeof v==='number')return Number.isInteger(v)?'int':'float';
  if(typeof v==='boolean')return'bool';
  if(typeof v==='string')return'str';
  return typeof v;
}
function fmt(v:any):string{
  if(v===null||v===undefined)return'None';
  if(typeof v==='string')return`"${v}"`;
  if(Array.isArray(v)){
    if(v.length>8)return`[${v.slice(0,6).map(fmt).join(', ')}, … +${v.length-6}]`;
    return`[${v.map(fmt).join(', ')}]`;
  }
  if(typeof v==='object'){
    const e=Object.entries(v);
    if(e.length>5)return`{${e.slice(0,4).map(([k,val])=>`${k}: ${fmt(val)}`).join(', ')}, …}`;
    return`{${e.map(([k,val])=>`${k}: ${fmt(val)}`).join(', ')}}`;
  }
  return String(v);
}

/* ───── component ───── */
interface VariableInspectorProps { currentStep?:ExecutionStep|null; previousStep?:ExecutionStep|null; }

const VariableInspector:React.FC<VariableInspectorProps> = ({ currentStep, previousStep }) => {
  const vars = useMemo(()=>{
    if(!currentStep) return [];
    const prev=previousStep?.variables||{};
    return Object.entries(currentStep.variables||{})
      .filter(([n])=>!n.startsWith('__'))
      .map(([name,value])=>{
        const isNew=!(name in prev);
        const isChanged=!isNew&&JSON.stringify(prev[name])!==JSON.stringify(value);
        return{name,value,type:inferType(value),formatted:fmt(value),isNew,isChanged};
      })
      .sort((a,b)=>{
        if(a.isNew!==b.isNew)return a.isNew?-1:1;
        if(a.isChanged!==b.isChanged)return a.isChanged?-1:1;
        return a.name.localeCompare(b.name);
      });
  },[currentStep,previousStep]);

  return(
    <Panel>
      <Head>
        <Title>Variables</Title>
        {currentStep&&<StepBadge>Line {currentStep.line||currentStep.line_number}</StepBadge>}
      </Head>
      <Body>
        {vars.length===0
          ?<Empty>No variables in scope</Empty>
          :vars.map(v=>(
            <Row key={v.name} $changed={v.isChanged} $new={v.isNew}>
              <VarName $changed={v.isChanged} $new={v.isNew}>
                {v.isNew&&<Dot $c="var(--accent-green)"/>}
                {v.isChanged&&!v.isNew&&<Dot $c="var(--accent-cyan)"/>}
                {v.name}
              </VarName>
              <VarType>{v.type}</VarType>
              <VarVal $changed={v.isChanged} title={v.formatted}>{v.formatted}</VarVal>
            </Row>
          ))
        }
      </Body>
    </Panel>
  );
};

export default VariableInspector;
