import { useEffect, useState, useRef } from 'react';

/**
 * TvStaticTransition
 * Simulates a vintage TV antenna connection error on route change:
 * - 1 second duration
 * - Screen blurred and shaky
 * - Rolling vertical dizzy lines (V-Hold desync)
 * - Analog static snow canvas
 * - Horizontal scan glitches and chromatic aberration
 */
const MAIN_PAGES = new Set(['about', 'events', 'workshops', 'sponsors', 'team']);

export default function TvStaticTransition({ page, triggerKey = 0 }) {
  const [active, setActive] = useState(false);
  const [hideTelemetry, setHideTelemetry] = useState(false);
  const prevPageRef = useRef(page);
  const prevTriggerRef = useRef(0);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timerRef = useRef(null);

  const startGlitch = (shouldHideTelemetry = false) => {
    setActive(true);
    setHideTelemetry(shouldHideTelemetry);
    document.body.classList.add('tv-antenna-shaking');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActive(false);
      setHideTelemetry(false);
      document.body.classList.remove('tv-antenna-shaking');
    }, 1000); // Exactly 1 second
  };

  useEffect(() => {
    if (triggerKey > 0 && triggerKey !== prevTriggerRef.current) {
      prevTriggerRef.current = triggerKey;
      startGlitch(true);
      return;
    }

    if (prevPageRef.current !== page
      && MAIN_PAGES.has(prevPageRef.current)
      && MAIN_PAGES.has(page)) {
      startGlitch();
    }
    prevPageRef.current = page;
  }, [page, triggerKey]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('tv-antenna-shaking');
    };
  }, []);

  // Analog TV Snow Generator
  useEffect(() => {
    if (!active) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = 0.5; // Render at lower resolution for authentic chunky CRT noise
    const w = (canvas.width = Math.max(160, Math.floor(window.innerWidth * dpr)));
    const h = (canvas.height = Math.max(90, Math.floor(window.innerHeight * dpr)));

    const imgData = ctx.createImageData(w, h);
    const data32 = new Uint32Array(imgData.data.buffer);

    let frame = 0;
    const renderSnow = () => {
      frame++;
      const len = data32.length;
      for (let i = 0; i < len; i++) {
        // High-contrast black/white/tinted snow
        const rand = Math.random();
        if (rand < 0.65) {
          const val = (Math.random() * 255) | 0;
          // ABGR format for canvas
          data32[i] = (220 << 24) | (val << 16) | (val << 8) | val;
        } else if (rand < 0.85) {
          // Cyan/green color burst glitch
          data32[i] = (240 << 24) | (255 << 16) | (255 << 8) | 0;
        } else {
          // Transparent gaps
          data32[i] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Occasional horizontal antenna displacement slash
      if (frame % 3 === 0) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        const stripY = Math.random() * h;
        ctx.fillRect(0, stripY, w, Math.random() * 20 + 5);
      }

      animRef.current = requestAnimationFrame(renderSnow);
    };

    renderSnow();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="tv-antenna-overlay" aria-hidden="true">
      {/* 1. Chunky Analog TV Noise Snow */}
      <canvas ref={canvasRef} className="tv-snow-canvas" />

      {/* 2. Vertically Dizzy Desync Lines (Simulating lost antenna lock / vertical sync roll) */}
      <div className="tv-dizzy-lines" />
      <div className="tv-dizzy-lines-fast" />

      {/* 3. Rolling V-Hold Desync Bars */}
      <div className="tv-v-hold-bar" />
      <div className="tv-v-hold-bar delay" />

      {/* 4. Horizontal tracking tearing bars */}
      <div className="tv-tracking-jitter" />

      {/* 5. Vintage CRT Antenna Error HUD Telemetry */}
      {!hideTelemetry && (
        <div className="tv-antenna-telemetry">
          <div className="tv-antenna-badge">[ NO SIGNAL // ANTENNA DESYNC ]</div>
          <div className="tv-antenna-channel">CH 03 · CARRIER FREQ: 434.2 MHz · V-HOLD SEARCHING...</div>
        </div>
      )}

      {/* 6. Vignette & CRT phosphors scanlines */}
      <div className="tv-crt-vignette" />
    </div>
  );
}
