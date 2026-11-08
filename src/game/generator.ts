import { STATIONS } from '../data/stations';
import { USABLE_CRITERIA } from './criteria';
import { createRng, pick, shuffle } from './rng';
import type { Criterion, CriterionKind, Puzzle } from './types';

const MIN_ANSWERS = 2;

/** Poids de chaque famille de critères : les lignes doivent dominer. */
const KIND_WEIGHTS: [CriterionKind, number][] = [
  ['line', 5],
  ['near', 3],
  ['place', 2],
  ['name', 2],
  ['transfer', 1],
];

/** Nombre maximum de critères de chaque famille dans une grille. */
const KIND_MAX: Record<CriterionKind, number> = {
  line: 6,
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

/** Deux critères peuvent se croiser s'ils ne sont pas de la même famille (sauf deux lignes). */
function compatible(a: Criterion, b: Criterion): boolean {
  if (a.id === b.id) return false;
  if (a.kind === b.kind && a.kind !== 'line') return false;
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

function drawCriterion(rng: () => number, taken: Criterion[]): Criterion | null {
  const kind = pickKind(rng);
  const options = USABLE_CRITERIA.filter(
    (c) => c.kind === kind && !taken.some((t) => t.id === c.id),
  );
  return options.length ? pick(rng, options) : null;
}

export function generatePuzzle(seed: string): Puzzle {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const chosen: Criterion[] = [];
    while (chosen.length < 6) {
      const c = drawCriterion(rng, chosen);
      if (c) chosen.push(c);
    }
    const [rows, cols] = [chosen.slice(0, 3), chosen.slice(3)];
    // Au moins deux lignes, et pas trop de critères d'une même famille.
    const count = (k: CriterionKind) => chosen.filter((c) => c.kind === k).length;
    if (count('line') < 2) continue;
    if (KIND_WEIGHTS.some(([k]) => count(k) > KIND_MAX[k])) continue;
    if (chosen.filter((c) => c.id.startsWith('letter-')).length > 1) continue;
    if (!rows.every((r) => cols.every((c) => compatible(r, c)))) continue;

    const answers = rows.map((r) =>
      cols.map((c) => STATIONS.filter((s) => r.test(s) && c.test(s)).map((s) => s.id)),
    );
    if (answers.flat().some((cell) => cell.length < MIN_ANSWERS)) continue;
    if (!hasDistinctSolution(answers)) continue;

    const [r2, c2] = [shuffle(rng, [0, 1, 2]), shuffle(rng, [0, 1, 2])];
    return {
      seed,
      rows: r2.map((i) => rows[i]),
      cols: c2.map((j) => cols[j]),
      answers: r2.map((i) => c2.map((j) => answers[i][j])),
    };
  }
  throw new Error(`Impossible de générer une grille pour la graine ${seed}`);
}

/** Identifiant de la grille (ses critères), pour ne pas recharger une sauvegarde d'une autre grille. */
export function puzzleSignature(p: Puzzle): string {
  return [...p.rows, ...p.cols].map((c) => c.id).join('|');
}

/** Date locale au format AAAA-MM-JJ. */
export function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const LAUNCH = Date.UTC(2026, 10, 8);

/** Numéro de la grille du jour (n° 1 le 8 novembre 2026). */
export function dailyNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - LAUNCH) / 86400000) + 1;
}

export function dailySeed(key: string): string {
  return `terminus-paris-${key}`;
}
