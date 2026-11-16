// Lädt alle Städte, Dörfer und Ortsteile im Kartenausschnitt aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL)
// und trägt sie in src/content/orte.json sowie in die Ortsauswahl des Redaktionssystems ein.
// Aufruf: node tools/orte-laden.mjs
import fs from 'node:fs';

const H = JSON.parse(fs.readFileSync('src/daten/hoehen.json', 'utf8'));
const n = 2 ** H.z;
const lon = (x) => (x / n) * 360 - 180;
const lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
const rand = 0.03; // Orte direkt am Kartenrand weglassen
const W = lon(H.x0 + rand * H.spalten), O = lon(H.x0 + (1 - rand) * H.spalten), N = lat(H.y0 + rand * H.zeilen), S = lat(H.y0 + (1 - rand) * H.zeilen);

const frage = `[out:json][timeout:60];node["place"~"^(city|town|village|suburb)$"]["name"](${S},${W},${N},${O});out;`;
const r = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST', body: 'data=' + encodeURIComponent(frage),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'static-map-build/0.1' },
});
if (!r.ok) throw new Error('Overpass: ' + r.status);
const rang = { city: 0, town: 1, village: 2, suburb: 3 };
const funde = (await r.json()).elements.sort((a, b) => rang[a.tags.place] - rang[b.tags.place]);

const datei = 'src/content/orte.json';
const alt = JSON.parse(fs.readFileSync(datei, 'utf8')).orte;
const orte = new Map(alt.map((o) => [o.name, o])); // bestehende Einträge behalten ihre Koordinaten
for (const e of funde) if (!orte.has(e.tags.name)) orte.set(e.tags.name, { name: e.tags.name, lat: +e.lat.toFixed(4), lon: +e.lon.toFixed(4) });
const liste = [...orte.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
fs.writeFileSync(datei, JSON.stringify({ orte: liste }, null, 1) + '\n');

const cfg = 'public/admin/config.yml';
const zeile = `      - { name: ort, label: Ort, widget: select, options: [${liste.map((o) => JSON.stringify(o.name)).join(', ')}], hint: "Tippen zum Suchen. Bestimmt den Punkt auf der Regionskarte." }`;
const y = fs.readFileSync(cfg, 'utf8').replace(/^      - \{ name: ort, label: Ort, widget: select.*$/m, zeile);
fs.writeFileSync(cfg, y);
console.log(`${liste.length} Orte (vorher ${alt.length}). Beispiele: ${['Mendig', 'Plaidt', 'Miesenheim', 'Weißenthurm', 'Kruft'].map((n) => n + (orte.has(n) ? ' ✓' : ' fehlt')).join(', ')}`);
