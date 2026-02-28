import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2 } },
};

function App() {
  const [route, setRoute] = useState(getRoute);
  const [playgroundCode, setPlaygroundCode] = useState<string | undefined>(undefined);
  const prevPath = useRef(route.path);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => { prevPath.current = route.path; }, [route.path]);

  const navigate = useCallback((path: string) => { window.location.hash = path; }, []);

  const openCode = useCallback((code: string) => {
    setPlaygroundCode(code);
    navigate('/playground');
  }, [navigate]);

  const renderPage = () => {
    switch (route.path) {
      case '/playground':
        return <PlaygroundPage key="playground" onNavigate={navigate} initialCode={playgroundCode} />;
      case '/gallery':
        return <GalleryPage key="gallery" onNavigate={navigate} onOpenCode={openCode} />;
      case '/share':
        return <SharedViewPage key="share" shareId={route.params.id} onNavigate={navigate} />;
      default:
        return <HomePage key="home" onNavigate={navigate} />;
    }
  };

  return (
    <>
      <GlobalStyles />
      <AnimatePresence mode="wait">
        <motion.div
          key={route.path}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ minHeight: '100vh' }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export default App;
