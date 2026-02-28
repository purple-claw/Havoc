import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root {
    --bg-primary: #050505;
    --bg-elevated: #0a0a0a;
    --bg-card: rgba(255,255,255,0.025);
    --bg-card-hover: rgba(255,255,255,0.04);
    --glass: rgba(255,255,255,0.03);
    --glass-border: rgba(255,255,255,0.06);
    --glass-hover: rgba(255,255,255,0.08);
    --accent-green: #00e676;
    --accent-green-dim: rgba(0,230,118,0.12);
    --accent-red: #ff5252;
    --accent-red-dim: rgba(255,82,82,0.12);
    --accent-cyan: #18ffff;
    --accent-amber: #ffd740;
    --text-primary: #f5f5f5;
    --text-secondary: rgba(255,255,255,0.55);
    --text-tertiary: rgba(255,255,255,0.3);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-2xl: 24px;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25);
    --shadow-elevated: 0 4px 12px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.35);
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
    line-height: 1.5;
    letter-spacing: -0.01em;
  }

  code, pre, .mono {
    font-family: var(--font-mono);
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: var(--font-sans);
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
  }

  input, textarea, select {
    font-family: var(--font-sans);
    color: inherit;
    background: none;
    border: none;
    outline: none;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.14);
  }

  ::selection {
    background: rgba(0,230,118,0.25);
    color: #fff;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,118,0.2); }
    50%      { box-shadow: 0 0 20px 4px rgba(0,230,118,0.1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default GlobalStyles;
