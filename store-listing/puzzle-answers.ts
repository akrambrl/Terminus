// Écrit la grille du jour et une solution (stations distinctes) pour le script de captures.
// Usage : npx tsx store-listing/puzzle-answers.ts AAAA-MM-JJ > fichier.json
import { STATION_BY_ID } from '../src/game/lookup';
import { dailySeed, generatePuzzle } from '../src/game/generator';

const day = process.argv[2];
const p = generatePuzzle(dailySeed(day));
const used = new Set<string>();
const cells = p.rows.map((r, i) =>
  p.cols.map((c, j) => {
    // Préfère des stations à plusieurs lignes : plus de couleurs à l'écran.
    const ids = [...p.answers[i][j]].sort(
      (a, b) => STATION_BY_ID.get(b)!.lines.length - STATION_BY_ID.get(a)!.lines.length,
    );
    const id = ids.find((x) => !used.has(x))!;
    used.add(id);
    return { row: r.label, col: c.label, name: STATION_BY_ID.get(id)!.name };
  }),
);
console.log(JSON.stringify({ day, cells }, null, 1));
