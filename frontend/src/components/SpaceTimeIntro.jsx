import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const BOOT_LOGS = [
  { t: 0.15, text: '> SYSTEM BOOT: QUANTUM CORE v7.4.9' },
  { t: 0.55, text: '> DETECTING CHRONO-METRIC ANOMALY...' },
  { t: 1.0, text: '> WARNING: REALITY MATRIX CRACKING' },
  { t: 1.45, text: '> ENGAGING MULTIVERSE PORTAL BREACH' },
  { t: 1.9, text: '> SYNCHRONIZING TIMELINES... 89%... 100%' },
];

export default function SpaceTimeIntro({ onDone }) {
  const canvasRef = useRef(null);
  const [bootLines, setBootLines] = useState([]);
  const [showTitle, setShowTitle] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId = null;
    let isCancelled = false;

    THREE.ColorManagement.enabled = false;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      onDone?.();
      return;
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02030a, 0.02);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 14);

    // --- 1. Swirling Multiverse Portal Ring ---
    const portalGeo = new THREE.TorusGeometry(3.6, 0.35, 30, 160);
    const portalMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00ff88) },
        uColor2: { value: new THREE.Color(0x00ccff) },
        uColor3: { value: new THREE.Color(0xff0066) },
        uIntensity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float uTime;
        void main() {
          vUv = uv;
          vPos = position;
          vec3 pos = position;
          float angle = atan(pos.y, pos.x);
          pos.z += sin(angle * 6.0 + uTime * 4.0) * 0.25;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uIntensity;

        void main() {
          float angle = atan(vPos.y, vPos.x);
          float spiral = sin(angle * 8.0 - uTime * 6.0 + vUv.y * 14.0);
          float glow = pow(abs(spiral), 1.8) * uIntensity;
          vec3 col = mix(uColor1, uColor2, sin(uTime * 2.0 + angle) * 0.5 + 0.5);
          col = mix(col, uColor3, cos(uTime * 3.0 + vUv.x * 6.28) * 0.5 + 0.5);
          gl_FragColor = vec4(col * (glow + 0.6) * uIntensity, clamp(glow * uIntensity, 0.0, 1.0));
        }
      `
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    scene.add(portal);

    // --- 2. Inner Event Horizon Disk ---
    const diskGeo = new THREE.CircleGeometry(3.4, 64);
    const diskMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uIntensity;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          if (dist > 1.0) discard;
          float ripple = sin(dist * 20.0 - uTime * 8.0) * 0.5 + 0.5;
          float fade = (1.0 - dist) * pow(ripple, 2.0);
          vec3 col = mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.0, 0.4), dist);
          gl_FragColor = vec4(col * fade * uIntensity * 1.5, fade * uIntensity);
        }
      `
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    scene.add(disk);

    // --- 3. Warp Tunnel (activates during dive) ---
    const tunnelGeo = new THREE.CylinderGeometry(4.2, 4.2, 70, 36, 60, true);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 },
        uAlpha: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uAlpha;
        void main() {
          float zOffset = vUv.y * 30.0 - uTime * uSpeed;
          float streak = sin(vUv.x * 40.0 + sin(zOffset * 2.0)) * 0.5 + 0.5;
          streak = pow(streak, 4.0);
          vec3 col = mix(vec3(0.0, 1.0, 0.6), vec3(0.0, 0.6, 1.0), sin(zOffset * 0.2));
          col = mix(col, vec3(1.0, 0.1, 0.5), step(0.8, streak));
          gl_FragColor = vec4(col * streak * uAlpha, streak * uAlpha * 0.8);
        }
      `
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(0, 0, -25);
    scene.add(tunnel);

    // --- 4. Quantum Dust & Fracture Lines ---
    const PARTICLE_COUNT = 1500;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pVelocities = new Float32Array(PARTICLE_COUNT * 3);
    const pColors = new Float32Array(PARTICLE_COUNT * 3);

    const c1 = new THREE.Color(0x00ff88);
    const c2 = new THREE.Color(0x00ccff);
    const c3 = new THREE.Color(0xff0066);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 2.0 + Math.random() * 12.0;
      pPositions[i * 3] = Math.cos(theta) * radius;
      pPositions[i * 3 + 1] = Math.sin(theta) * radius;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      pVelocities[i * 3] = (Math.random() - 0.5) * 0.05;
      pVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      pVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      const pick = Math.random();
      const col = pick < 0.4 ? c1 : pick < 0.8 ? c2 : c3;
      pColors[i * 3] = col.r;
      pColors[i * 3 + 1] = col.g;
      pColors[i * 3 + 2] = col.b;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- 5. Reality Crack Wireframe ---
    const crackSegments = 24;
    const crackPositions = new Float32Array(crackSegments * 6);
    for (let i = 0; i < crackSegments; i++) {
      const angle = (i / crackSegments) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const rInner = 3.6;
      const rOuter = 7.0 + Math.random() * 5.0;
      crackPositions[i * 6] = Math.cos(angle) * rInner;
      crackPositions[i * 6 + 1] = Math.sin(angle) * rInner;
      crackPositions[i * 6 + 2] = 0;
      crackPositions[i * 6 + 3] = Math.cos(angle) * rOuter;
      crackPositions[i * 6 + 4] = Math.sin(angle) * rOuter;
      crackPositions[i * 6 + 5] = (Math.random() - 0.5) * 1.5;
    }
    const crackGeo = new THREE.BufferGeometry();
    crackGeo.setAttribute('position', new THREE.BufferAttribute(crackPositions, 3));
    const crackMat = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const cracks = new THREE.LineSegments(crackGeo, crackMat);
    scene.add(cracks);

    // Animation variables
    const startTime = performance.now();
    let lastFrame = startTime;
    let shownLogs = 0;
    let titleShown = false;
    let glitchOn = false;
    let elapsed = 0;
    const TOTAL_DURATION = 4.8; // seconds

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (isCancelled) return;
      animId = requestAnimationFrame(animate);

      elapsed = (performance.now() - startTime) / 1000;
      const now = performance.now();
      const delta = (now - lastFrame) / 1000;
      lastFrame = now;

      // Check log lines triggers
      while (shownLogs < BOOT_LOGS.length && elapsed >= BOOT_LOGS[shownLogs].t) {
        const text = BOOT_LOGS[shownLogs++].text;
        setBootLines(prev => (prev.includes(text) ? prev : [...prev, text]));
      }

      // Update shader uniforms
      portalMat.uniforms.uTime.value = elapsed;
      diskMat.uniforms.uTime.value = elapsed;
      tunnelMat.uniforms.uTime.value = elapsed;

      // Phase 1: Boot & Fracture Charge (0 - 1.8s)
      if (elapsed < 1.8) {
        const p1 = Math.min(elapsed / 1.8, 1.0);
        portal.scale.setScalar(p1 * 1.0);
        portalMat.uniforms.uIntensity.value = p1 * 0.9;
        diskMat.uniforms.uIntensity.value = p1 * 0.5;
        crackMat.opacity = Math.sin(elapsed * 12.0) > 0.4 ? p1 * 0.7 : 0.1;
        camera.position.z = 14 - p1 * 2;
        camera.position.x = (Math.random() - 0.5) * (p1 * 0.15);
        camera.position.y = (Math.random() - 0.5) * (p1 * 0.15);
      }
      // Phase 2: Wormhole Dive (1.8 - 3.4s)
      else if (elapsed >= 1.8 && elapsed < 3.4) {
        const diveT = (elapsed - 1.8) / 1.6;
        const eased = diveT * diveT * diveT;

        portalMat.uniforms.uIntensity.value = 1.4;
        diskMat.uniforms.uIntensity.value = 1.2;
        tunnelMat.uniforms.uAlpha.value = Math.min(diveT * 2.0, 1.0);
        tunnelMat.uniforms.uSpeed.value = 10.0 + diveT * 35.0;

        // Camera rushes into and through the portal
        camera.position.x = 0;
        camera.position.y = 0;
        camera.position.z = 12 - eased * 38;
        camera.rotation.z = elapsed * 1.2;
        camera.fov = 65 + diveT * 35;
        camera.updateProjectionMatrix();

        if ((diveT > 0.6) !== glitchOn) { glitchOn = diveT > 0.6; setGlitchActive(glitchOn); }
      }
      // Phase 3: Teleportation arrival & Logo assembly (3.4 - 4.8s)
      else if (elapsed >= 3.4 && elapsed < TOTAL_DURATION) {
        if (!titleShown) { titleShown = true; setShowTitle(true); }
        tunnelMat.uniforms.uAlpha.value = Math.max(0, 1.0 - (elapsed - 3.4) / 1.4);
        camera.fov = 65;
        camera.rotation.z = 0;
        camera.position.set(0, 0, 10);
        camera.updateProjectionMatrix();

        portal.rotation.z += delta * 0.5;
        portalMat.uniforms.uIntensity.value = 0.5;
      }
      // Finished
      else if (elapsed >= TOTAL_DURATION && !finishedRef.current) {
        finishedRef.current = true;
        if (onDone) onDone();
      }

      // Rotate portal
      portal.rotation.z += delta * 0.8;
      disk.rotation.z -= delta * 0.4;

      // Swirl particles
      const pos = particles.geometry.attributes.position.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        // Inward pull towards center
        pos[idx + 2] += (elapsed > 1.8 ? 0.8 : 0.08);
        if (pos[idx + 2] > 18) {
          pos[idx + 2] = -20;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const cleanup = () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => m.dispose()); });
      renderer.dispose();
      scene.clear();
    };

    return cleanup;
  }, [onDone]);

  return (
    <div className={`st-intro ${glitchActive ? 'glitch-flash' : ''}`}>
      <canvas ref={canvasRef} />
      <div className="st-scanlines" />

      {/* Boot terminal logs */}
      <div className="st-boot" aria-live="polite">
        {bootLines.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>

      {/* Arrival Title */}
      <div className={`st-title ${showTitle ? 'show' : ''}`}>
        <h1 className="glitch-text" data-text="XPECTO'27">XPECTO'27</h1>
        <p>TECHFEST OF IIT MANDI</p>
        <span style={{
          marginTop: '1.2rem',
          fontSize: '0.85rem',
          fontFamily: 'Courier New, monospace',
          color: '#00ff88',
          letterSpacing: '0.2em'
        }}>
          [ REALITY RECONSTRUCTED ]
        </span>
      </div>

    </div>
  );
}
