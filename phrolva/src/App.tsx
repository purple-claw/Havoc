// HAVOC — Main App with hash-based routing (zero extra dependencies)
// Routes: / (home), /playground, /gallery, /share/:id

import React, { useState, useEffect, useCallback } from 'react';
import GlobalStyles from './styles/GlobalStyles';
import HomePage from './pages/HomePage';
import PlaygroundPage from './pages/PlaygroundPage';
import GalleryPage from './pages/GalleryPage';
import SharedViewPage from './pages/SharedViewPage';

function getRoute(): { path: string; params: Record<string, string> } {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts[0] === 'playground') return { path: '/playground', params: {} };
  if (parts[0] === 'gallery') return { path: '/gallery', params: {} };
  if (parts[0] === 'share' && parts[1]) return { path: '/share', params: { id: parts[1] } };
  return { path: '/', params: {} };
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const [playgroundCode, setPlaygroundCode] = useState<string | undefined>(undefined);

  // Listen for hash changes
  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  const openCode = useCallback((code: string) => {
    setPlaygroundCode(code);
  }, []);

  switch (route.path) {
    case '/playground':
      return (
        <>
          <GlobalStyles />
          <PlaygroundPage
            onNavigate={navigate}
            initialCode={playgroundCode}
          />
        </>
      );
    case '/gallery':
      return (
        <>
          <GlobalStyles />
          <GalleryPage onNavigate={navigate} onOpenCode={openCode} />
        </>
      );
    case '/share':
      return (
        <>
          <GlobalStyles />
          <SharedViewPage shareId={route.params.id} onNavigate={navigate} />
        </>
      );
    default:
      return (
        <>
          <GlobalStyles />
          <HomePage onNavigate={navigate} />
        </>
      );
  }
}

export default App;
