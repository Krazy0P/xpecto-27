import { useEffect, useRef } from 'react';

const GRID = 64; // px, must match .bg-grid background-size

/**
 * Cinematic depth behind every page. Back to front: photo (slow push-in + drift), glow orbs, perspective grid,
 * fog bands (counter-moving), static vignette. One passive scroll listener -> one rAF -> transforms on 4 refs.
 * No React state, no per-frame layout reads. The grid repeats so it scrolls forever via modulo; the rest travel by scroll progress.
 */
export default function ParallaxBackground() {
  const photo = useRef(null), grid = useRef(null), orbs = useRef(null), fog = useRef(null);
  useEffect(() => {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let max = 1, vh = innerHeight, ticking = false, last = -1;
    const measure = () => { vh = innerHeight; max = Math.max(1, root.scrollHeight - vh); last = -1; apply(); };
    function apply() {
      ticking = false;
      const y = window.scrollY;
      root.classList.toggle('scrolled', y > 24); // header solidifies after scrolling
      if (reduce || y === last) return; last = y;
      const q = Math.min(1, Math.max(0, y / max)), p = q - 0.5; // q 0..1, p -0.5..0.5
      photo.current.style.transform = `translate3d(${(-p * 36).toFixed(1)}px,${(-p * vh * 0.1).toFixed(1)}px,0) scale(${(1.04 + q * 0.1).toFixed(3)})`; // slow push-in
      orbs.current.style.transform = `translate3d(0,${(-p * vh * 0.4).toFixed(1)}px,0)`;
      grid.current.style.transform = `translate3d(0,${(-(y * 0.16) % GRID).toFixed(1)}px,0)`;
      fog.current.style.transform = `translate3d(${(p * 60).toFixed(1)}px,${(p * vh * 0.3).toFixed(1)}px,0)`; // opposite direction = depth
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', measure); };
  }, []);
  return (
    <div aria-hidden="true">
      <div ref={photo} className="bg-layer site-bg" />
      <div ref={orbs} className="bg-layer bg-orbs" />
      <div ref={grid} className="bg-layer bg-grid" />
      <div ref={fog} className="bg-layer bg-fog" />
      <div className="bg-layer bg-vignette" />
    </div>
  );
}
