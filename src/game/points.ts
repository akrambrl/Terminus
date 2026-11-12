import { STATION_POINTS } from '../data/frequentation';

/**
 * Points d'une bonne réponse dans la grille : plus la station est peu fréquentée, plus elle rapporte
 * (Châtelet ou Saint-Lazare : 10 points ; Pelleport ou Église d'Auteuil : 100 points).
 * Fréquentation réelle : Île-de-France Mobilités (voir scripts/build-frequentation.py).
 */
export const DEFAULT_POINTS = 50;

export function stationPoints(id: string): number {
  return STATION_POINTS[id] ?? DEFAULT_POINTS;
}

/** Total des points d'une grille (cases trouvées). */
export function gridPoints(cells: (string | null)[][]): number {
  return cells.flat().reduce((sum, id) => sum + (id ? stationPoints(id) : 0), 0);
}

/**
 * Meilleur total possible pour une grille : 9 stations distinctes qui rapportent le plus
 * (affectation optimale, par recherche exhaustive sur les meilleures réponses de chaque case).
 */
export function bestGridPoints(answers: string[][][]): number {
  const cells = answers.flat().map((ids) => [...ids].sort((a, b) => stationPoints(b) - stationPoints(a)).slice(0, 12));
  let best = 0;
  const used = new Set<string>();
  const rest = cells.map((_, i) => cells.slice(i).reduce((s, c) => s + (c.length ? stationPoints(c[0]) : 0), 0));
  const go = (i: number, sum: number) => {
    if (i === cells.length) {
      best = Math.max(best, sum);
      return;
    }
    if (sum + rest[i] <= best) return;
    for (const id of cells[i]) {
      if (used.has(id)) continue;
      used.add(id);
      go(i + 1, sum + stationPoints(id));
      used.delete(id);
    }
  };
  go(0, 0);
  return best;
}
