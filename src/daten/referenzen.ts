// Lädt alle Referenzen aus src/content/referenzen, sortiert nach dem Feld "reihenfolge".
export interface Referenz {
  slug: string; titel: string; bauart: string; region: string; ort: string; adresse?: string; bild: string;
  startseite: boolean; reihenfolge: number; baujahr?: string; flaeche?: string; leistungsumfang?: string[];
  beschreibung?: string; galerie?: string[];
}
const dateien = import.meta.glob('../content/referenzen/*.json', { eager: true });
export const referenzen: Referenz[] = Object.entries(dateien)
  .map(([pfad, m]: [string, any]) => ({ slug: pfad.split('/').pop()!.replace('.json', ''), ...(m.default ?? m) }))
  .sort((a, b) => a.reihenfolge - b.reihenfolge);
