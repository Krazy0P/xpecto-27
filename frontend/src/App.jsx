import { Suspense, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import SideDock from './components/SideDock';
import Footer from './components/Footer';
import Loader from './components/Loader';
import IntroSequence from './components/IntroSequence';
import ParticleBackground from './components/ParticleBackground';
import ParallaxBackground from './components/ParallaxBackground';
import RevealObserver from './components/RevealObserver';
import TiltObserver from './components/TiltObserver';
import AppRoutes from './routes';

const KEY = 'xpecto_intro_seen';

/** Shell: ember background, intro (once per session), sticky navbar, page transitions, footer. */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(() => !sessionStorage.getItem(KEY));
  const finishIntro = useCallback(() => {
    sessionStorage.setItem(KEY, '1'); setIntro(false); navigate('/', { replace: true });
  }, [navigate]);

  return (
    <div className="app-shell">
      <div className="scroll-bar" aria-hidden="true" />
      <ParallaxBackground />
      <div key={location.pathname} className="route-sweep" aria-hidden="true" />
      <RevealObserver />
      <TiltObserver />
      <ParticleBackground className="bg-embers" count={window.innerWidth < 700 ? 18 : 40} />
      <AnimatePresence>{intro && <IntroSequence key="intro" onDone={finishIntro} />}</AnimatePresence>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <SideDock />
      <main id="main">
        <Suspense fallback={<Loader />}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <AppRoutes location={location} />
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
