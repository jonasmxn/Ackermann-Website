// Bauphasen-Modell: Mehrfamilienhaus aus exakten Körpern, Maße in Metern.
// 12 × 10 m Grundfläche, drei Vollgeschosse je 3 m, Staffelgeschoss 9 × 7,5 m.
import * as THREE from 'three';

const W = 12, D = 10, T = 0.36, SH = 3, Y0 = 0.3, TOP = 13.3;

function mauerwerkTextur() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ddd6c4'; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 2; r++) for (let s = -1; s < 2; s++) {
    const x = s * 256 + (r ? 128 : 0), y = r * 128;
    g.fillStyle = (r + s) % 2 ? '#d8d0bd' : '#e1dac9';
    g.fillRect(x + 3, y + 3, 250, 122);
  }
  g.strokeStyle = '#b3ab98'; g.lineWidth = 5;
  g.strokeRect(0, 0, 256, 128); g.strokeRect(-128, 128, 256, 128); g.strokeRect(128, 128, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t; // ein Stein: 50 × 25 cm
}

export function initHaus({ container, canvas, onChange }) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { return null; }
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6c82, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3.5, 6, 4.5); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.006;
  Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 3.6, bottom: -3, near: 1, far: 18 });
  scene.add(sun);
  scene.add(new THREE.GridHelper(9, 18, 0xa9b9ca, 0xd3dbe5));
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShadowMaterial({ opacity: 0.2 }));
  boden.rotation.x = -Math.PI / 2; boden.position.y = 0.002; boden.receiveShadow = true; scene.add(boden);

  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  const clip = { clippingPlanes: [plane], clipShadows: true, side: THREE.DoubleSide };
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...clip, ...o });
  const mat = {
    wall: M(0xfbfaf7), sockel: M(0x9c9ea1), dark: M(0x3a3f45, { roughness: 0.65 }), frame: M(0x2c3136, { roughness: 0.5 }),
    glass: M(0x6c88a3, { roughness: 0.08, metalness: 0.55 }), rail: M(0xc4dcea, { transparent: true, opacity: 0.3, roughness: 0.05 }),
    metal: M(0xcdd2d7, { roughness: 0.35, metalness: 0.6 }), slab: M(0xb7b4ac), kies: M(0xcbc7bd, { roughness: 1 }),
    pv: M(0x1c2b45, { roughness: 0.2, metalness: 0.5 }), geruest: M(0x8f979f, { roughness: 0.4, metalness: 0.7 }), bohle: M(0xb48d58),
  };
  const roh = {
    wall: M(0xffffff, { map: mauerwerkTextur(), roughness: 0.95 }), beton: M(0xaaa7a0, { roughness: 0.95 }),
  };
  const draht = new THREE.MeshBasicMaterial({ color: 0x2a69a8, wireframe: true, clippingPlanes: [plane] });
  const kanteFertig = new THREE.LineBasicMaterial({ color: 0x8b9198, clippingPlanes: [plane] });

  const haus = new THREE.Group();
  const meshes = [], kanten = [];
  function add(parent, role, geo, x, y, z) {
    const o = new THREE.Mesh(geo, mat[role]);
    o.position.set(x, y, z); o.userData.role = role;
    o.castShadow = role !== 'rail'; o.receiveShadow = true;
    parent.add(o); meshes.push(o); return o;
  }
  const box = (parent, role, w, h, d, x, y, z) => add(parent, role, new THREE.BoxGeometry(w, h, d), x, y, z);
  function kante(mesh, winkel = 30) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, winkel), kanteFertig);
    mesh.add(l); kanten.push(l);
  }
  const rohr = (parent, role, r, h, x, y, z) => add(parent, role, new THREE.CylinderGeometry(r, r, h, 12), x, y, z);

  // Fassade mit echten Öffnungen. Lokal: x entlang der Wand, y nach oben, Außenseite bei z = T.
  function fassade(breite, hoehe, loecher) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-breite / 2, 0); s.lineTo(breite / 2, 0); s.lineTo(breite / 2, hoehe); s.lineTo(-breite / 2, hoehe); s.closePath();
    for (const l of loecher) {
      const p = new THREE.Path(), x0 = l.u - l.w / 2, x1 = l.u + l.w / 2, y0 = l.v, y1 = l.v + l.h;
      p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath();
      s.holes.push(p);
    }
    const wand = add(g, 'wall', new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }), 0, 0, 0);
    kante(wand);
    for (const l of loecher) {
      const cy = l.v + l.h / 2, zf = T - 0.14, b = 0.07;
      box(g, 'frame', b, l.h, 0.08, l.u - l.w / 2 + b / 2, cy, zf);
      box(g, 'frame', b, l.h, 0.08, l.u + l.w / 2 - b / 2, cy, zf);
      box(g, 'frame', l.w, b, 0.08, l.u, l.v + b / 2, zf);
      box(g, 'frame', l.w, b, 0.08, l.u, l.v + l.h - b / 2, zf);
      box(g, 'glass', l.w - 2 * b, l.h - 2 * b, 0.02, l.u, cy, zf);
      if (l.w > 2) box(g, 'frame', 0.06, l.h - 2 * b, 0.08, l.u, cy, zf);
      if (l.w > 2 && l.h > 2.2) box(g, 'frame', l.w - 2 * b, 0.05, 0.08, l.u, l.v + l.h - 0.55, zf);
      if (l.typ === 'tuer') {
        box(g, 'frame', 0.06, l.h - 2 * b, 0.08, l.u, cy, zf);
        box(g, 'metal', 0.03, 0.6, 0.05, l.u - 0.12, l.v + 1.1, zf + 0.07);
        box(g, 'metal', 0.03, 0.6, 0.05, l.u + 0.12, l.v + 1.1, zf + 0.07);
      } else if (l.v > 0.4) {
        box(g, 'metal', l.w + 0.1, 0.035, 0.2, l.u, l.v - 0.017, T - 0.03); // Fensterbank
      }
    }
    return g;
  }
  function setze(g, seite, y, hw, hd, cz = 0) {
    if (seite === 'f') g.position.set(0, y, cz + hd - T);
    if (seite === 'b') { g.rotation.y = Math.PI; g.position.set(0, y, cz - hd + T); }
    if (seite === 'r') { g.rotation.y = Math.PI / 2; g.position.set(hw - T, y, cz); }
    if (seite === 'l') { g.rotation.y = -Math.PI / 2; g.position.set(-hw + T, y, cz); }
    haus.add(g);
  }
  function balkon(xc, y) {
    const z0 = D / 2;
    const p = box(haus, 'dark', 3.3, 0.2, 1.5, xc, y - 0.02, z0 + 0.75); kante(p);
    box(haus, 'kies', 3.1, 0.02, 1.36, xc, y + 0.09, z0 + 0.72);
    box(haus, 'rail', 3.22, 0.95, 0.03, xc, y + 0.58, z0 + 1.44);
    box(haus, 'rail', 0.03, 0.95, 1.4, xc - 1.6, y + 0.58, z0 + 0.74);
    box(haus, 'rail', 0.03, 0.95, 1.4, xc + 1.6, y + 0.58, z0 + 0.74);
    box(haus, 'metal', 3.28, 0.04, 0.06, xc, y + 1.07, z0 + 1.44);
    box(haus, 'metal', 0.06, 0.04, 1.44, xc - 1.6, y + 1.07, z0 + 0.74);
    box(haus, 'metal', 0.06, 0.04, 1.44, xc + 1.6, y + 1.07, z0 + 0.74);
    for (const dx of [-1.6, 1.6]) box(haus, 'metal', 0.04, 1.0, 0.04, xc + dx, y + 0.58, z0 + 1.44);
  }

  // Bodenplatte, Sockel, Eingang
  kante(box(haus, 'slab', W + 0.5, 0.3, D + 0.5, 0, 0.15, 0));
  box(haus, 'sockel', 5.07, 0.5, 0.04, -3.485, Y0 + 0.25, D / 2 + 0.02);
  box(haus, 'sockel', 5.07, 0.5, 0.04, 3.485, Y0 + 0.25, D / 2 + 0.02);
  box(haus, 'sockel', W + 0.08, 0.5, 0.04, 0, Y0 + 0.25, -D / 2 - 0.02);
  box(haus, 'sockel', 0.04, 0.5, D + 0.08, -W / 2 - 0.02, Y0 + 0.25, 0);
  box(haus, 'sockel', 0.04, 0.5, D + 0.08, W / 2 + 0.02, Y0 + 0.25, 0);
  kante(box(haus, 'slab', 2.6, 0.15, 1.3, 0, 0.225, D / 2 + 0.9));
  kante(box(haus, 'dark', 2.7, 0.1, 1.25, 0, Y0 + 2.62, D / 2 + 0.62));

  // Vollgeschosse
  for (let i = 0; i < 3; i++) {
    const y = Y0 + SH * i;
    const vorn = i === 0
      ? [{ u: -3.4, v: 0.7, w: 2.6, h: 1.9 }, { u: 0, v: 0.02, w: 1.7, h: 2.45, typ: 'tuer' }, { u: 3.4, v: 0.7, w: 2.6, h: 1.9 }]
      : [{ u: -3.4, v: 0.2, w: 2.6, h: 2.4 }, { u: 0, v: 1.0, w: 1.4, h: 1.4 }, { u: 3.4, v: 0.2, w: 2.6, h: 2.4 }];
    setze(fassade(W, SH, vorn), 'f', y, W / 2, D / 2);
    setze(fassade(W, SH, [{ u: -3.6, v: 1.0, w: 1.6, h: 1.4 }, { u: 0, v: 1.0, w: 1.2, h: 1.4 }, { u: 3.6, v: 1.0, w: 1.6, h: 1.4 }]), 'b', y, W / 2, D / 2);
    const seite = [{ u: -2.2, v: 0.9, w: 1.0, h: 1.6 }, { u: 2.2, v: 0.9, w: 1.0, h: 1.6 }];
    setze(fassade(D - 2 * T, SH, seite), 'r', y, W / 2, D / 2);
    setze(fassade(D - 2 * T, SH, seite), 'l', y, W / 2, D / 2);
    box(haus, 'slab', W - 0.04, 0.22, D - 0.04, 0, y + SH - 0.11, 0);        // Geschossdecke
    box(haus, 'slab', 2.6, SH - 0.22, 3.6, 0, y + (SH - 0.22) / 2, -1.6);   // Treppenhauskern
    if (i > 0) { balkon(-3.4, y); balkon(3.4, y); }
  }

  // Dachterrasse mit Attika und Glasgeländer
  const yD = Y0 + 3 * SH;
  kante(box(haus, 'dark', W + 0.16, 0.24, 0.42, 0, yD + 0.12, D / 2 - 0.13));
  kante(box(haus, 'dark', W + 0.16, 0.24, 0.42, 0, yD + 0.12, -D / 2 + 0.13));
  kante(box(haus, 'dark', 0.42, 0.24, D - 0.68, -W / 2 + 0.13, yD + 0.12, 0));
  kante(box(haus, 'dark', 0.42, 0.24, D - 0.68, W / 2 - 0.13, yD + 0.12, 0));
  box(haus, 'kies', W - 0.7, 0.05, D - 0.7, 0, yD + 0.03, 0);
  for (const s of [1, -1]) {
    box(haus, 'rail', W - 0.3, 0.95, 0.03, 0, yD + 0.72, s * (D / 2 - 0.15));
    box(haus, 'metal', W - 0.26, 0.04, 0.06, 0, yD + 1.21, s * (D / 2 - 0.15));
    box(haus, 'rail', 0.03, 0.95, D - 0.3, s * (W / 2 - 0.15), yD + 0.72, 0);
    box(haus, 'metal', 0.06, 0.04, D - 0.26, s * (W / 2 - 0.15), yD + 1.21, 0);
  }

  // Staffelgeschoss
  const PW = 9, PD = 7.5, PH = 2.8, PZ = -0.75;
  setze(fassade(PW, PH, [{ u: -2.4, v: 0.15, w: 2.6, h: 2.3 }, { u: 0, v: 0.9, w: 1.2, h: 1.4 }, { u: 2.4, v: 0.15, w: 2.6, h: 2.3 }]), 'f', yD, PW / 2, PD / 2, PZ);
  setze(fassade(PW, PH, [{ u: -2.2, v: 0.9, w: 1.4, h: 1.4 }, { u: 2.2, v: 0.9, w: 1.4, h: 1.4 }]), 'b', yD, PW / 2, PD / 2, PZ);
  setze(fassade(PD - 2 * T, PH, [{ u: 0, v: 0.9, w: 1.0, h: 1.5 }]), 'r', yD, PW / 2, PD / 2, PZ);
  setze(fassade(PD - 2 * T, PH, [{ u: 0, v: 0.9, w: 1.0, h: 1.5 }]), 'l', yD, PW / 2, PD / 2, PZ);
  box(haus, 'slab', 2.6, PH, 3.6, 0, yD + PH / 2, -1.6);
  const yR = yD + PH;
  kante(box(haus, 'dark', PW + 0.5, 0.24, PD + 0.5, 0, yR + 0.12, PZ));
  box(haus, 'kies', PW - 0.1, 0.04, PD - 0.1, 0, yR + 0.26, PZ);
  kante(box(haus, 'wall', 1.8, 0.6, 2.0, 0, yR + 0.54, -1.6));               // Aufzugsüberfahrt
  box(haus, 'dark', 1.95, 0.06, 2.15, 0, yR + 0.87, -1.6);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {                      // Photovoltaik
    const p = box(haus, 'pv', 1.05, 0.04, 1.75, s * (1.9 + i * 1.15), yR + 0.52, PZ + 1.6);
    p.rotation.x = 0.26;
    box(haus, 'metal', 0.04, 0.42, 0.04, s * (1.9 + i * 1.15), yR + 0.45, PZ + 0.85);
  }
  rohr(haus, 'metal', 0.07, 0.5, -3.2, yR + 0.5, -3.4); rohr(haus, 'metal', 0.07, 0.5, 3.2, yR + 0.5, -3.4);
  for (const s of [-1, 1]) rohr(haus, 'metal', 0.05, yD - 0.4, s * (W / 2 + 0.07), (yD + 0.4) / 2, D / 2 - 0.4); // Fallrohre

  // Gerüst, nur im Rohbau sichtbar
  const gx0 = W / 2 + 0.3, gx1 = W / 2 + 1.15;
  for (const z of [-4.6, -2.3, 0, 2.3, 4.6]) for (const x of [gx0, gx1]) rohr(haus, 'geruest', 0.03, 11.4, x, 5.7, z);
  for (const y of [2.1, 4.1, 6.1, 8.1, 10.1]) {
    box(haus, 'bohle', gx1 - gx0, 0.05, 9.4, (gx0 + gx1) / 2, y, 0);
    for (const dy of [0.5, 1.0]) box(haus, 'geruest', 0.04, 0.04, 9.4, gx1, y + dy, 0);
    for (const z of [-4.6, -2.3, 0, 2.3, 4.6]) box(haus, 'geruest', gx1 - gx0, 0.04, 0.04, (gx0 + gx1) / 2, y - 0.05, z);
  }

  const k = 2.75 / TOP, H = TOP * k;
  haus.scale.setScalar(k);
  const pivot = new THREE.Group(); pivot.add(haus); scene.add(pivot);

  const state = { bau: 100, mode: "fertig", spin: !reduced };
  function setBau(v) {
    state.bau = Math.max(0, Math.min(100, v));
    plane.constant = state.bau >= 100 ? 1000 : (state.bau / 100) * H + 0.004;
    onChange && onChange(state);
  }
  function setMode(m) {
    state.mode = m;
    for (const o of meshes) {
      const r = o.userData.role, gr = r === 'geruest' || r === 'bohle';
      if (m === 'fertig') { o.visible = !gr; o.material = mat[r]; }
      else if (m === 'draht') { o.visible = !gr; o.material = draht; }
      else {
        o.visible = gr || r === 'wall' || r === 'slab' || r === 'dark';
        o.material = gr ? mat[r] : r === 'wall' ? roh.wall : roh.beton;
      }
    }
    for (const l of kanten) l.visible = m !== 'draht';
    onChange && onChange(state);
  }
  let anim = null;
  function stop() { if (anim) cancelAnimationFrame(anim); anim = null; }
  function play() {
    stop(); setMode('roh');
    const t0 = performance.now(), dur = 5200;
    const step = (t) => {
      const q = Math.min(1, (t - t0) / dur);
      setBau(100 * (1 - Math.pow(1 - q, 1.6)));
      if (q < 1) anim = requestAnimationFrame(step);
      else { anim = null; setMode('fertig'); }
    };
    anim = requestAnimationFrame(step);
  }

  let yaw = 0.62, pitch = 0.36, dragging = false, px = 0, py = 0, sichtbar = true;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); px = e.clientX; py = e.clientY; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw += (e.clientX - px) * 0.008; pitch = Math.max(0.06, Math.min(1.2, pitch + (e.clientY - py) * 0.005));
    px = e.clientX; py = e.clientY;
  });
  for (const n of ['pointerup', 'pointercancel']) canvas.addEventListener(n, () => { dragging = false; });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { yaw -= 0.15; e.preventDefault(); }
    if (e.key === 'ArrowRight') { yaw += 0.15; e.preventDefault(); }
  });

  function size() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(container); size();
  new IntersectionObserver((e) => { sichtbar = e[0].isIntersecting; }).observe(container);

  let last = performance.now();
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!sichtbar) return;
    if (state.spin && !dragging) yaw += dt * 0.1;
    pivot.rotation.y = yaw;
    const d = cam.aspect < 1 ? 11 : 9.2, ty = H * 0.44;
    cam.position.set(0, ty + d * Math.sin(pitch), d * Math.cos(pitch)); cam.lookAt(0, ty, 0);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(loop);

  setMode('fertig'); setBau(100);
  return {
    setBau: (v) => { stop(); setBau(v); }, setMode: (m) => { stop(); setMode(m); }, play,
    toggleSpin: () => { state.spin = !state.spin; onChange && onChange(state); },
    reduced,
  };
}
