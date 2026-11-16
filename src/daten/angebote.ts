// Lädt alle Immobilienangebote aus src/content/angebote, sortiert nach dem Feld "reihenfolge".
export interface Angebot {
  slug: string; titel: string; art: string; ort: string; status: string; bild: string; galerie?: string[];
  flaeche?: string; zimmer?: string; preis?: string; beschreibung?: string; reihenfolge: number;
}
const dateien = import.meta.glob('../content/angebote/*.json', { eager: true });
export const angebote: Angebot[] = Object.entries(dateien)
  .map(([pfad, m]: [string, any]) => ({ slug: pfad.split('/').pop()!.replace('.json', ''), ...(m.default ?? m) }))
  .sort((a, b) => a.reihenfolge - b.reihenfolge);
