// HomePage — Landing page for HAVOC
// Hero section, feature highlights, quick-start button

import React from 'react';
import styled, { keyframes } from 'styled-components';

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  color: white;
  overflow-x: hidden;
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 15, 35, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const Logo = styled.h1`
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const NavLink = styled.a`
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: white;
  }
`;

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 100px 40px 80px;
  position: relative;
`;

const HeroBg = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
  pointer-events: none;
`;

const HeroTitle = styled.h1`
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 900;
  line-height: 1.1;
  margin: 0 0 20px;
  max-width: 800px;
  background: linear-gradient(135deg, #fff 0%, #667eea 50%, #f093fb 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${gradientShift} 6s ease-in-out infinite;
`;

const HeroSub = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: rgba(255, 255, 255, 0.6);
  max-width: 600px;
  line-height: 1.6;
  margin: 0 0 40px;
`;

const CTARow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const PrimaryBtn = styled.a`
  padding: 14px 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }
`;

const SecondaryBtn = styled.a`
  padding: 14px 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

const Features = styled.section`
  padding: 80px 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 28px;
  transition: all 0.3s;
  animation: ${float} 6s ease-in-out infinite;

  &:nth-child(2) { animation-delay: -2s; }
  &:nth-child(3) { animation-delay: -4s; }

  &:hover {
    border-color: rgba(102, 126, 234, 0.3);
    background: rgba(102, 126, 234, 0.04);
    transform: translateY(-4px);
  }
`;

const FeatureIcon = styled.div`
  font-size: 36px;
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #fff;
`;

const FeatureDesc = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
`;

const DSGrid = styled.section`
  padding: 60px 40px 80px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
`;

const DSTitle = styled.h2`
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 12px;
`;

const DSSub = styled.p`
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 36px;
`;

const DSChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const DSChip = styled.span`
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    color: #667eea;
    background: rgba(102, 126, 234, 0.08);
  }
`;

const Footer = styled.footer`
  padding: 24px 40px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
`;

interface HomePageProps {
  onNavigate: (path: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const DATA_STRUCTURES = [
    'Arrays', 'Graphs', 'Strings', 'Stacks', 'Queues',
    'Linked Lists', 'Binary Trees', 'Heaps', 'Matrices',
    'Hash Maps', 'Sets', 'BSTs', 'AVL Trees', 'DP Tables',
  ];

  return (
    <Page>
      <Nav>
        <Logo>HAVOC</Logo>
        <NavLinks>
          <NavLink href="#" onClick={() => onNavigate('/playground')}>Playground</NavLink>
          <NavLink href="#" onClick={() => onNavigate('/gallery')}>Gallery</NavLink>
          <NavLink
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </NavLink>
        </NavLinks>
      </Nav>

      <Hero>
        <HeroBg />
        <HeroTitle>See Your Code Come Alive</HeroTitle>
        <HeroSub>
          HAVOC traces Python code step-by-step and turns it into beautiful, interactive
          physics-driven animations. Understand any algorithm from the inside out.
        </HeroSub>
        <CTARow>
          <PrimaryBtn onClick={() => onNavigate('/playground')}>
            Open Playground
          </PrimaryBtn>
          <SecondaryBtn onClick={() => onNavigate('/gallery')}>
            Browse Examples
          </SecondaryBtn>
        </CTARow>
      </Hero>

      <Features>
        <FeatureCard>
          <FeatureIcon>⚡</FeatureIcon>
          <FeatureTitle>AST-Level Tracing</FeatureTitle>
          <FeatureDesc>
            Every assignment, branch, and function call is captured. Supports 10,000+ line
            files and generates animations lasting 10+ minutes.
          </FeatureDesc>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🎨</FeatureIcon>
          <FeatureTitle>12 Visual Adapters</FeatureTitle>
          <FeatureDesc>
            Purpose-built animations for arrays, graphs, trees, heaps, hash maps, matrices,
            linked lists, stacks, queues, sets, strings, and more.
          </FeatureDesc>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🧠</FeatureIcon>
          <FeatureTitle>AI Explanations</FeatureTitle>
          <FeatureDesc>
            Free-tier AI detects your algorithm and generates plain-English explanations
            with complexity analysis, analogies, and learning paths.
          </FeatureDesc>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🔒</FeatureIcon>
          <FeatureTitle>Secure Sandbox</FeatureTitle>
          <FeatureDesc>
            AST-validated code execution with blocked dangerous imports, restricted builtins,
            memory limits, and per-IP rate limiting.
          </FeatureDesc>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🚀</FeatureIcon>
          <FeatureTitle>Zero Cost Deployment</FeatureTitle>
          <FeatureDesc>
            Runs entirely on free tiers — Vercel for frontend, Render for backend, and
            free AI APIs. Enterprise quality at zero expense.
          </FeatureDesc>
        </FeatureCard>

        <FeatureCard>
          <FeatureIcon>🔗</FeatureIcon>
          <FeatureTitle>Share & Embed</FeatureTitle>
          <FeatureDesc>
            Generate unique share links for any visualization. Content-addressed URLs mean
            the same code always produces the same link.
          </FeatureDesc>
        </FeatureCard>
      </Features>

      <DSGrid>
        <DSTitle>Every Data Structure. Every Algorithm.</DSTitle>
        <DSSub>Auto-detected from your code — no configuration needed.</DSSub>
        <DSChips>
          {DATA_STRUCTURES.map((ds) => (
            <DSChip key={ds}>{ds}</DSChip>
          ))}
        </DSChips>
      </DSGrid>

      <Footer>
        HAVOC — Helping Algo Visualization Orchestrate Comprehension
      </Footer>
    </Page>
  );
};

export default HomePage;
