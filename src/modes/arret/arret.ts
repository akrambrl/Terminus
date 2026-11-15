import { LINE_GRAPH } from '../../data/lineGraph';
import { STATIONS } from '../../data/stations';
import { dayNumber } from '../../game/day';
import { createRng, pick, shuffle } from '../../game/rng';
import type { LineId } from '../../game/types';

/**
 * « Prochain arrêt » : la rame avance toute seule (3 s à chaque station) ; le joueur devine la ligne
 * au chrono. 100 points au départ, −3 points par seconde, −15 par erreur (3 erreurs au plus), 30 s au plus.
 */
export const ARRET_STOPS = 5;
/** Temps passé à quai à chaque station. */
export const ARRET_STOP_MS = 3000;
/** Temps maximum (le chrono démarre à l'arrivée à la 1re station). */
export const ARRET_LIMIT_MS = 30000;
export const ARRET_MAX_ERRORS = 3;
/** Premier jour du jeu (archives, classement). */
export const ARRET_LAUNCH = '2026-11-15';

export const ARRET_LINES: LineId[] = ['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14'];

export interface Trip {
  line: LineId;
  /** Les 5 stations du trajet, dans l'ordre. */
  stops: string[];
}

const LINES_OF = new Map(STATIONS.map((s) => [s.id, s.lines]));

/** La suite de stations se suit-elle sur cette ligne (stations voisines, sans repasser) ? */
export function followsLine(line: string, stops: string[]): boolean {
  const g = LINE_GRAPH[line];
  if (!g || stops.some((id) => !g.adj[id])) return false;
  if (new Set(stops).size !== stops.length) return false;
  for (let i = 1; i < stops.length; i++) if (!g.adj[stops[i - 1]].includes(stops[i])) return false;
  return true;
}

/**
 * Lignes possibles d'après les stations déjà vues (pour expliquer la réponse). Seule la vraie ligne
 * est acceptée : à Châtelet (5 lignes), proposer tôt est un pari.
 */
export function possibleLines(stops: string[]): LineId[] {
  return ARRET_LINES.filter((l) => followsLine(l, stops));
}

/** Tous les trajets de 5 stations d'une ligne (hors boucles à sens unique), dans les deux sens. */
function tripsOf(line: LineId): string[][] {
  const g = LINE_GRAPH[line];
  const banned = new Set(g.loop);
  const out: string[][] = [];
  const walk = (path: string[]) => {
    if (path.length === ARRET_STOPS) {
      out.push(path);
      return;
    }
    for (const next of g.adj[path[path.length - 1]]) {
      if (!banned.has(next) && !path.includes(next)) walk([...path, next]);
    }
  };
  for (const start of Object.keys(g.adj)) if (!banned.has(start)) walk([start]);
  // La ligne doit être la seule possible une fois les 5 stations passées.
  return out.filter((p) => possibleLines(p).length === 1);
}

const TRIPS = new Map<LineId, string[][]>();
function trips(line: LineId) {
  let t = TRIPS.get(line);
  if (!t) {
    t = tripsOf(line);
    TRIPS.set(line, t);
  }
  return t;
}

/** Lignes jouables (la 3 bis, trop courte, n'a pas de trajet de 5 stations). */
const PLAYABLE = () => ARRET_LINES.filter((l) => trips(l).length > 0);

/**
 * Choisit un trajet de la ligne : départ d'une station de correspondance quand c'est possible (le joueur
 * doit parier ou attendre), et de préférence un tronçon partagé avec une autre ligne (8 et 9, 2 et 5…).
 */
function pickTrip(rng: () => number, line: LineId): Trip {
  const all = trips(line);
  const doubt = (p: string[]) => possibleLines(p.slice(0, 1)).length + possibleLines(p.slice(0, 2)).length;
  const hubs = all.filter((p) => (LINES_OF.get(p[0])?.length ?? 1) > 1);
  const pool = hubs.length ? hubs : all;
  const best = Math.max(...pool.map(doubt));
  const shared = pool.filter((p) => doubt(p) === best);
  return { line, stops: pick(rng, shared.length && rng() < 0.4 ? shared : pool) };
}

/** Trajet du jour : chaque ligne passe une fois par cycle (ordre mélangé), comme la station du pendu. */
export function arretTrip(day: string): Trip {
  const lines = PLAYABLE();
  const index = dayNumber(day) - dayNumber(ARRET_LAUNCH);
  const n = lines.length;
  const cycle = Math.floor(index / n);
  const order = shuffle(createRng(`terminus-arret-cycle-${cycle}`), lines);
  // Pas la même ligne deux jours de suite au changement de cycle.
  if (cycle > 0) {
    const prev = shuffle(createRng(`terminus-arret-cycle-${cycle - 1}`), lines);
    if (order[0] === prev[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  }
  const line = order[((index % n) + n) % n];
  return pickTrip(createRng(`terminus-arret-${day}`), line);
}

/** Trajet tiré au hasard (partie en plus), sur une autre ligne que celle du jour. */
export function arretFromSeed(seed: string, day: string): Trip {
  const rng = createRng(seed);
  const today = arretTrip(day).line;
  return pickTrip(rng, pick(rng, PLAYABLE().filter((l) => l !== today)));
}

export const tripSignature = (t: Trip) => `${t.line}:${t.stops.join(',')}`;

/** Points : 100 − 3 par seconde − 15 par erreur (5 au moins si trouvé) ; 0 si pas trouvé. Même calcul sur le serveur. */
export function arretScore(won: boolean, ms: number, errors: number): number {
  if (!won) return 0;
  return Math.max(5, 100 - Math.floor((3 * ms) / 1000) - 15 * errors);
}

/** « 8,4 s » */
export const secondsText = (ms: number) => `${(Math.floor(ms / 100) / 10).toFixed(1).replace('.', ',')} s`;

/** « 7 bis » pour l'affichage. */
export const lineLabel = (l: string) => l.replace('bis', ' bis');
