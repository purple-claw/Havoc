import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { Play, Layers, Brain, Shield, Code2, Share2, Terminal, ArrowRight, Sparkles, Upload, StepForward } from 'lucide-react';

const gradientMove = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
const gridPulse = keyframes`
  0%, 100% { opacity: 0.03; }
  50%      { opacity: 0.06; }
`;
const orbFloat = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(30px, -40px) scale(1.1); }
  66%  { transform: translate(-20px, 20px) scale(0.95); }
  100% { transform: translate(0, 0) scale(1); }
`;

/* ─── layout ─── */
const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-primary);
  position: relative;
  overflow-x: hidden;
`;
const GridBg = styled.div`
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: ${gridPulse} 8s ease-in-out infinite;
  pointer-events: none; z-index: 0;
`;
const Orb = styled.div<{$c:string;$s:number;$t:string;$l:string;$d:string}>`
  position: fixed;
  width: ${p=>p.$s}px; height: ${p=>p.$s}px;
  border-radius: 50%;
  background: ${p=>p.$c};
  filter: blur(${p=>p.$s*0.6}px);
  opacity: 0.1;
  animation: ${orbFloat} 20s ease-in-out infinite;
  animation-delay: ${p=>p.$d};
  top: ${p=>p.$t}; left: ${p=>p.$l};
  pointer-events: none; z-index: 0;
`;
const Content = styled.div`position: relative; z-index: 1;`;

/* ─── nav ─── */
const Nav = styled.nav`
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 32px; height: 48px;
  position: sticky; top: 0; z-index: 100;
  background: rgba(5,5,5,0.6);
  backdrop-filter: blur(20px) saturate(1.4);
  border-bottom: 1px solid var(--glass-border);
`;
const LogoWrap = styled.div`display: flex; align-items: center; gap: 10px;`;
const LogoIcon = styled.div`
  width: 24px; height: 24px; border-radius: 6px;
  background: linear-gradient(135deg, var(--accent-green), #009688);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #000;
`;
const LogoText = styled.span`font-size: 15px; font-weight: 700; letter-spacing: 0.5px;`;
const NavLinks = styled.div`display: flex; align-items: center; gap: 4px;`;
const NavBtn = styled.button<{$accent?:boolean}>`
  padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 12.5px; font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  display: inline-flex; align-items: center; gap: 5px;
  &:hover { color: var(--text-primary); background: var(--glass); }
  ${p=>p.$accent&&css`
    background: var(--accent-green); color: #000; font-weight: 600;
    &:hover { background: #00c866; color: #000; }
  `}
`;

/* ─── hero ─── */
const Hero = styled.section`
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 80px 24px 56px;
  max-width: 740px; margin: 0 auto;
`;
const Badge = styled(motion.div)`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px 5px 8px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
  color: var(--accent-green); background: var(--accent-green-dim);
  border: 1px solid rgba(0,230,118,0.15); margin-bottom: 24px;
`;
const HeroTitle = styled(motion.h1)`
  font-size: clamp(32px, 5vw, 52px); font-weight: 800;
  line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 16px;
`;
const GreenSpan = styled.span`
  background: linear-gradient(135deg, var(--accent-green), var(--accent-cyan));
  background-size: 200% 200%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; animation: ${gradientMove} 6s ease-in-out infinite;
`;
const HeroSub = styled(motion.p)`
  font-size: 15px; line-height: 1.7; color: var(--text-secondary);
  max-width: 480px; margin-bottom: 28px;
`;
const CTARow = styled(motion.div)`display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;`;
const PrimaryBtn = styled.button`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 24px; border-radius: var(--radius-md);
  background: var(--accent-green); color: #000;
  font-size: 13.5px; font-weight: 700;
  transition: all var(--transition-base);
  &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,230,118,0.25); }
  &:active { transform: scale(0.97); }
`;
const SecondaryBtn = styled.button`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 24px; border-radius: var(--radius-md);
  background: var(--glass); border: 1px solid var(--glass-border);
  color: var(--text-primary); font-size: 13.5px; font-weight: 600;
  transition: all var(--transition-base);
  &:hover { background: var(--glass-hover); transform: translateY(-1px); }
`;

/* ─── how it works ─── */
const HowSection = styled.section`
  max-width: 880px; margin: 0 auto; padding: 0 24px 80px;
`;
const SectionTag = styled.div`
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--accent-green); margin-bottom: 10px;
`;
const SectionTitle = styled.h2`
  font-size: clamp(22px, 3vw, 30px); font-weight: 800;
  letter-spacing: -0.02em; margin-bottom: 6px;
`;
const SectionSub = styled.p`
  font-size: 13.5px; color: var(--text-secondary); max-width: 440px; margin: 0 auto;
`;
const SectionHead = styled.div`text-align: center; margin-bottom: 40px;`;

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  @media(max-width: 768px) { grid-template-columns: 1fr; }
`;
const StepCard = styled(motion.div)`
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 28px 22px;
  text-align: center;
  transition: all var(--transition-base);
  &:hover {
    background: var(--bg-card-hover);
    border-color: rgba(255,255,255,0.08);
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
  }
`;
const StepNum = styled.div`
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800;
  background: var(--accent-green-dim);
  color: var(--accent-green);
  margin: 0 auto 14px;
`;
const StepTitle = styled.h3`font-size: 14px; font-weight: 700; margin-bottom: 6px;`;
const StepDesc = styled.p`font-size: 12px; line-height: 1.6; color: var(--text-secondary);`;

/* ─── features ─── */
const FeatSection = styled.section`max-width: 960px; margin: 0 auto; padding: 0 24px 80px;`;
const FGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  @media(max-width:768px){ grid-template-columns: 1fr; }
`;
const GCard = styled(motion.div)`
  background: var(--bg-card); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); padding: 24px;
  transition: all var(--transition-base);
  &:hover {
    background: var(--bg-card-hover); border-color: rgba(255,255,255,0.1);
    transform: translateY(-2px); box-shadow: var(--shadow-card);
  }
`;
const FIconWrap = styled.div<{$bg:string}>`
  width: 36px; height: 36px; border-radius: var(--radius-md);
  background: ${p=>p.$bg}; display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
`;
const FTitle = styled.h3`font-size: 13.5px; font-weight: 700; margin-bottom: 5px;`;
const FDesc = styled.p`font-size: 12px; line-height: 1.6; color: var(--text-secondary);`;

/* ─── DS chips ─── */
const DSSection = styled.section`max-width: 700px; margin: 0 auto; padding: 0 24px 80px; text-align: center;`;
const ChipWrap = styled.div`display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 24px;`;
const Chip = styled(motion.span)`
  padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 500;
  background: var(--bg-card); border: 1px solid var(--glass-border);
  color: var(--text-secondary); transition: all var(--transition-fast); cursor: default;
  &:hover { color: var(--accent-green); border-color: rgba(0,230,118,0.25); background: var(--accent-green-dim); }
`;

/* ─── footer ─── */
const Footer = styled.footer`padding: 24px 24px; text-align: center; font-size: 11px; color: var(--text-tertiary);`;

/* ─── data ─── */
const FEATURES = [
  { icon: <StepForward size={15}/>, bg: 'var(--accent-green-dim)', title: 'Step-by-Step Debugging', desc: 'Step forward and backward through every line. Watch animations update in real time.' },
  { icon: <Layers size={15}/>, bg: 'var(--accent-red-dim)', title: '12 Visual Adapters', desc: 'Arrays, trees, graphs, heaps, hash maps, matrices, linked lists, stacks, queues, sets.' },
  { icon: <Brain size={15}/>, bg: 'rgba(24,255,255,0.12)', title: 'AI Explanations', desc: 'Plain-English explanations, complexity analysis, analogies, and learning paths.' },
  { icon: <Shield size={15}/>, bg: 'rgba(255,215,64,0.12)', title: 'Secure Sandbox', desc: 'AST-validated execution, blocked imports, restricted builtins, per-IP rate limiting.' },
  { icon: <Upload size={15}/>, bg: 'var(--accent-green-dim)', title: 'Upload & Visualize', desc: 'Drag-and-drop .py files or paste code. The engine auto-detects data structures.' },
  { icon: <Share2 size={15}/>, bg: 'var(--accent-red-dim)', title: 'Share & Embed', desc: 'Content-addressed links. Same code always produces the same shareable URL.' },
];
const DS = ['Arrays','Graphs','Trees','Stacks','Queues','Linked Lists','Heaps','Matrices','Hash Maps','Sets','Strings','BSTs'];

const STEPS = [
  { num: '1', title: 'Write or Upload Code', desc: 'Paste Python code, upload a .py file, or pick from the gallery.' },
  { num: '2', title: 'Engine Parses & Traces', desc: 'HAVOC traces every line, captures variables, and maps data to visual adapters.' },
  { num: '3', title: 'Step & Watch Live', desc: 'Step forward/backward like a debugger. See animations move in real time.' },
];

interface HomePageProps { onNavigate: (path: string) => void; }

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => (
  <Page>
    <GridBg />
    <Orb $c="var(--accent-green)" $s={400} $t="8%" $l="65%" $d="0s" />
    <Orb $c="var(--accent-red)" $s={300} $t="55%" $l="12%" $d="-7s" />
    <Orb $c="var(--accent-cyan)" $s={220} $t="78%" $l="72%" $d="-13s" />
    <Content>
      <Nav>
        <LogoWrap><LogoIcon>H</LogoIcon><LogoText>HAVOC</LogoText></LogoWrap>
        <NavLinks>
          <NavBtn onClick={()=>onNavigate('/gallery')}>Gallery</NavBtn>
          <NavBtn onClick={()=>onNavigate('/playground')}>Playground</NavBtn>
          <NavBtn $accent onClick={()=>onNavigate('/playground')}><Play size={12}/> Start</NavBtn>
        </NavLinks>
      </Nav>

      <Hero>
        <Badge initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:0.1}}>
          <Sparkles size={11}/> Real-Time Algorithm Debugger
        </Badge>
        <HeroTitle initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15,duration:0.6}}>
          Debug Algorithms<br/><GreenSpan>Visually</GreenSpan>
        </HeroTitle>
        <HeroSub initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.25,duration:0.6}}>
          Upload Python code. Step through it line by line. Watch data structures animate in real time — like a visual debugger for algorithms.
        </HeroSub>
        <CTARow initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35,duration:0.5}}>
          <PrimaryBtn onClick={()=>onNavigate('/playground')}><Terminal size={14} strokeWidth={2.5}/> Open Playground</PrimaryBtn>
          <SecondaryBtn onClick={()=>onNavigate('/gallery')}>Browse Examples <ArrowRight size={13}/></SecondaryBtn>
        </CTARow>
      </Hero>

      <HowSection>
        <SectionHead>
          <SectionTag>How It Works</SectionTag>
          <SectionTitle>Three Steps to Understanding</SectionTitle>
          <SectionSub>From code to live visualization in seconds.</SectionSub>
        </SectionHead>
        <StepsGrid>
          {STEPS.map((s, i) => (
            <StepCard key={s.num} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1,duration:0.45}}>
              <StepNum>{s.num}</StepNum>
              <StepTitle>{s.title}</StepTitle>
              <StepDesc>{s.desc}</StepDesc>
            </StepCard>
          ))}
        </StepsGrid>
      </HowSection>

      <FeatSection>
        <SectionHead>
          <SectionTag>Features</SectionTag>
          <SectionTitle>Built for Understanding</SectionTitle>
          <SectionSub>Every tool you need to visualize, debug, and learn algorithms.</SectionSub>
        </SectionHead>
        <FGrid>
          {FEATURES.map((f,i)=>(
            <GCard key={f.title} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.06,duration:0.45}}>
              <FIconWrap $bg={f.bg}>{f.icon}</FIconWrap>
              <FTitle>{f.title}</FTitle>
              <FDesc>{f.desc}</FDesc>
            </GCard>
          ))}
        </FGrid>
      </FeatSection>

      <DSSection>
        <SectionTag>Supported</SectionTag>
        <SectionTitle>Every Data Structure. Every Algorithm.</SectionTitle>
        <SectionSub>Auto-detected from your code — zero configuration.</SectionSub>
        <ChipWrap>
          {DS.map((d,i)=>(
            <Chip key={d} initial={{opacity:0,scale:0.9}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.03,duration:0.3}}>
              {d}
            </Chip>
          ))}
        </ChipWrap>
      </DSSection>

      <Footer>HAVOC — Hypnotic Algorithm Visualization Of Code</Footer>
    </Content>
  </Page>
);

export default HomePage;
