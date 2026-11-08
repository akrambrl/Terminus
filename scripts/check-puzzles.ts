// Vérifie que les grilles des 730 prochains jours (2 ans) se génèrent correctement.
// Usage : npx tsx scripts/check-puzzles.ts
import { STATIONS } from '../src/data/stations';
import { ALL_CRITERIA, USABLE_CRITERIA } from '../src/game/criteria';
import { dailySeed, generatePuzzle, todayKey } from '../src/game/generator';

console.log(`${STATIONS.length} stations, ${USABLE_CRITERIA.length}/${ALL_CRITERIA.length} critères utilisables`);
for (const c of ALL_CRITERIA) {
  const n = STATIONS.filter(c.test).length;
  if (n < 6) console.log(`  écarté : ${c.label} (${n})`);
}
const usage = new Map<string, number>();
const start = new Date(2026, 10, 8);
for (let i = 0; i < 730; i++) {
  const d = new Date(start);
  d.setDate(start.getDate() + i);
  const p = generatePuzzle(dailySeed(todayKey(d)));
  for (const c of [...p.rows, ...p.cols]) usage.set(c.kind, (usage.get(c.kind) ?? 0) + 1);
  if (i < 3) {
    console.log(`\n${todayKey(d)}  colonnes : ${p.cols.map((c) => c.label).join(' | ')}`);
    p.rows.forEach((r, ri) =>
      console.log(`  ${r.label.padEnd(22)} ${p.answers[ri].map((a) => String(a.length).padStart(4)).join('')}`),
    );
  }
}
console.log('\n730 grilles OK. Répartition des critères :', Object.fromEntries(usage));
