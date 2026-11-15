// Liste des stations autour desquelles une grille en or (6 critères remplis) est possible.
// Usage : npx tsx scripts/build-gold.ts  (réécrit src/data/gold.ts)
import { writeFileSync } from 'node:fs';
import { STATIONS } from '../src/data/stations';
import { canBeGold } from '../src/game/generator';

const ok = STATIONS.filter((s) => [0, 1, 2].some((k) => canBeGold(s.id, `or-test-${s.id}-${k}`, 1000))).map((s) => s.id);
writeFileSync(
  new URL('../src/data/gold.ts', import.meta.url),
  `// Généré par scripts/build-gold.ts : stations possibles comme « station en or » (${ok.length} sur ${STATIONS.length}).\nexport const GOLD_STATIONS: string[] = ${JSON.stringify(ok, null, 2)};\n`,
);
console.log(`${ok.length} stations en or possibles sur ${STATIONS.length}`);
