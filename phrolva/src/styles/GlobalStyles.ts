// Global styles - because CSS needs to be everywhere
// Dark theme by default because we're not savages

import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #0f0f23;
    color: white;
    overflow-x: hidden;
  }
  
  code {
    font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
  }
  
  /* Custom scrollbar because default is ugly */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }
  
  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  /* Utility classes */
  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .pulse {
    animation: pulse 2s ease-in-out infinite;
  }
  
  .slide-in {
    animation: slideIn 0.3s ease-out;
  }
`;

export default GlobalStyles;
