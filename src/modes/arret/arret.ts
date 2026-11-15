import { LINE_GRAPH } from '../../data/lineGraph';
import { STATIONS } from '../../data/stations';
import { dayNumber } from '../../game/day';
import { createRng, pick, shuffle } from '../../game/rng';
import type { LineId } from '../../game/types';

/**
 * « Prochain arrêt » : la rame s'arrête station après station ; le joueur devine la ligne.
 * Une proposition par station ; trouvé à la 1re station = 5 points, à la 5e = 1 point.
 */
export const ARRET_STOPS = 5;
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

/** Points : 5 si trouvé à la 1re station, … 1 à la 5e ; 0 si pas trouvé. */
export const arretPoints = (won: boolean, stations: number) => (won ? ARRET_STOPS + 1 - stations : 0);

/** « 7 bis » pour l'affichage. */
export const lineLabel = (l: string) => l.replace('bis', ' bis');
