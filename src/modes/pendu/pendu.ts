import { STATIONS } from '../../data/stations';
import { dayNumber } from '../../game/day';
import { createRng, shuffle } from '../../game/rng';
import type { Station } from '../../game/types';

/** Erreurs permises au pendu (lettre absente ou mauvais nom proposé). À ajuster ici. */
export const MAX_PENDU_ERRORS = 5;
/** Une station ne revient pas avant ce nombre de jours. */
export const PENDU_NO_REPEAT_DAYS = 60;
/** Nombre minimum de lettres d'un nom à deviner. */
export const PENDU_MIN_LETTERS = 5;

/** Lettre de base, en majuscule : « é » -> « E », « ç » -> « C ». Renvoie null si ce n'est pas une lettre. */
export function baseLetter(char: string): string | null {
  const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return /^[A-Z]$/.test(base) ? base : null;
}

/** Lettres (de base) d'un nom, sans espaces, tirets ni ponctuation. */
export function nameLetters(name: string): string[] {
  return [...name].map(baseLetter).filter((l): l is string => l !== null);
}

/** Stations qu'on peut faire deviner : pas de chiffre dans le nom, au moins 5 lettres. */
export function isPenduEligible(s: Station): boolean {
  return !/\d/.test(s.name) && nameLetters(s.name).length >= PENDU_MIN_LETTERS;
}

export const PENDU_STATIONS: Station[] = STATIONS.filter(isPenduEligible).sort((a, b) => a.id.localeCompare(b.id));

const L = PENDU_STATIONS.length;
const N = PENDU_NO_REPEAT_DAYS;

function rawCycle(cycle: number): Station[] {
  return shuffle(createRng(`terminus-pendu-cycle-${cycle}`), PENDU_STATIONS);
}

const cycleCache = new Map<number, Station[]>();

/**
 * Ordre des stations pour un « cycle » (un passage complet sur toutes les stations).
 * Chaque cycle est un mélange déterministe ; à la jonction entre deux cycles, les 60 premières
 * stations du cycle ne doivent pas faire partie des 60 dernières du cycle précédent : on les échange
 * avec des stations du milieu. Les 60 dernières places ne sont jamais modifiées, si bien que chaque
 * cycle ne dépend que de son mélange et de celui du cycle précédent.
 */
export function cycleOrder(cycle: number): Station[] {
  const cached = cycleCache.get(cycle);
  if (cached) return cached;
  const order = rawCycle(cycle);
  const prevTail = new Set(rawCycle(cycle - 1).slice(L - N).map((s) => s.id));
  let swap = N;
  for (let i = 0; i < N; i++) {
    if (!prevTail.has(order[i].id)) continue;
    while (swap < L - N && prevTail.has(order[swap].id)) swap++;
    if (swap >= L - N) throw new Error('Pas assez de stations pour le pendu');
    [order[i], order[swap]] = [order[swap], order[i]];
    swap++;
  }
  cycleCache.set(cycle, order);
  return order;
}

/** Station à deviner pour un jour donné (AAAA-MM-JJ, heure de Paris). */
export function penduStation(day: string): Station {
  const index = dayNumber(day) - 1;
  const cycle = Math.floor(index / L);
  const pos = index - cycle * L;
  return cycleOrder(cycle)[pos];
}

/** Station tirée au hasard pour un pendu en plus (payé avec une pièce), différente de celle du jour. */
export function penduFromSeed(seed: string, day: string): Station {
  const today = penduStation(day).id;
  const pool = PENDU_STATIONS.filter((s) => s.id !== today);
  return pool[Math.floor(createRng(seed)() * pool.length)];
}

/** Toutes les lettres du nom sont-elles trouvées ? */
export function isSolved(name: string, guessed: Set<string>): boolean {
  return nameLetters(name).every((l) => guessed.has(l));
}

/** Rangées du clavier AZERTY affiché à l'écran. */
export const AZERTY = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
