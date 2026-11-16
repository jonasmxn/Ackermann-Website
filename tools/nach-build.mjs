// Das Redaktionssystem wird nur lokal benutzt und deshalb nicht mit veröffentlicht.
import fs from 'node:fs';
fs.rmSync('dist/admin', { recursive: true, force: true });
console.log('dist/admin entfernt (Redaktion bleibt lokal)');
