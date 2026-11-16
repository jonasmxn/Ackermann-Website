// Übernimmt die Datenschutzerklärung der bisherigen Website und ersetzt nur die Abschnitte,
// die Technik beschreiben, die es auf der neuen Website nicht mehr gibt (oder die neu ist).
// Aufruf: node tools/datenschutz-uebernehmen.mjs
import fs from 'node:fs';

const r = await fetch('https://ackermann-andernach.de/datenschutzerklaerung/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
let html = (await r.text()).split(/<main[^>]*>/)[1].split('</main>')[0];
html = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/­|&shy;/g, '');
html = html.replace(/<a\s[^>]*?href="([^"]*)"[^>]*>/gi, '<a href="$1" rel="noopener">');
html = html.replace(/<(\/?)(h[1-4]|p|ul|ol|li|strong|em|br)(\s[^>]*)?>/gi, '<$1$2>');
html = html.replace(/<(?!\/?(?:h[1-4]|p|ul|ol|li|strong|em|br|a)\b)[^>]+>/gi, '').replace(/\s+/g, ' ');
const bloecke = html.split(/(?=<h[1-4]>)/).map((b) => b.trim()).filter((b) => /^<h[2-4]>/.test(b));

const HOSTING = `<h2>Hosting</h2>
<p>Wir hosten die Inhalte unserer Website bei Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, USA (nachfolgend Netlify). Wenn Sie unsere Website besuchen, erfasst Netlify verschiedene Logfiles inklusive Ihrer IP-Adressen.</p>
<p>Die Verwendung von Netlify erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website.</p>`;
const FORMULAR = `<h3>Kontaktformular</h3>
<p>Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.</p>
<p>Die Formulardaten werden von unserem Hoster Netlify entgegengenommen, dort gespeichert und uns per E-Mail zugestellt.</p>
<p>Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO).</p>
<p>Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen, insbesondere Aufbewahrungsfristen, bleiben unberührt.</p>`;

const weg = [/^(\d+\.\s*)?hosting$/i, /analyse-tools und tools von dritt/i, /^cookies$/i, /^kontaktformular$/i, /analyse-tools und werbung/i, /^google maps$/i, /^cloudflare turnstile$/i, /^wordfence$/i];
const ersatz = { hosting: HOSTING, kontaktformular: FORMULAR };
const aus = [], entfernt = [];
let sperre = 0, nr = 0;
for (const b of bloecke) {
  const stufe = +b[2], titel = b.match(/^<h\d>(.*?)<\/h\d>/)[1].replace(/<[^>]+>/g, '').trim();
  if (sperre && stufe > sperre) continue;
  sperre = 0;
  if (weg.some((m) => m.test(titel))) {
    sperre = stufe; entfernt.push(titel);
    const schluessel = titel.replace(/^\d+\.\s*/, '').toLowerCase();
    if (ersatz[schluessel]) aus.push(stufe === 2 ? ersatz[schluessel].replace('<h2>', `<h2>${++nr}. `) : ersatz[schluessel]);
    continue;
  }
  aus.push(stufe === 2 ? b.replace(/^<h2>\s*(\d+\.\s*)?/, `<h2>${++nr}. `) : b);
}
fs.writeFileSync('src/content/datenschutz.html', aus.join('\n') + '\n');
console.log(`${bloecke.length} Abschnitte gelesen, ${aus.length} übernommen. Entfernt oder ersetzt: ${entfernt.join(' | ')}`);
console.log([...aus.join('\n').matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1]).join(' | '));
for (const wort of ['IONOS', 'Google Maps', 'Wordfence', 'Turnstile', 'WordPress', 'Cookie']) console.log(wort, (aus.join(' ').match(new RegExp(wort, 'gi')) || []).length);
