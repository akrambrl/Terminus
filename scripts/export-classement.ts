// Exporte les réponses du jour (Grille, Défi, Pendu) et les points des stations pour la base du classement.
// Le serveur s'en sert pour recalculer chaque score (supabase/terminus-classement.sql, fonction tp_submit).
// Usage : npx tsx scripts/export-classement.ts 2026-11-01 800 > classement-data.json
import { STATIONS } from '../src/data/stations';
import { addDays } from '../src/game/day';
import { dailySeed, generatePuzzle } from '../src/game/generator';
import { stationPoints } from '../src/game/points';
import { generateDefi } from '../src/modes/defi/defi';
import { penduStation } from '../src/modes/pendu/pendu';

const start = process.argv[2] ?? '2026-11-01';
const days = Number(process.argv[3] ?? 800);
const daily: { day: string; game: string; data: unknown }[] = [];
for (let i = 0; i < days; i++) {
  const day = addDays(start, i);
  const p = generatePuzzle(dailySeed(day));
  daily.push({ day, game: 'grille', data: { cells: p.answers.flat() } });
  daily.push({ day, game: 'defi', data: { answers: generateDefi(day).answers } });
  daily.push({ day, game: 'pendu', data: { station: penduStation(day).id } });
}
const points = STATIONS.map((s) => ({ id: s.id, points: stationPoints(s.id) }));
process.stdout.write(JSON.stringify({ points, daily }));
