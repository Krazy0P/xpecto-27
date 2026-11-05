import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/** Cinematic impact at the fingertip contact point: white flash, light streak, shockwave rings, spark particles. */
export default function LightBurst() {
  const box = useRef(null);
  const cv = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = cv.current, ctx = c.getContext('2d');
    const { left: ox, top: oy } = box.current.getBoundingClientRect(); // contact point in viewport px
    c.width = innerWidth; c.height = innerHeight;
    const ps = Array.from({ length: 150 }, () => {
      const a = Math.random() * 6.283, s = Math.random() * 10 + 2;
      return { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: Math.random() * 2.2 + .6, h: Math.random() < .6 ? 48 : 190 };
    });
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height); ctx.globalCompositeOperation = 'lighter'; let alive = 0;
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vx *= .965; p.vy *= .965; p.life -= .012;
        if (p.life <= 0) return; alive++;
        ctx.fillStyle = `hsla(${p.h},100%,65%,${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
      if (alive) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={box} className="burst" aria-hidden="true">
      <canvas ref={cv} className="burst-canvas" />
      <motion.i className="flash" initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.2, 7], opacity: [1, 1, 0] }} transition={{ duration: 1.2, times: [0, .18, 1] }} />
      <motion.i className="streak" initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: [0, 1, 1], opacity: [1, .9, 0] }} transition={{ duration: 1 }} />
      {[0, .18, .36].map(d => <motion.i key={d} className="wave" initial={{ scale: 0, opacity: .9 }} animate={{ scale: 10, opacity: 0 }} transition={{ duration: 1.5, delay: d, ease: 'easeOut' }} />)}
    </div>
  );
}
