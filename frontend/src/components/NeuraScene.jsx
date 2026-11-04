import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import logoTop from '../assets/xpecto-logo-top.png';
import logoBot from '../assets/xpecto-logo-bot.png';

/*
 * One persistent WebGL canvas = intro + site background on every page.
 *  - intro=true : white-out (we are inside a star) -> zoom out through the core -> full spiral galaxy revealed -> scan -> ignite (XPECTO title) -> galaxy fades -> onDone()
 *  - intro=false: the galaxy stays as the background; pointer tilts it, camera orbits / pushes in with scroll.
 * Model: "Need some space?" by Loic Norgeot, CC BY 4.0 (50,000 star points, baked + deflated into /public/galaxy.bin).
 */
const TI = 5.0; // blast + title pop (the dive is still rushing in at this moment) // ignite time (s)
const LINES = [[0.3, '> LOCATING SIGNAL ........'], [1.4, '> GALAXY · 50,000 STARS'], [2.5, '> TARGET LOCKED'], [3.5, '> DIVING IN ...'], [4.3, '> ESTABLISHING LINK']];
const sst = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const outC = x => 1 - Math.pow(1 - x, 3);
const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export default function NeuraScene({ intro, playMode, dim, onDone }) {
  const canvasRef = useRef(null);
  const introRef = useRef(intro); introRef.current = intro;
  const playRef = useRef(playMode); playRef.current = playMode;
  const doneRef = useRef(onDone); doneRef.current = onDone;
  const dimRef = useRef(dim); dimRef.current = dim;
  const skipRef = useRef(() => {});
  const [boot, setBoot] = useState([]);
  const [title, setTitle] = useState(0); // 0 hidden, 1 popped up, 2 fading out

  useEffect(() => { document.documentElement.classList.toggle('neura-intro', intro); return () => document.documentElement.classList.remove('neura-intro'); }, [intro]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const MOB = innerWidth < 760;
    let cancelled = false, raf = 0, cleanup = () => {};

    (async () => {
      let ab;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}galaxy.bin`);
        ab = await new Response(res.body.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      } catch (e) { console.warn('NeuraScene: galaxy failed to load', e); return; }
      if (cancelled) return;
      const N = ab.byteLength / 15; // float32 xyz + uint8 rgb per star

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      const PR = Math.min(devicePixelRatio, MOB ? 1.5 : 1.75); renderer.setPixelRatio(PR);
      const BG = new THREE.Color(0x02040b), WHITE = new THREE.Color(0x3a1706) /* warm ember haze instead of white */;
      const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3a1706);
      const cam = new THREE.PerspectiveCamera(40, 1, 0.02, 120);
      const U = { time: { value: 0 }, ring: { value: -50 }, ex: { value: 1 }, att: { value: 0.03 }, max: { value: 110 } };

      // the galaxy: 50k additive star points, vertex colours from the model
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ab, 0, N * 3), 3));
      gg.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(ab, N * 12, N * 3), 3, true));
      const gm = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uT: U.time, uEx: U.ex, uAtt: U.att, uMax: U.max, uPR: { value: PR }, uSize: { value: MOB ? 3.2 : 3.0 } },
        vertexShader: `attribute vec3 color;uniform float uT,uPR,uSize,uAtt,uMax;varying vec3 vC;
 void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
  float h=fract(sin(dot(position,vec3(12.9898,78.233,37.719)))*43758.5453);
  float tw=.8+.2*sin(uT*(1.+h*3.)+h*40.);
  gl_PointSize=min(max(uPR*uSize*(.7+h*1.5)*(9./-mv.z),uPR*(.9+h*.9)),uMax);vC=color*tw*uAtt;}`,
        fragmentShader: 'uniform float uEx;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float s=smoothstep(.5,0.,d);vec3 c=vC;float l=dot(c,vec3(.3,.59,.11));c=mix(vec3(l),c,1.7);gl_FragColor=vec4(c*uEx*s*s*.85,1.);}',
      });
      const galaxy = new THREE.Points(gg, gm); galaxy.frustumCulled = false;
      const rig = new THREE.Group(); rig.add(galaxy); scene.add(rig);

      // glowing grid floor
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, extensions: { derivatives: true }, uniforms: { uRing: U.ring, uTime: U.time },
        vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader: `uniform float uRing,uTime;varying vec3 vW;void main(){vec2 c=vW.xz*.8;vec2 g=abs(fract(c-.5)-.5)/fwidth(c);float l=1.-min(min(g.x,g.y),1.);
  float r=length(vW.xz);float f=exp(-r*.085);float ring=exp(-pow((r-uRing)*.9,2.));
  vec3 col=vec3(.1,.8,1.)*l*f*.8+vec3(1.,.4,.15)*ring*(l*3.+.25);gl_FragColor=vec4(col,1.);}`,
      }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -2.7; scene.add(floor);

      // dust
      const ND = MOB ? 1600 : 3200, ds = new Float32Array(ND * 4); for (let i = 0; i < ds.length; i++) ds[i] = Math.random();
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3), 3)); dg.setAttribute('aS', new THREE.BufferAttribute(ds, 4));
      const DU = { uT: U.time, uC: { value: 1 }, uPR: { value: PR } };
      const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: DU,
        vertexShader: `attribute vec4 aS;uniform float uT,uC,uPR;varying float vA;varying float vK;void main(){float r=mix(4.+aS.x*14.,1.8+aS.y*3.2,uC);float a=aS.z*6.283+uT*(.05+aS.w*.25)*(1.+uC*2.);float h=(aS.y-.5)*10.*mix(1.,.6,uC);
  vec3 p=vec3(cos(a)*r,h+sin(uT*.4+aS.w*9.)*.3,sin(a)*r);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPR*(1.5+aS.w*3.)*(7./-mv.z);vA=.25+.75*aS.w;vK=aS.x;}`,
        fragmentShader: 'varying float vA;varying float vK;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float s=smoothstep(.5,0.,d);gl_FragColor=vec4(mix(vec3(.2,.9,1.),vec3(1.,.45,.2),step(.6,vK))*s*vA*1.6,s);}',
      }));
      dust.frustumCulled = false; scene.add(dust);

      // scan ring + the blinding star glow at the start of the intro
      const scanR = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.012, 8, 90), new THREE.MeshBasicMaterial({ color: 0x6af0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      scanR.rotation.x = Math.PI / 2; scanR.scale.set(2.3, 2.3, 1.1); scanR.visible = false; scene.add(scanR);
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,120,.95)'); g.addColorStop(0.25, 'rgba(255,170,70,.5)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, opacity: 1 })); star.scale.setScalar(14); scene.add(star);

const R_BALL = 0.16;
      const txc = document.createElement('canvas'); txc.width = txc.height = 1024;
      const drawTx = () => { const x = txc.getContext('2d'); x.clearRect(0, 0, 1024, 1024); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#000'; x.font = "800 130px Orbitron, 'Segoe UI', sans-serif"; x.fillText('XPECTO’27', 512, 470, 900); x.font = "700 50px Orbitron, 'Segoe UI', sans-serif"; x.fillText('TECHFEST OF IIT MANDI', 512, 585, 900); };
      drawTx(); const txTex = new THREE.CanvasTexture(txc); if (document.fonts) document.fonts.load('800 130px Orbitron').then(() => { drawTx(); txTex.needsUpdate = true; });
      const ballMat = new THREE.ShaderMaterial({ uniforms: { uT: U.time, uTx: { value: 0 }, uTex: { value: txTex } }, vertexShader: 'varying vec3 vN,vP;void main(){vN=normalize(normalMatrix*normal);vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform float uT,uTx;uniform sampler2D uTex;varying vec3 vN,vP;float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){vec3 n=normalize(vN);float fr=pow(1.-max(n.z,0.),2.5);float pl=n3(vP*5.+uT*.3)*.6+n3(vP*11.-uT*.4)*.4;vec3 col=mix(vec3(.95,.42,.07),vec3(1.,.74,.22),pl)*(.6+.55*n.z)+vec3(1.,.5,.12)*fr*1.3;float a=texture2D(uTex,n.xy*.62+.5).a*smoothstep(0.,.25,n.z)*uTx;col=mix(col,vec3(.1,.035,.01),a*.93);gl_FragColor=vec4(col,1.);}' });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), ballMat); ball.scale.setScalar(R_BALL); ball.visible = false; scene.add(ball);

      // blast: expanding shock ring + spark burst
      const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 70, 128, 128, 126); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.7, 'rgba(255,190,70,.9)'); g.addColorStop(0.85, 'rgba(255,70,140,.6)'); g.addColorStop(1, 'rgba(160,40,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
      const blast = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0 })); blast.visible = false; scene.add(blast);
      const NS = 520, sd = new Float32Array(NS * 3), ss = new Float32Array(NS * 2);
      for (let i = 0; i < NS; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); sd[i * 3] = r * Math.cos(a); sd[i * 3 + 1] = u; sd[i * 3 + 2] = r * Math.sin(a); ss[i * 2] = 0.3 + Math.random() * 1.5; ss[i * 2 + 1] = Math.random(); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS * 3), 3)); sg.setAttribute('aD', new THREE.BufferAttribute(sd, 3)); sg.setAttribute('aS', new THREE.BufferAttribute(ss, 2));
      const SU = { uAge: { value: 0 }, uC: { value: new THREE.Vector3() }, uPR: { value: PR } };
      const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: SU,
        vertexShader: 'attribute vec3 aD;attribute vec2 aS;uniform float uAge,uPR;uniform vec3 uC;varying float vA;varying float vK;void main(){float a=uAge;vec3 p=uC+aD*aS.x*a*(1.-.45*a);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPR*(2.+aS.y*6.)*(1.1/-mv.z)*(1.-a);vA=1.-a;vK=aS.y;}',
        fragmentShader: 'varying float vA;varying float vK;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float s=smoothstep(.5,0.,d);gl_FragColor=vec4(mix(vec3(1.,.72,.2),vec3(1.,.25,.55),vK)*s*vA*1.4,1.);}' }));
      sparks.frustumCulled = false; sparks.visible = false; scene.add(sparks);
      // nebula sky (follows the camera, drifts with scroll / pointer)
      const skyMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; sky.visible = false; scene.add(sky);
      new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}space-bg.jpg`, tex => { tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping; tex.repeat.set(0.66, 0.66); skyMat.map = tex; skyMat.needsUpdate = true; });
      const VF = new THREE.Vector3(), LK = new THREE.Vector3(); let skyLevel = 0.9;
      // post: bloom
      let composer = null, bloom = null;
      try { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, cam)); bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1, 0.85, 0.5); composer.addPass(bloom); } catch (e) { composer = null; }

      // state
      const isIntro = introRef.current;
      let t = isIntro ? 0 : TI + 4, ign = !isIntro, fired = !isIntro, mx = 0, my = 0, smx = 0, smy = 0, sp = 0, spT = 0, sv = 0, lastY = 0, exLevel = 1, deviceRoll = 0, targetRoll = 0;
      let zoom = 1, zoomTarget = 1;
      let fadeRotation = null;
      // the one star we dive into: a bright outer-arm particle
      const V0 = new THREE.Vector3(), VP = new THREE.Vector3(), VD = new THREE.Vector3(), SW = new THREE.Vector3(), S0 = new THREE.Vector3(2, 0, 0);
      { const pa = new Float32Array(ab, 0, N * 3), ca = new Uint8Array(ab, N * 12, N * 3); for (let i = 0; i < N; i++) { const x = pa[i * 3], y = pa[i * 3 + 1], z = pa[i * 3 + 2], r = Math.hypot(x, z); if (r > 1.4 && r < 2.2 && Math.abs(y) < 0.08 && ca[i * 3] + ca[i * 3 + 1] + ca[i * 3 + 2] > 560) { S0.set(x, y, z); break; } } }
      const shown = new Set(); let titleSt = 0;
      skipRef.current = () => { t = Math.max(t, TI + 6); };

      const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(PR); composer.setSize(w, h); } };
      const onMove = e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
      const onWheel = e => { if (playRef.current) zoomTarget = clamp(zoomTarget + e.deltaY * 0.0015, 0.55, 1.5); };
      const onDeviceOrientation = e => { if (typeof e.gamma === 'number') targetRoll = -clamp(e.gamma / 45, -1, 1) * 0.28; };
      const root_ = document.documentElement;
      const onScroll = () => { const m = root_.scrollHeight - innerHeight; spT = m > 0 ? clamp(scrollY / m) : 0; root_.classList.toggle('scrolled', scrollY > 24); };
      addEventListener('resize', resize); addEventListener('pointermove', onMove); addEventListener('wheel', onWheel, { passive: true }); addEventListener('deviceorientation', onDeviceOrientation, { passive: true }); addEventListener('scroll', onScroll, { passive: true }); resize(); onScroll();

      const clock = new THREE.Clock();
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (document.hidden) { clock.getDelta(); return; }
        const dt = Math.min(clock.getDelta(), 0.05); t += dt; U.time.value = t;
        const headFade = 1; // galaxy now stays as the cinematic background on every page
        galaxy.visible = headFade > 0.001;
        galaxy.scale.setScalar(Math.max(headFade, 0.0001));
        if (introRef.current) LINES.forEach(l => { if (t > l[0] && !shown.has(l[0])) { shown.add(l[0]); setBoot(b => [...b, l[1]]); } });
        if (t >= TI && !ign) { ign = true; setBoot([]); }
        // title pops out as the galaxy ignites, fades just before the site UI comes in
        const ts = introRef.current && t >= TI && t < TI + 4.2 ? (t < TI + 3.1 ? 1 : 2) : 0;
        if (ts !== titleSt) { titleSt = ts; setTitle(ts); }
        const since = Math.max(0, t - TI), q = inOut(clamp((t - TI - 3.2) / 2.2));
        if (q > 0.68 && !fired) { fired = true; doneRef.current && doneRef.current(); }

        // intro choreography: blinding white -> exposure falls as we pull away from the star
        const glare = 0; // no white-out
        exLevel += ((playRef.current ? 1 : dimRef.current ? 0.5 : 0.8) * (1 + 0.5 * sp) - exLevel) * 0.05; // dimmer behind content, brighter as you fly toward the core
        U.ex.value = exLevel * (1 + 5 * glare);
        scene.background.copy(BG).lerp(WHITE, glare);
        const sy = 99; scanR.visible = sy < 50; scanR.position.y = sy;
        U.ring.value = ign ? since * 13 : -50; DU.uC.value = ign ? 1 - outC(clamp(since / 2.2)) * 0.92 : 1;

        // rig + camera
        smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05; sp += (spT - sp) * 0.06; deviceRoll += (targetRoll - deviceRoll) * 0.06;
        rig.position.set(0, 0, 0);
        const prog = clamp((t - 0.3) / (TI + 0.9 - 0.3)), kz = prog; // constant-speed zoom: never eases to a stop
        rig.rotation.y = t * 0.06 + smx * 0.7 + sp * 3.2; rig.rotation.x = lerp(1.15, 0.95, kz) - sp * 0.5 + smy * 0.25; rig.rotation.z = deviceRoll;
        const bkI = isIntro ? inOut(clamp((t - TI - 2.8) / 2.4)) : 1; // 0 during the dive, 1 once we're 'inside' the galaxy
        if (!playRef.current) { rig.rotation.x = lerp(rig.rotation.x, 0.28, bkI); rig.rotation.y = lerp(rig.rotation.y, t * 0.01 + sp * 0.8, bkI); }
        if (!playRef.current && headFade < 1 && !fadeRotation) fadeRotation = { x: rig.rotation.x, y: rig.rotation.y, z: rig.rotation.z };
        if (!playRef.current && fadeRotation) rig.rotation.set(fadeRotation.x, fadeRotation.y, fadeRotation.z);
        zoom += (zoomTarget - zoom) * 0.08;
        let Dend = playRef.current ? (MOB ? 8.4 : 6.8) * zoom : (MOB ? 8 : 5.4);
        let D = Dend;
        D = lerp(D, 3.4, sp * sp * 0.9);
        const igniteBlend = inOut(clamp((t - TI) / 0.8));
        const az = Math.sin(t * 0.25) * 0.18 * (1 - igniteBlend) - smx * 0.25 + sp * 1.4, el = 0.12 - smy * 0.1 + sp * 0.15;
        const vel = Math.abs(scrollY - lastY) / (dt * 2500 + 1e-3); lastY = scrollY; sv += (clamp(vel) - sv) * 0.1;
        cam.fov = (playRef.current ? 40 : lerp(40, 62, bkI)) + 10 * sv; cam.updateProjectionMatrix(); // dolly-zoom in the intro, punch at ignition, stretch while scrolling
        cam.position.set(Math.sin(az) * D * Math.cos(el), Math.sin(el) * D + 0.25, Math.cos(az) * D * Math.cos(el));
        // intro dive: from a far speck into one particle, then pull back to the galaxy framing
        const bk = inOut(clamp((t - TI - 2.8) / 2.4)); V0.set(0, 0.1, 0);
        if (!playRef.current) { // inside-the-galaxy viewpoint: scroll turns your head from the outer rim toward the core
          const th = Math.PI * (1 - 0.45 * sp) - smx * 0.3 + t * 0.01;
          cam.position.set(smx * 0.05, 0.08 + 0.1 * sp - smy * 0.05, 1.35 - sp * 0.6);
          V0.set(cam.position.x + Math.sin(th) * 3, 0.15 - smy * 0.5 + 0.3 * sp, cam.position.z - Math.cos(th) * 3);
        }
        if (isIntro && bk < 1) {
          const S = rig.localToWorld(SW.copy(S0)), dI = 110 * Math.pow(0.9 / 110, kz);
          VD.set(Math.sin(t * 0.05 + 0.6) * 0.6, 0.35, 0.8).normalize().multiplyScalar(dI); VP.copy(S).add(VD);
          cam.position.lerpVectors(VP, cam.position, bk); V0.lerpVectors(S, V0, bk);
          const bl = clamp((t - TI) / 0.35), ba = clamp((t - TI) / 1.0), sa = clamp((t - TI) / 1.4);
          star.visible = true; star.position.copy(S); star.scale.setScalar(dI * 0.03 + R_BALL * 7 * Math.pow(prog, 3) * (1 + 6 * bl)); star.material.opacity = 0.9 * (1 - clamp((t - TI) / 0.5)) * (1 - bk);
          ball.visible = t < TI + 0.35; ball.position.copy(S); ball.scale.setScalar(R_BALL * (1 + 8 * bl * bl));
          blast.visible = t >= TI && ba < 1; blast.position.copy(S); blast.scale.setScalar(0.15 + 2.4 * outC(ba)); blast.material.opacity = 0.9 * (1 - ba);
          sparks.visible = t >= TI && sa < 1; SU.uAge.value = sa; SU.uC.value.copy(S);
          const sh = 0.02 * (1 - kz) + (t >= TI ? 0.04 * Math.exp(-(t - TI) * 5) : 0); cam.position.x += Math.sin(t * 17.3) * sh; cam.position.y += Math.sin(t * 13.1 + 1) * sh;
        } else { star.visible = false; ball.visible = false; blast.visible = false; sparks.visible = false; }
        dust.visible = !isIntro || t > TI; floor.visible = isIntro && t > TI && bkI < 1;
        cam.lookAt(V0);
        U.max.value = playRef.current ? 110 : lerp(110, 26, bkI);
        skyLevel += ((dimRef.current ? 0.55 : 0.9) - skyLevel) * 0.05;
        skyMat.opacity = playRef.current ? 0 : bkI * skyLevel; sky.visible = skyMat.opacity > 0.01 && !!skyMat.map;
        if (sky.visible) {
          const fd = 50, hh = 2 * fd * Math.tan(cam.fov * Math.PI / 360) * 1.1;
          sky.position.copy(cam.position).add(VF.set(0, 0, -fd).applyQuaternion(cam.quaternion)); sky.quaternion.copy(cam.quaternion); sky.scale.set(hh * cam.aspect, hh, 1);
          skyMat.map.offset.set(0.17 + (V0.x - cam.position.x) * 0.03 + smx * 0.02, 0.2 - sp * 0.22 + smy * 0.02);
        }
        U.att.value = clamp(Math.pow(8.4 / cam.position.length(), 2), 0.03, 1);
        if (bloom) { bloom.strength = 0.7 + 0.8 * glare + (ign ? 1.4 * Math.exp(-since * 2.2) : 0) + 0.9 * sv; bloom.threshold = lerp(0.85, 0.5, glare); }
        try { composer ? composer.render() : renderer.render(scene, cam); } catch (e) { composer = null; }
      };
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', onMove); removeEventListener('wheel', onWheel); removeEventListener('deviceorientation', onDeviceOrientation); removeEventListener('scroll', onScroll);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); renderer.dispose();
      };
      if (cancelled) cleanup();
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); cleanup(); };
  }, []);

  return (
    <>
      <div className="neura-keep neura-bg" style={{ opacity: 1 }} aria-hidden="true">
        <canvas ref={canvasRef} className="neura-canvas" />
        <div className="neura-vig" />
        <div className="neura-grain" />
        <div className="neura-thread-field">
          {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--thread-x': `${(i * 29) % 101}%`, '--thread-y': `${(i * 47) % 100}%`, '--thread-r': `${-38 + (i % 7) * 13}deg`, '--thread-delay': `${(i % 6) * -1.2}s` }} />)}
        </div>
      </div>
      {intro && (
        <div className="neura-keep neura-overlay">
                    <div className="neura-bars top" /><div className="neura-bars bottom" /><div className="neura-streak" />
          {title > 0 && (
            <div className={`neura-title ${title === 2 ? 'out' : ''}`}>
              <img className="xp-img" src={logoTop} alt="XPECTO’27" />
              <img className="xp-img xp-img-sub" src={logoBot} alt="Techfest of IIT MANDI" />
            </div>
          )}
          <div className="neura-flash" />
          <div className="neura-boot" aria-hidden="true">{boot.map(l => <div key={l}>{l}</div>)}</div>
          <button className="btn-slash neura-skip" onClick={() => skipRef.current()}>Skip</button>
        </div>
      )}
    </>
  );
}
