import type { Puzzle } from './types';

/**
 * Station en or : la ou les stations valables dans le plus de cases de la grille (4 ou 6 cases,
 * parfois les 9 critères…). Trouver une station en or ne rapporte pas de points en plus (le classement
 * reste le même pour tous), mais elle est signalée dans les résultats et compte pour un badge.
 */
export function goldStations(puzzle: Puzzle): { ids: Set<string>; cells: number } {
  const count = new Map<string, number>();
  for (const cell of puzzle.answers.flat()) for (const id of cell) count.set(id, (count.get(id) ?? 0) + 1);
  const max = Math.max(0, ...count.values());
  if (max < 3) return { ids: new Set(), cells: max };
  return { ids: new Set([...count].filter(([, n]) => n === max).map(([id]) => id)), cells: max };
}
