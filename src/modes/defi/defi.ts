import { STATIONS } from '../../data/stations';
import { USABLE_CRITERIA } from '../../game/criteria';
import { createRng, pick } from '../../game/rng';
import type { Criterion, CriterionKind } from '../../game/types';

/** Le défi du jour : deux critères qui se croisent, entre 3 et 8 stations à trouver. */
export const DEFI_MIN_ANSWERS = 3;
export const DEFI_MAX_ANSWERS = 8;
/** Erreurs permises (mauvaise station ou doublon). */
export const DEFI_MAX_ERRORS = 3;

export interface Defi {
  a: Criterion;
  b: Criterion;
  /** Identifiants des stations qui respectent les deux critères. */
  answers: string[];
}

/** Ordre d'affichage : la ligne d'abord, le reste ensuite. */
const KIND_ORDER: CriterionKind[] = ['line', 'transfer', 'place', 'near', 'name'];

export function defiAnswers(a: Criterion, b: Criterion): string[] {
  return STATIONS.filter((s) => a.test(s) && b.test(s)).map((s) => s.id);
}

let validPairs: Defi[] | null = null;

/** Toutes les paires de critères (familles différentes) qui ont entre 3 et 8 réponses. */
export function validDefis(): Defi[] {
  if (validPairs) return validPairs;
  const pairs: Defi[] = [];
  for (let i = 0; i < USABLE_CRITERIA.length; i++) {
    for (let j = i + 1; j < USABLE_CRITERIA.length; j++) {
      let [a, b] = [USABLE_CRITERIA[i], USABLE_CRITERIA[j]];
      // Comme dans la grille : jamais deux critères de la même famille (deux lignes, deux monuments…).
      if (a.kind === b.kind) continue;
      if (KIND_ORDER.indexOf(a.kind) > KIND_ORDER.indexOf(b.kind)) [a, b] = [b, a];
      const answers = defiAnswers(a, b);
      if (answers.length >= DEFI_MIN_ANSWERS && answers.length <= DEFI_MAX_ANSWERS) pairs.push({ a, b, answers });
    }
  }
  validPairs = pairs;
  return pairs;
}

export function defiSeed(day: string): string {
  return `terminus-defi-${day}`;
}

/**
 * Défi du jour, déterministe à partir de la date (même défi pour tout le monde).
 * Une fois sur deux environ, le défi porte sur une ligne précise, le cœur du jeu.
 */
export function generateDefi(day: string): Defi {
  const rng = createRng(defiSeed(day));
  const all = validDefis();
  const withLine = all.filter((d) => d.a.kind === 'line');
  const pool = rng() < 0.55 && withLine.length ? withLine : all;
  return pick(rng, pool);
}

/** Identifiant du défi (ses deux critères), pour ne pas recharger la sauvegarde d'un autre défi. */
export function defiSignature(d: Defi): string {
  return `${d.a.id}|${d.b.id}`;
}
