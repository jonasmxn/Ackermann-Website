// Seitenübersicht für Suchmaschinen. Neue Referenzen und Leistungen erscheinen automatisch.
import { adresse } from '../daten/live';
import { referenzen } from '../daten/referenzen';
import leistungen from '../content/leistungen.json';

export function GET() {
  const pfade = ['/', '/unternehmen/', '/team/', '/immobilien/', '/impressum/', '/datenschutz/',
    ...leistungen.eintraege.filter((l) => l.slug).map((l) => `/leistungen/${l.slug}/`),
    ...referenzen.map((r) => `/referenzen/${r.slug}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pfade.map((p) => `  <url><loc>${adresse}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
