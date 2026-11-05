import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * SpaceTimeBg — Per-page procedural 3D background matching Broken Space-Time / Multiverse / Simulation theme.
 * Page modes: 'home' | 'events' | 'workshops' | 'sponsors' | 'team' | 'about'
 */
export default function SpaceTimeBg({ page = 'home', dim = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ page, dim });
  stateRef.current = { page, dim };
  const buildSceneRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId = null;
    let isCancelled = false;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dim ? 0.6 : 1.0;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030612, 0.02);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handlePointerMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Container group to hold page-specific 3D objects
    const pageGroup = new THREE.Group();
    scene.add(pageGroup);

    // Dynamic builder depending on page
    const buildSceneForPage = (mode) => {
      // Clear previous children
      while (pageGroup.children.length > 0) {
        const obj = pageGroup.children[0];
        pageGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      }

      // --- 1. HOME: FRACTURED MULTIVERSE PORTAL ---
      if (mode === 'home') {
        camera.position.set(0, 0, 16);

        // Swirling Portal Ring
        const ringGeo = new THREE.TorusGeometry(4.0, 0.28, 24, 120);
        const ringMat = new THREE.ShaderMaterial({
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          uniforms: { uTime: { value: 0 } },
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
            void main() {
              float pulse = sin(vUv.x * 24.0 - uTime * 4.0) * 0.5 + 0.5;
              vec3 col = mix(vec3(0.0, 1.0, 0.6), vec3(0.0, 0.7, 1.0), sin(uTime + vUv.x * 6.28) * 0.5 + 0.5);
              col = mix(col, vec3(1.0, 0.0, 0.5), pulse * 0.6);
              gl_FragColor = vec4(col * (pulse + 0.6), pulse * 0.85);
            }
          `
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'portalRing';
        pageGroup.add(ring);

        // Reality fracture lines
        const crackCount = 36;
        const crackPos = new Float32Array(crackCount * 6);
        for (let i = 0; i < crackCount; i++) {
          const a = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          const r1 = 4.0;
          const r2 = 6.0 + Math.random() * 6.0;
          crackPos[i * 6] = Math.cos(a) * r1;
          crackPos[i * 6 + 1] = Math.sin(a) * r1;
          crackPos[i * 6 + 2] = 0;
          crackPos[i * 6 + 3] = Math.cos(a) * r2;
          crackPos[i * 6 + 4] = Math.sin(a) * r2;
          crackPos[i * 6 + 5] = (Math.random() - 0.5) * 2;
        }
        const crackGeo = new THREE.BufferGeometry();
        crackGeo.setAttribute('position', new THREE.BufferAttribute(crackPos, 3));
        const crackMat = new THREE.LineBasicMaterial({
          color: 0x00ffcc,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending
        });
        pageGroup.add(new THREE.LineSegments(crackGeo, crackMat));

        // Floating shattered debris
        const shardGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const shardMat = new THREE.MeshBasicMaterial({
          color: 0x00e6ff,
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });
        for (let i = 0; i < 40; i++) {
          const shard = new THREE.Mesh(shardGeo, shardMat);
          const theta = Math.random() * Math.PI * 2;
          const rad = 2.5 + Math.random() * 8.0;
          shard.position.set(
            Math.cos(theta) * rad,
            Math.sin(theta) * rad,
            (Math.random() - 0.5) * 10
          );
          shard.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          shard.userData = {
            rotSpeed: (Math.random() - 0.5) * 0.03,
            orbitSpeed: 0.005 + Math.random() * 0.01,
            rad,
            angle: theta
          };
          pageGroup.add(shard);
        }
      }

      // --- 2. EVENTS: MATRIX STREAM & HOLOGRAPHIC GRID ---
      else if (mode === 'events') {
        camera.position.set(0, 4, 14);
        camera.lookAt(0, 0, 0);

        // Tron-like Holographic Grid Floor
        const gridGeo = new THREE.PlaneGeometry(60, 60, 40, 40);
        gridGeo.rotateX(-Math.PI / 2);
        const gridMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { uTime: { value: 0 } },
          vertexShader: `
            varying vec3 vPos;
            void main() {
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vPos;
            uniform float uTime;
            void main() {
              vec2 coord = vPos.xz * 0.4;
              coord.y += uTime * 1.5;
              vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
              float line = 1.0 - min(min(grid.x, grid.y), 1.0);
              float dist = length(vPos.xz);
              float fade = exp(-dist * 0.06);
              vec3 col = mix(vec3(0.0, 1.0, 0.4), vec3(0.0, 0.8, 1.0), sin(vPos.z * 0.1));
              gl_FragColor = vec4(col * line * fade, line * fade * 0.7);
            }
          `
        });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.position.y = -4.5;
        grid.name = 'eventsGrid';
        pageGroup.add(grid);

        // Falling Cyberpunk Code Stream Particles
        const count = 1200;
        const pos = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 26;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
          speeds[i] = 0.08 + Math.random() * 0.15;
        }
        const streamGeo = new THREE.BufferGeometry();
        streamGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const streamMat = new THREE.PointsMaterial({
          color: 0x00ff88,
          size: 0.16,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        const stream = new THREE.Points(streamGeo, streamMat);
        stream.userData = { speeds };
        stream.name = 'eventsStream';
        pageGroup.add(stream);
      }

      // --- 3. WORKSHOPS: OLD HIGH-TECH MACHINE / CIRCUIT GRID ---
      else if (mode === 'workshops') {
        camera.position.set(0, 0, 15);

        // Procedural circuit lines
        const lineCount = 50;
        const pts = [];
        for (let i = 0; i < lineCount; i++) {
          let x = (Math.random() - 0.5) * 22;
          let y = (Math.random() - 0.5) * 16;
          let z = (Math.random() - 0.5) * 8;
          for (let step = 0; step < 4; step++) {
            pts.push(x, y, z);
            // Orthogonal right-angle machine trace
            if (Math.random() > 0.5) x += (Math.random() > 0.5 ? 2 : -2);
            else y += (Math.random() > 0.5 ? 2 : -2);
            pts.push(x, y, z);
          }
        }
        const circuitGeo = new THREE.BufferGeometry();
        circuitGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        const circuitMat = new THREE.LineBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending
        });
        pageGroup.add(new THREE.LineSegments(circuitGeo, circuitMat));

        // Glowing junction nodes
        const nodeGeo = new THREE.BufferGeometry();
        const nodePos = [];
        for (let i = 0; i < pts.length; i += 3) {
          nodePos.push(pts[i], pts[i + 1], pts[i + 2]);
        }
        nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePos, 3));
        const nodeMat = new THREE.PointsMaterial({
          color: 0xffaa00,
          size: 0.28,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        });
        const nodes = new THREE.Points(nodeGeo, nodeMat);
        nodes.name = 'circuitNodes';
        pageGroup.add(nodes);
      }

      // --- 4. SPONSORS: MULTIVERSE RIFT & INTERSECTING PORTALS ---
      else if (mode === 'sponsors') {
        camera.position.set(0, 0, 17);

        // Three overlapping dimensional rings
        const ringDefs = [
          { r: 4.5, rotX: 0.2, rotY: 0.4, col: 0x00ccff },
          { r: 3.5, rotX: -0.4, rotY: -0.3, col: 0xff0066 },
          { r: 5.5, rotX: 0.6, rotY: -0.5, col: 0x00ff88 },
        ];

        ringDefs.forEach((def, idx) => {
          const geo = new THREE.TorusGeometry(def.r, 0.2, 16, 100);
          const mat = new THREE.MeshBasicMaterial({
            color: def.col,
            wireframe: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
          });
          const m = new THREE.Mesh(geo, mat);
          m.rotation.set(def.rotX, def.rotY, idx * 0.7);
          m.name = `sponsorRing_${idx}`;
          pageGroup.add(m);
        });

        // Dimensional particulate mist
        const mistCount = 1000;
        const mistPos = new Float32Array(mistCount * 3);
        for (let i = 0; i < mistCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = 2.0 + Math.random() * 9.0;
          mistPos[i * 3] = Math.cos(a) * dist;
          mistPos[i * 3 + 1] = Math.sin(a) * dist;
          mistPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
        }
        const mistGeo = new THREE.BufferGeometry();
        mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
        const mistMat = new THREE.PointsMaterial({
          color: 0x00ffff,
          size: 0.15,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending
        });
        pageGroup.add(new THREE.Points(mistGeo, mistMat));
      }

      // --- 5. TEAM: SIMULATION WIREFRAME TERRAIN ---
      else if (mode === 'team') {
        camera.position.set(0, 3, 13);
        camera.lookAt(0, 0, 0);

        const terrGeo = new THREE.PlaneGeometry(36, 36, 32, 32);
        terrGeo.rotateX(-Math.PI / 2.3);
        const terrMat = new THREE.MeshBasicMaterial({
          color: 0x00ff88,
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });
        const terrain = new THREE.Mesh(terrGeo, terrMat);
        terrain.position.y = -2;
        terrain.name = 'simulationTerrain';
        pageGroup.add(terrain);
      }

      // --- 6. ABOUT: TIME VOID & FLOATING BROKEN CHRONOMETERS ---
      else {
        camera.position.set(0, 0, 16);

        // Broken Gear / Chronometer rings
        for (let i = 0; i < 4; i++) {
          const gearGeo = new THREE.TorusGeometry(2.5 + i * 1.5, 0.12, 8, 48);
          const gearMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x00ccff : 0xbf55ec,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
          });
          const gear = new THREE.Mesh(gearGeo, gearMat);
          gear.rotation.set(Math.random() * 2, Math.random() * 2, 0);
          gear.name = `aboutGear_${i}`;
          pageGroup.add(gear);
        }

        // Deep cosmic stardust
        const starCount = 1400;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
          starPos[i * 3] = (Math.random() - 0.5) * 40;
          starPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
          starPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        const sGeo = new THREE.BufferGeometry();
        sGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const sMat = new THREE.PointsMaterial({
          color: 0xd8ecf8,
          size: 0.18,
          transparent: true,
          opacity: 0.65
        });
        pageGroup.add(new THREE.Points(sGeo, sMat));
      }
    };

    buildSceneForPage(page);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      if (isCancelled) return;
      animId = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();
      const currentMode = stateRef.current.page;

      // Parallax smooth interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      camera.position.x = mouseX * 0.8;
      camera.position.y = mouseY * 0.6 + (currentMode === 'events' ? 4 : currentMode === 'team' ? 3 : 0);
      camera.lookAt(0, currentMode === 'events' ? 0 : currentMode === 'team' ? 0 : 0, 0);

      // Page-specific updates
      if (currentMode === 'home') {
        const ring = pageGroup.getObjectByName('portalRing');
        if (ring) {
          ring.rotation.z = t * 0.3;
          ring.rotation.x = Math.sin(t * 0.2) * 0.15;
          ring.material.uniforms.uTime.value = t;
        }
        pageGroup.children.forEach(c => {
          if (c.userData && c.userData.orbitSpeed) {
            c.userData.angle += c.userData.orbitSpeed;
            c.position.x = Math.cos(c.userData.angle) * c.userData.rad;
            c.position.y = Math.sin(c.userData.angle) * c.userData.rad;
            c.rotation.x += c.userData.rotSpeed;
            c.rotation.y += c.userData.rotSpeed;
          }
        });
      } else if (currentMode === 'events') {
        const grid = pageGroup.getObjectByName('eventsGrid');
        if (grid) grid.material.uniforms.uTime.value = t;

        const stream = pageGroup.getObjectByName('eventsStream');
        if (stream) {
          const pos = stream.geometry.attributes.position.array;
          const speeds = stream.userData.speeds;
          for (let i = 0; i < speeds.length; i++) {
            pos[i * 3 + 1] -= speeds[i];
            if (pos[i * 3 + 1] < -12) {
              pos[i * 3 + 1] = 12;
            }
          }
          stream.geometry.attributes.position.needsUpdate = true;
        }
      } else if (currentMode === 'workshops') {
        const nodes = pageGroup.getObjectByName('circuitNodes');
        if (nodes) {
          nodes.material.size = 0.24 + Math.sin(t * 5.0) * 0.08;
        }
        pageGroup.rotation.z = Math.sin(t * 0.1) * 0.05;
      } else if (currentMode === 'sponsors') {
        pageGroup.children.forEach((c, idx) => {
          if (c.name.startsWith('sponsorRing')) {
            c.rotation.z += (idx + 1) * 0.005;
            c.rotation.y += 0.003;
          }
        });
      } else if (currentMode === 'team') {
        const terrain = pageGroup.getObjectByName('simulationTerrain');
        if (terrain) {
          const pos = terrain.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i);
            const v = pos.getY(i);
            // Occasional glitch displacement
            const glitch = (Math.sin(t * 8.0 + u * 2.0) > 0.95) ? 0.6 : 0;
            pos.setZ(i, Math.sin(u * 0.5 + t * 2.0) * Math.cos(v * 0.5 + t) * 0.8 + glitch);
          }
          pos.needsUpdate = true;
        }
      } else if (currentMode === 'about') {
        pageGroup.children.forEach((c, i) => {
          if (c.name.startsWith('aboutGear')) {
            c.rotation.z += (i % 2 === 0 ? 1 : -1) * 0.008;
            c.rotation.x += 0.004;
          }
        });
      }

      renderer.render(scene, camera);
    };

    buildSceneRef.current = buildSceneForPage;
    rendererRef.current = renderer;
    buildSceneForPage(stateRef.current.page);

    animate();

    const cleanup = () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
      buildSceneRef.current = null;
      rendererRef.current = null;
    };

    return cleanup;
  }, []);

  // Fast swap of page meshes when route changes without destroying WebGL context
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = dim ? 0.6 : 1.0;
    }
    if (buildSceneRef.current) {
      buildSceneRef.current(page);
    }
  }, [page, dim]);

  return (
    <div className="st-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
