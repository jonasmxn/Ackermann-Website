// Baut die Regionskarte einmalig aus offenen Daten und legt sie im Projekt ab (kein Nachladen fremder Dienste auf der Website).
// Kartenbild: © OpenStreetMap-Mitwirkende (ODbL). Höhen: Terrain Tiles (Mapzen/AWS Open Data).
// Aufruf: node tools/karte-bauen.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const Z = 12, ZH = 11, ANKER = { lat: 50.439, lon: 7.402 }; // Andernach
const n = 2 ** Z;
const tx = (lon, z = Z) => ((lon + 180) / 360) * 2 ** z;
const ty = (lat, z = Z) => ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z;
const X0 = Math.floor(tx(ANKER.lon)) - 3, X1 = X0 + 5, Y0 = Math.floor(ty(ANKER.lat)) - 2, Y1 = Y0 + 4;
const COLS = X1 - X0 + 1, ROWS = Y1 - Y0 + 1;
const UA = { 'User-Agent': 'static-map-build/0.1 (einmaliger Abruf fuer eine statische Karte)' };
const hole = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
};
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync('public/karte', { recursive: true });
fs.mkdirSync('src/daten', { recursive: true });

// 1) Kartenbild aus OSM-Kacheln zusammensetzen
const teile = [];
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
  teile.push({ input: await hole(`https://tile.openstreetmap.org/${Z}/${x}/${y}.png`), left: (x - X0) * 256, top: (y - Y0) * 256 });
  await warte(150);
}
await sharp({ create: { width: COLS * 256, height: ROWS * 256, channels: 3, background: '#ffffff' } })
  .composite(teile).jpeg({ quality: 88 }).toFile('public/karte/karte.jpg');

// 2) Höhenraster aus Terrarium-Kacheln
const hx0 = Math.floor(X0 / 2), hx1 = Math.floor(X1 / 2), hy0 = Math.floor(Y0 / 2), hy1 = Math.floor(Y1 / 2);
const hw = (hx1 - hx0 + 1) * 256, hh = (hy1 - hy0 + 1) * 256, dem = new Float32Array(hw * hh);
for (let y = hy0; y <= hy1; y++) for (let x = hx0; x <= hx1; x++) {
  const { data, info } = await sharp(await hole(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZH}/${x}/${y}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const p = (j * info.width + i) * 3;
    dem[((y - hy0) * 256 + j) * hw + (x - hx0) * 256 + i] = data[p] * 256 + data[p + 1] + data[p + 2] / 256 - 32768;
  }
}
const GW = 193, GH = Math.round((GW - 1) * ROWS / COLS) + 1, werte = [];
let min = 1e9, max = -1e9;
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const px = ((X0 + (i / (GW - 1)) * COLS) / 2 - hx0) * 256, py = ((Y0 + (j / (GH - 1)) * ROWS) / 2 - hy0) * 256;
  const a = Math.min(hw - 2, Math.max(0, Math.floor(px))), b = Math.min(hh - 2, Math.max(0, Math.floor(py))), fx = Math.min(1, px - a), fy = Math.min(1, py - b);
  const h = dem[b * hw + a] * (1 - fx) * (1 - fy) + dem[b * hw + a + 1] * fx * (1 - fy) + dem[(b + 1) * hw + a] * (1 - fx) * fy + dem[(b + 1) * hw + a + 1] * fx * fy;
  werte.push(Math.round(h)); min = Math.min(min, h); max = Math.max(max, h);
}
const kmProKachel = (40075.017 * Math.cos((ANKER.lat * Math.PI) / 180)) / n;
fs.writeFileSync('src/daten/hoehen.json', JSON.stringify({ z: Z, x0: X0, y0: Y0, spalten: COLS, zeilen: ROWS, gw: GW, gh: GH, min: Math.round(min), max: Math.round(max), breiteKm: +(COLS * kmProKachel).toFixed(2), werte }));
console.log(`Karte ${COLS * 256}×${ROWS * 256}px, Raster ${GW}×${GH}, Höhen ${Math.round(min)}–${Math.round(max)} m, Breite ${(COLS * kmProKachel).toFixed(1)} km`);

// Zusatz: Maße der vorhandenen Fotos ausgeben
for (const f of fs.readdirSync('public/bilder/referenzen')) {
  const m = await sharp('public/bilder/referenzen/' + f).metadata(); console.log(f, m.width + '×' + m.height);
}
const m = await sharp('public/bilder/ueber-uns.jpg').metadata(); console.log('ueber-uns.jpg', m.width + '×' + m.height);
