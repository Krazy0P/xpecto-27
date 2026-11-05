import { Suspense, useState, useCallback, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlitchNav from './components/GlitchNav';
import Footer from './components/Footer';
import Loader from './components/Loader';
import TvStaticTransition from './components/TvStaticTransition';
import AppRoutes from './routes';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Lazy-load heavy 3D components
const SpaceTimeIntro = lazy(() => import('./components/SpaceTimeIntro'));
const SpaceTimeBg = lazy(() => import('./components/SpaceTimeBg'));

const KEY = 'xpecto_intro_seen';

// Map routes to page keys for per-page 3D backgrounds
const routeToPage = (pathname) => {
  if (pathname === '/' || pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/workshops')) return 'workshops';
  if (pathname.startsWith('/sponsors')) return 'sponsors';
  if (pathname.startsWith('/team')) return 'team';
  if (pathname.startsWith('/about')) return 'about';
  return 'home';
};

/** Shell: 3D Space-Time intro + per-page backgrounds, glitch navbar, page transitions. */
export default function App() {
  const location = useLocation();
  const [intro, setIntro] = useState(() => !sessionStorage.getItem(KEY));
  const [introGlitchTrigger, setIntroGlitchTrigger] = useState(0);

  const finishIntro = useCallback(() => {
    sessionStorage.setItem(KEY, '1');
    setIntro(false);
    setIntroGlitchTrigger(trigger => trigger + 1);
  }, []);

  const page = routeToPage(location.pathname);

  return (
    <div className="app-shell">
      <ScrollToTop />
      {!intro && <TvStaticTransition page={page} triggerKey={introGlitchTrigger} />}

      {/* Per-page 3D background */}
      {!intro && (
        <Suspense fallback={null}>
          <SpaceTimeBg page={page} dim={location.pathname !== '/'} />
        </Suspense>
      )}

      {/* Vignette + grain overlays */}
      <div className="st-vignette" />
      <div className="st-grain" />

      {/* 3D Intro (once per session) */}
      {intro && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999 }} />}>
          <SpaceTimeIntro onDone={finishIntro} />
        </Suspense>
      )}

      {/* Navbar (hidden during intro) */}
      {!intro && <GlitchNav />}

      {/* Page content - Instantaneous navigation with sleek entrance */}
      <main id="main" style={{ paddingTop: intro ? 0 : 60 }}>
        <Suspense fallback={<Loader />}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <AppRoutes location={location} />
          </motion.div>
        </Suspense>
      </main>

      {!intro && (
        <footer className="st-footer">
          <p>XPECTO'27 · TECHFEST OF IIT MANDI · BROKEN SPACE-TIME EDITION</p>
          <p style={{ marginTop: '.5rem', opacity: 0.5 }}>© 2027 All rights reserved</p>
        </footer>
      )}
    </div>
  );
}
