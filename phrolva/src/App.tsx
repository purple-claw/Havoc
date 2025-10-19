// Main App component - the entry point to visualization paradise
// This is where the journey begins

import React from 'react';
import { AnimationOrchestrator } from './components/AnimationOrchestrator';
import GlobalStyles from './styles/GlobalStyles';

function App() {
  // In production, visualization data would be passed via props or loaded from API
  // For now, it loads from visualization.json file (output from Python backend)
  
  return (
    <>
      <GlobalStyles />
      <AnimationOrchestrator loadFromFile={true} />
    </>
  );
}

export default App;
