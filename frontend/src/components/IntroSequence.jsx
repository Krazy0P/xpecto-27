import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import FireText from './FireText';
import LightBurst from './LightBurst';
import handsImg from '../assets/hands.jpg'; // replace this file to change the intro / site background image

const DURATION = 7200;

/**
 * Timeline: 0-3s human hand (left) and robot hand (right) drift toward each other
 *  -> 3.0s fingertips meet: light burst + shockwaves -> 3.35s "XPECTO'27" pops out in 3D glow
 *  -> 7.2s wipe to About. The two hands are the left/right halves of one photo, so they join seamlessly.
 */
export default function IntroSequence({ onDone }) {
  const [step, setStep] = useState(0);
  const [fest, setFest] = useState(null);
  const done = useRef(onDone); done.current = onDone; // stable timers even if the parent re-renders
  useEffect(() => {
    api.getFest().then(setFest).catch(() => {});
    const t = [setTimeout(() => setStep(1), 3000), setTimeout(() => setStep(2), 3350), setTimeout(() => done.current(), DURATION)];
    return () => t.forEach(clearTimeout);
  }, []);

  const year = `'${fest?.startDate ? String(new Date(fest.startDate).getFullYear()).slice(2) : '27'}`;
  const hand = side => (
    <motion.div className={`hand ${side}`} style={{ backgroundImage: `url(${handsImg})` }} role="img"
      aria-label={side === 'l' ? 'Human hand reaching out' : 'Robot hand reaching out'}
      initial={{ x: side === 'l' ? '-75%' : '75%', opacity: 0 }}
      animate={{ x: 0, opacity: step >= 2 ? 0.25 : 1, scale: step >= 2 ? 1.12 : 1, filter: step >= 2 ? 'blur(3px)' : 'blur(0px)' }}
      transition={{ x: { duration: 3, ease: [0.45, 0, 0.25, 1] }, opacity: { duration: step >= 2 ? 0.8 : 1.6 }, scale: { duration: 1.2 }, filter: { duration: 0.8 } }} />
  );

  return (
    <motion.div className="intro" role="dialog" aria-label="XPECTO intro" exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.7, ease: 'easeInOut' }}>
      {fest?.heroImageUrl && <img className="intro-bg" src={fest.heroImageUrl} alt="" />}
      <div className="speed-lines intro-lines" />
      <button className="btn-slash intro-skip" onClick={onDone}>Skip</button>
      <motion.div className="stage" animate={step === 1 ? { x: [0, -7, 6, -3, 0] } : {}} transition={{ duration: 0.4 }}>
        {hand('l')}{hand('r')}
        <div className="contact">{step >= 1 && <LightBurst />}</div>
        {step >= 2 && <div className="intro-title"><FireText>{`${fest?.name || 'XPECTO'}${year}`}</FireText></div>}
      </motion.div>
    </motion.div>
  );
}
