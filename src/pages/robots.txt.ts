// Solange die Website nur unter der Netlify-Adresse läuft, bleibt sie für Suchmaschinen gesperrt.
// Sobald bei Netlify die Firmenadresse als Hauptadresse eingetragen ist, wird sie freigegeben.
import { live, adresse } from '../daten/live';

export function GET() {
  const text = live
    ? `User-agent: *\nAllow: /\n\nSitemap: ${adresse}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
