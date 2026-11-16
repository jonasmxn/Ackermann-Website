// Regionskarte: echtes Geländemodell rund um Andernach mit aufgelegter OpenStreetMap-Karte und einem Pin je Ort.
// Die Daten erzeugt tools/karte-bauen.mjs (public/karte/karte.jpg und src/daten/hoehen.json).
import * as THREE from 'three';
import H from '../daten/hoehen.json';

const BW = 8, BD = (BW * H.zeilen) / H.spalten, UEBERHOEHUNG = 2.4;
const proKm = BW / H.breiteKm;
const yVon = (m) => ((m - H.min) / 1000) * proKm * UEBERHOEHUNG;
const tx = (lon) => ((lon + 180) / 360) * 2 ** H.z;
const ty = (lat) => ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** H.z;
function hoeheBei(fx, fy) {
  const gx = Math.min(H.gw - 1.001, Math.max(0, fx * (H.gw - 1))), gy = Math.min(H.gh - 1.001, Math.max(0, fy * (H.gh - 1)));
  const a = Math.floor(gx), b = Math.floor(gy), u = gx - a, v = gy - b, w = H.werte, g = H.gw;
  return w[b * g + a] * (1 - u) * (1 - v) + w[b * g + a + 1] * u * (1 - v) + w[(b + 1) * g + a] * (1 - u) * v + w[(b + 1) * g + a + 1] * u * v;
}

export function initKarte({ container, canvas, labels, orte, onPick }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6dd, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-5, 5, -3); scene.add(sun);

  let dirty = true;
  const welt = new THREE.Group(); scene.add(welt);
  const geo = new THREE.PlaneGeometry(BW, BD, H.gw - 1, H.gh - 1); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, yVon(H.werte[i]));
  geo.computeVertexNormals();
  const tex = new THREE.TextureLoader().load('/karte/karte.jpg', () => { dirty = true; });
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  welt.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })));

  // Seitenwände des Geländeblocks
  const rand = [], TIEF = -0.28;
  const kante = (idx) => { for (let k = 0; k < idx.length - 1; k++) {
    const a = idx[k], b = idx[k + 1], ax = pos.getX(a), ay = pos.getY(a), az = pos.getZ(a), bx = pos.getX(b), by = pos.getY(b), bz = pos.getZ(b);
    rand.push(ax, ay, az, bx, by, bz, ax, TIEF, az, bx, by, bz, bx, TIEF, bz, ax, TIEF, az);
  } };
  const reihe = (j) => Array.from({ length: H.gw }, (_, i) => j * H.gw + i), spalte = (i) => Array.from({ length: H.gh }, (_, j) => j * H.gw + i);
  kante(reihe(0)); kante(reihe(H.gh - 1)); kante(spalte(0)); kante(spalte(H.gw - 1));
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rand, 3)); rg.computeVertexNormals();
  welt.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xc9d1da, side: THREE.DoubleSide })));

  const pins = [];
  for (const o of orte.filter((o) => o.anzahl > 0)) {
    const fx = (tx(o.lon) - H.x0) / H.spalten, fy = (ty(o.lat) - H.y0) / H.zeilen;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) continue;
    const x = (fx - 0.5) * BW, z = (fy - 0.5) * BD, y = yVon(hoeheBei(fx, fy)), h = 0.32 + 0.03 * o.anzahl;
    const m = new THREE.MeshBasicMaterial({ color: 0x2a69a8 });
    const stab = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, h, 8), new THREE.MeshBasicMaterial({ color: 0x15202c })); stab.position.set(x, y + h / 2, z); welt.add(stab);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.06 + 0.006 * o.anzahl, 20, 14), m); kopf.position.set(x, y + h, z); welt.add(kopf);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'pin'; el.setAttribute('aria-pressed', 'false');
    el.innerHTML = `<span>${o.name}</span> <b>${o.anzahl}</b>`;
    el.setAttribute('aria-label', `${o.name}: ${o.anzahl} ${o.anzahl === 1 ? 'Projekt' : 'Projekte'} zeigen`);
    el.addEventListener('click', () => onPick(o.name));
    labels.appendChild(el);
    pins.push({ o, el, m, p: new THREE.Vector3(x, y + h + 0.13, z) });
  }

  let yaw = 0, dragging = false, px = 0, sichtbar = true;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); px = e.clientX; });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; yaw = Math.max(-0.7, Math.min(0.7, yaw + (e.clientX - px) * 0.004)); px = e.clientX; dirty = true; });
  for (const n of ['pointerup', 'pointercancel']) canvas.addEventListener(n, () => { dragging = false; });
  function size() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true;
  }
  new ResizeObserver(size).observe(container); size();
  new IntersectionObserver((e) => { sichtbar = e[0].isIntersecting; dirty = true; }).observe(container);

  // Auf schmalen Bildschirmen rückt die Karte auf den Bereich mit den Projekten zusammen
  const mitte = new THREE.Vector3(), off = new THREE.Vector3(), UP = THREE.Object3D.DEFAULT_UP;
  for (const pin of pins) mitte.add(pin.p);
  if (pins.length) mitte.divideScalar(pins.length); mitte.y = 0;
  const v = new THREE.Vector3();
  function loop() {
    requestAnimationFrame(loop);
    if (!sichtbar || !dirty) return; dirty = false;
    welt.rotation.y = yaw;
    const schmal = cam.aspect < 1.25;
    off.set(0, 0, 0); if (schmal) off.copy(mitte).applyAxisAngle(UP, yaw).negate();
    welt.position.copy(off);
    const d = schmal ? 9.5 : Math.max(12.6, 17 / cam.aspect);
    cam.position.set(0, d * 0.8, d * 0.6); cam.lookAt(0, 0, schmal ? 0 : 0.35);
    renderer.render(scene, cam);
    const w = container.clientWidth, h = container.clientHeight;
    for (const pin of pins) {
      v.copy(pin.p).applyAxisAngle(UP, yaw).add(off).project(cam);
      pin.el.style.transform = `translate(-50%,-100%) translate(${((v.x + 1) / 2) * w}px,${((1 - v.y) / 2) * h}px)`;
    }
  }
  requestAnimationFrame(loop);

  return {
    markiere(name) {
      for (const pin of pins) {
        const an = pin.o.name === name;
        pin.el.setAttribute('aria-pressed', an ? 'true' : 'false'); pin.m.color.set(an ? 0xd9731f : 0x2a69a8);
      }
      dirty = true;
    },
  };
}
