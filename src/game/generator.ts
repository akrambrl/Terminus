import { dayNumber, parisDayKey } from './day';
import { STATIONS } from '../data/stations';
import { USABLE_CRITERIA } from './criteria';
import { createRng, pick, shuffle } from './rng';
import { GOLD_STATIONS } from '../data/gold';
import type { Criterion, CriterionKind, Puzzle } from './types';

/** Nombre minimum de réponses possibles par case : au moins 4 pour rester facile. */
const MIN_ANSWERS = 4;

/** Poids de chaque famille de critères : les lignes doivent dominer. */
const KIND_WEIGHTS: [CriterionKind, number][] = [
  ['line', 4],
  ['near', 3],
  ['place', 2],
  ['name', 2],
  ['transfer', 1],
];

/** Nombre maximum de critères de chaque famille dans une grille. */
const KIND_MAX: Record<CriterionKind, number> = {
  line: 3,
  near: 2,
  place: 1,
  name: 2,
  transfer: 1,
};

function pickKind(rng: () => number): CriterionKind {
  const total = KIND_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [kind, w] of KIND_WEIGHTS) {
    if ((r -= w) < 0) return kind;
  }
  return 'line';
}

/**
 * Deux critères ne se croisent que s'ils sont de familles différentes.
 * En particulier, jamais deux lignes l'une contre l'autre : trop peu de stations y répondent.
 */
function compatible(a: Criterion, b: Criterion): boolean {
  return a.kind !== b.kind;
}

/** Stations de chaque critère (pour repérer deux critères presque identiques). */
const MEMBERS = new Map<string, Set<string>>();
function members(c: Criterion): Set<string> {
  let set = MEMBERS.get(c.id);
  if (!set) {
    set = new Set(STATIONS.filter((s) => c.test(s)).map((s) => s.id));
    MEMBERS.set(c.id, set);
  }
  return set;
}

/**
 * Sur un même axe, deux critères ne doivent pas se recouvrir presque entièrement
 * (« Ligne 7 » et « Ligne 7 ou 7 bis », « Ligne 14 » et « Ligne automatique ») : la grille serait répétitive.
 */
function distinctAxis(axis: Criterion[]): boolean {
  for (let i = 0; i < axis.length; i++) {
    for (let j = i + 1; j < axis.length; j++) {
      const a = members(axis[i]);
      const b = members(axis[j]);
      let common = 0;
      for (const id of a) if (b.has(id)) common++;
      if (common / Math.min(a.size, b.size) > 0.6) return false;
    }
  }
  return true;
}

/** Vérifie qu'on peut remplir la grille avec 9 stations différentes (couplage biparti). */
function hasDistinctSolution(answers: string[][][]): boolean {
  const cells = answers.flat();
  const owner = new Map<string, number>();
  const tryCell = (cell: number, seen: Set<string>): boolean => {
    for (const id of cells[cell]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const current = owner.get(id);
      if (current === undefined || tryCell(current, seen)) {
        owner.set(id, cell);
        return true;
      }
    }
    return false;
  };
  return cells.every((_, i) => tryCell(i, new Set()));
}

function drawCriterion(
  rng: () => number,
  taken: Criterion[],
  excludedKinds: Set<CriterionKind>,
  pool: Criterion[] = USABLE_CRITERIA,
): Criterion | null {
  let kind = pickKind(rng);
  for (let i = 0; i < 20 && excludedKinds.has(kind); i++) kind = pickKind(rng);
  if (excludedKinds.has(kind)) return null;
  const options = pool.filter(
    (c) => c.kind === kind && !taken.some((t) => t.id === c.id),
  );
  return options.length ? pick(rng, options) : null;
}

/** Tire les 3 critères d'un axe, en évitant les familles déjà présentes sur l'autre axe. */
function drawAxis(
  rng: () => number,
  taken: Criterion[],
  excludedKinds: Set<CriterionKind>,
  pool: Criterion[] = USABLE_CRITERIA,
): Criterion[] {
  const axis: Criterion[] = [];
  for (let guard = 0; axis.length < 3 && guard < 50; guard++) {
    const c = drawCriterion(rng, [...taken, ...axis], excludedKinds, pool);
    // Un seul critère de proximité par axe : deux monuments voisins donneraient les mêmes réponses.
    if (c && !(c.kind === 'near' && axis.some((a) => a.kind === 'near'))) axis.push(c);
  }
  return axis;
}

/**
 * Grilles du jour à partir de cette date : construites autour d'une « station en or » qui remplit
 * les 6 critères (elle marche donc dans les 9 cases). Les grilles d'avant ne changent pas.
 */
export const GOLD_START = '2026-11-16';
const DAILY_SEED = /^terminus-paris-(\d{4}-\d{2}-\d{2})$/;

/** Grille construite autour de critères tirés dans `pool` (tous, ou ceux que remplit la station en or). */
function buildGrid(rng: () => number, pool: Criterion[], golden: boolean, attempts: number) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const first = drawAxis(rng, [], new Set(), pool);
    const second = drawAxis(rng, first, new Set(first.map((c) => c.kind)), pool);
    if (first.length < 3 || second.length < 3) continue;
    // L'axe des lignes est tantôt en haut, tantôt à gauche.
    const [rows, cols] = rng() < 0.5 ? [first, second] : [second, first];
    const chosen = [...rows, ...cols];

    // Au moins une ligne, et pas trop de critères d'une même famille.
    const count = (k: CriterionKind) => chosen.filter((c) => c.kind === k).length;
    if (count('line') < 1) continue;
    if (KIND_WEIGHTS.some(([k]) => count(k) > KIND_MAX[k])) continue;
    if (chosen.filter((c) => c.id.startsWith('letter-')).length > 1) continue;
    if (chosen.filter((c) => c.id.startsWith('contains-')).length > 1) continue;
    if (!rows.every((r) => cols.every((c) => compatible(r, c)))) continue;
    // Grilles en or : critères bien différents sur chaque axe.
    if (golden && (!distinctAxis(rows) || !distinctAxis(cols))) continue;

    const answers = rows.map((r) =>
      cols.map((c) => STATIONS.filter((s) => r.test(s) && c.test(s)).map((s) => s.id)),
    );
    if (answers.flat().some((cell) => cell.length < MIN_ANSWERS)) continue;
    if (!hasDistinctSolution(answers)) continue;
    return { rows, cols, answers };
  }
  return null;
}

/** Une grille en or est-elle possible autour de cette station ? (sert à établir GOLD_STATIONS) */
export function canBeGold(stationId: string, seed: string, attempts = 600): boolean {
  const gold = STATIONS.find((s) => s.id === stationId);
  if (!gold) return false;
  const pool = USABLE_CRITERIA.filter((c) => c.test(gold));
  return pool.length >= 6 && !!buildGrid(createRng(seed), pool, true, attempts);
}

/**
 * Station en or du jour : chaque station possible passe une fois par cycle (ordre mélangé à chaque
 * cycle), comme la station du Pendu, pour ne pas revoir la même à quelques jours d'écart.
 */
export function goldCandidate(day: string, offset = 0): string {
  const index = dayNumber(day) - dayNumber(GOLD_START) + offset;
  const n = GOLD_STATIONS.length;
  const cycle = Math.floor(index / n);
  return shuffle(createRng(`terminus-or-${cycle}`), [...GOLD_STATIONS])[((index % n) + n) % n];
}

export function generatePuzzle(seed: string): Puzzle {
  const day = DAILY_SEED.exec(seed)?.[1];
  const rng = createRng(seed);
  let grid: ReturnType<typeof buildGrid> = null;
  if (day && day >= GOLD_START) {
    // Station en or : choisie d'abord, puis les 6 critères parmi ceux qu'elle remplit.
    for (let k = 0; !grid && k < 20; k++) {
      const gold = STATIONS.find((s) => s.id === goldCandidate(day, k * 37));
      if (!gold) continue;
      grid = buildGrid(rng, USABLE_CRITERIA.filter((c) => c.test(gold)), true, 800);
    }
  }
  grid ??= buildGrid(rng, USABLE_CRITERIA, false, 5000);
  if (!grid) throw new Error(`Impossible de générer une grille pour la graine ${seed}`);
  const { rows, cols, answers } = grid;
  const [r2, c2] = [shuffle(rng, [0, 1, 2]), shuffle(rng, [0, 1, 2])];
  return {
    seed,
    rows: r2.map((i) => rows[i]),
    cols: c2.map((j) => cols[j]),
    answers: r2.map((i) => c2.map((j) => answers[i][j])),
  };
}

/** Identifiant de la grille (ses critères), pour ne pas recharger une sauvegarde d'une autre grille. */
export function puzzleSignature(p: Puzzle): string {
  return [...p.rows, ...p.cols].map((c) => c.id).join('|');
}

/** Date du jour à Paris (AAAA-MM-JJ) : voir day.ts. */
export const todayKey = parisDayKey;

/** Numéro de la grille du jour (n° 1 le 8 novembre 2026). */
export const dailyNumber = dayNumber;

export function dailySeed(key: string): string {
  return `terminus-paris-${key}`;
}
