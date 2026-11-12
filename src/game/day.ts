/**
 * Le « jour » du jeu, à l'heure de Paris : tous les joueurs changent de grille, de défi et de pendu
 * au même moment (minuit à Paris), où qu'ils soient dans le monde.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Dernier dimanche d'un mois (UTC), en jour du mois. */
function lastSunday(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate() - last.getUTCDay();
}

/**
 * Décalage de Paris par rapport à UTC, en heures : +2 en heure d'été (du dernier dimanche de mars,
 * 1 h UTC, au dernier dimanche d'octobre, 1 h UTC), +1 sinon. Calcul fait à la main pour ne pas
 * dépendre de la prise en charge des fuseaux horaires (Intl) par le moteur JavaScript du téléphone.
 */
export function parisOffsetHours(date: Date): number {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 2, lastSunday(y, 2), 1);
  const end = Date.UTC(y, 9, lastSunday(y, 9), 1);
  const t = date.getTime();
  return t >= start && t < end ? 2 : 1;
}

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function parisDayKey(date = new Date()): string {
  const paris = new Date(date.getTime() + parisOffsetHours(date) * 3600000);
  return `${paris.getUTCFullYear()}-${pad(paris.getUTCMonth() + 1)}-${pad(paris.getUTCDate())}`;
}

/** Ajoute (ou retire) des jours à une date AAAA-MM-JJ, sans tenir compte des fuseaux. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const LAUNCH = Date.UTC(2026, 10, 8);

/** Numéro du jour (n° 1 le 8 novembre 2026), commun aux trois modes. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - LAUNCH) / 86400000) + 1;
}

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date simulée pour tester une autre journée, en développement seulement :
 * - web en local : http://localhost:8081/?date=2026-12-01
 * - partout : variable EXPO_PUBLIC_TERMINUS_DATE=2026-12-01 au lancement de `expo start`.
 */
function simulatedDay(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_TERMINUS_DATE;
  const g = globalThis as { location?: { search?: string; hostname?: string } };
  const local = g.location?.hostname === 'localhost' || g.location?.hostname === '127.0.0.1';
  const fromUrl = local ? new URLSearchParams(g.location?.search ?? '').get('date') : null;
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const value = fromUrl ?? (isDev ? fromEnv : undefined);
  return value && KEY_RE.test(value) ? value : null;
}

/** Jour en cours du jeu (heure de Paris, ou date simulée en développement). */
export function currentDayKey(): string {
  return simulatedDay() ?? parisDayKey();
}
