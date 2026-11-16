// Netlify setzt beim Bauen die Variable URL auf die Hauptadresse des Projekts.
// "live" ist die Website erst, wenn das die Firmenadresse ist und nicht mehr die Netlify-Adresse.
export const FIRMENADRESSE = 'ackermann-andernach.de';
export const adresse = (process.env.URL ?? 'http://localhost:4321').replace(/\/$/, '');
export const live = adresse.includes(FIRMENADRESSE);
