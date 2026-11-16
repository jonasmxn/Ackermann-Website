// Holt einmalig die weiteren Fotos jeder Referenz von der bisherigen Website und trägt sie als "galerie" in die Inhaltsdateien ein.
// Aufruf: node tools/galerien-laden.mjs
import fs from 'node:fs';
import path from 'node:path';

const ALT = 'https://ackermann-andernach.de';
const UA = { 'User-Agent': 'Mozilla/5.0 (einmaliger Abruf fuer den Relaunch)' };
const bereiche = ['kreis-mayen-koblenz', 'ahrweiler', 'hallen', 'gewerbe', 'kleinbaustellen', 'kreis-neuwied', 'koblenz', 'vermarktung', 'wohnen'];
const dir = 'src/content/referenzen';

for (const datei of fs.readdirSync(dir)) {
  const slug = datei.replace('.json', ''), pfad = path.join(dir, datei), ref = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  let html = '';
  for (const b of bereiche) {
    const r = await fetch(`${ALT}/projekte/${b}/${slug}/`, { headers: UA });
    if (r.ok) { html = await r.text(); break; }
  }
  if (!html) { console.log(slug, 'Seite nicht gefunden'); continue; }
  const haupt = html.split(/<main[\s>]/)[1]?.split('</main>')[0] ?? html;
  const urls = [...new Set([...haupt.matchAll(/https:\/\/ackermann-andernach\.de\/wp-content\/uploads\/[^"'\s)]+?\.(?:jpe?g|png)/gi)].map((m) => m[0].replace(/-\d+x\d+(\.\w+)$/, '$1')))]
    .filter((u) => !/logo|E3_Ansichten-klein|gallery-\d/i.test(u) || /E3_Ansichten/.test(u) && slug.startsWith('2-einfamilien'));
  const ziel = `public/bilder/referenzen/${slug}`;
  const galerie = [];
  for (const [i, u] of urls.entries()) {
    const r = await fetch(u, { headers: UA });
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 8000) continue; // Symbole und Platzhalter
    fs.mkdirSync(ziel, { recursive: true });
    const name = `${String(i + 1).padStart(2, '0')}${path.extname(u).toLowerCase()}`;
    fs.writeFileSync(path.join(ziel, name), buf);
    galerie.push(`/bilder/referenzen/${slug}/${name}`);
  }
  ref.galerie = galerie;
  fs.writeFileSync(pfad, JSON.stringify(ref, null, 2) + '\n');
  console.log(slug, galerie.length, 'Fotos');
}
