import { motion } from 'motion/react';
import ParticleBackground from './ParticleBackground';

/** Premium 3D glowing title: extruded back layer + metallic gradient front, popping out of the centre with flame embers. */
export default function FireText({ children = 'XPECTO' }) {
  return (
    <div className="fire-wrap">
      <ParticleBackground fire count={window.innerWidth < 700 ? 55 : 110} className="fire-canvas" />
      <motion.div className="fire-stack" style={{ transformPerspective: 900 }}
        initial={{ scale: 0.1, opacity: 0, filter: 'blur(24px)', rotateX: 60 }}
        animate={{ scale: [0.1, 1.35, 1], opacity: 1, filter: 'blur(0px)', rotateX: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
        <span className="fire-word fw-back" aria-hidden="true">{children}</span>
        <h1 className="fire-word">{children}</h1>
      </motion.div>
    </div>
  );
}
