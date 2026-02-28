import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Home, Play, LayoutGrid, AlertTriangle } from 'lucide-react';
import { AnimationOrchestrator } from '../components/AnimationOrchestrator';
import { api } from '../services/api';
import type { VisualizationData } from '../types/animation.types';

const spin = keyframes`to{transform:rotate(360deg)}`;

const Page = styled.div`min-height:100vh;background:var(--bg-primary);display:flex;flex-direction:column;`;

const Nav = styled.nav`
  display:flex;justify-content:space-between;align-items:center;
  padding:0 28px;height:52px;flex-shrink:0;
  background:rgba(5,5,5,0.6);backdrop-filter:blur(20px) saturate(1.4);
  border-bottom:1px solid var(--glass-border);z-index:50;
`;
const LogoWrap = styled.div`display:flex;align-items:center;gap:10px;cursor:pointer;`;
const LogoIcon = styled.div`
  width:24px;height:24px;border-radius:6px;font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--accent-green),#009688);color:#000;
`;
const LogoText = styled.span`font-size:14px;font-weight:700;letter-spacing:.5px;`;
const NavLinks = styled.div`display:flex;gap:4px;`;
const NavBtn = styled.button`
  padding:6px 14px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:500;
  color:var(--text-secondary);display:inline-flex;align-items:center;gap:6px;
  transition:all var(--transition-fast);
  &:hover{color:var(--text-primary);background:var(--glass);}
`;

const Center = styled.div`flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;`;

const Spinner = styled.div`
  width:32px;height:32px;border-radius:50%;
  border:2.5px solid rgba(0,230,118,0.15);border-top-color:var(--accent-green);
  animation:${spin} .7s linear infinite;
`;

const ErrorCard = styled.div`
  padding:28px 40px;border-radius:var(--radius-lg);text-align:center;max-width:440px;
  background:var(--bg-card);border:1px solid rgba(255,82,82,0.15);
`;
const ErrTitle = styled.h3`font-size:15px;margin:0 0 6px;color:var(--accent-red);`;
const ErrMsg = styled.p`font-size:13px;color:var(--text-secondary);margin:0;`;

interface SharedViewPageProps { shareId:string; onNavigate:(p:string)=>void; }

const SharedViewPage:React.FC<SharedViewPageProps> = ({ shareId, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [vizData, setVizData] = useState<VisualizationData|null>(null);

  useEffect(()=>{
    (async()=>{
      try{
        setLoading(true); setError(null);
        const shared = await api.getShared(shareId);
        if(!shared||!shared.code){ setError('Share link is invalid or has expired.'); return; }
        const res = await api.execute(shared.code,{explain:true});
        if(!res.success){ setError(res.error||'Failed to visualize shared code'); return; }
        setVizData({metadata:res.metadata,execution:res.execution,animations:res.animations,visualizer_config:res.visualizer_config,explanations:res.explanations,source_code:shared.code});
      }catch(e:any){ setError(e.message||'Failed to load shared visualization'); }
      finally{ setLoading(false); }
    })();
  },[shareId]);

  return(
    <Page>
      <Nav>
        <LogoWrap onClick={()=>onNavigate('/')}><LogoIcon>H</LogoIcon><LogoText>HAVOC</LogoText></LogoWrap>
        <NavLinks>
          <NavBtn onClick={()=>onNavigate('/playground')}><Play size={13}/>Playground</NavBtn>
          <NavBtn onClick={()=>onNavigate('/gallery')}><LayoutGrid size={13}/>Gallery</NavBtn>
        </NavLinks>
      </Nav>

      {loading && <Center><Spinner/><span style={{fontSize:13,color:'var(--text-tertiary)'}}>Loading shared visualization…</span></Center>}

      {error && <Center><ErrorCard><ErrTitle><AlertTriangle size={14} style={{verticalAlign:-2}}/> Could not load</ErrTitle><ErrMsg>{error}</ErrMsg></ErrorCard></Center>}

      {!loading && !error && vizData && <div style={{flex:1}}><AnimationOrchestrator visualizationData={vizData} loadFromFile={false}/></div>}
    </Page>
  );
};

export default SharedViewPage;
