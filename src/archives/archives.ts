import { addDays, dayNumber } from '../game/day';
import { loadDaily, loadDefi, loadPendu } from '../game/storage';
import { generateDefi } from '../modes/defi/defi';

export type ArchiveGame = 'grille' | 'defi' | 'pendu';

/** Premier jour de chaque jeu (la grille est sortie avant le défi et le pendu). */
export const GAME_LAUNCH: Record<ArchiveGame, string> = {
  grille: '2026-11-08',
  defi: '2026-11-12',
  pendu: '2026-11-12',
};

/** Prix d'une partie d'un jour passé (en pièces) ; une partie commencée se reprend gratuitement. */
export const ARCHIVE_COST = 1;

export interface ArchiveDay {
  day: string;
  number: number;
  /** none : jamais ouvert (payant) ; started : commencé ; done : terminé. */
  state: 'none' | 'started' | 'done';
  /** « 7/9 », « 5/6 », « Trouvé », « Raté ». */
  result?: string;
  success?: boolean;
}

/** Jours passés d'un jeu, du plus récent au plus ancien (aujourd'hui exclu). */
export function archiveDays(game: ArchiveGame, today: string): string[] {
  const days: string[] = [];
  for (let d = addDays(today, -1); d >= GAME_LAUNCH[game]; d = addDays(d, -1)) days.push(d);
  return days;
}

export async function archiveState(game: ArchiveGame, day: string): Promise<ArchiveDay> {
  const base = { day, number: dayNumber(day) };
  if (game === 'grille') {
    const g = await loadDaily(day);
    if (!g) return { ...base, state: 'none' };
    const found = g.cells.flat().filter(Boolean).length;
    return g.finished ? { ...base, state: 'done', result: `${found}/9`, success: found === 9 } : { ...base, state: 'started' };
  }
  if (game === 'defi') {
    const g = await loadDefi(day);
    if (!g) return { ...base, state: 'none' };
    const total = generateDefi(day).answers.length;
    return g.finished
      ? { ...base, state: 'done', result: `${g.found.length}/${total}`, success: g.found.length === total }
      : { ...base, state: 'started' };
  }
  const g = await loadPendu(day);
  if (!g) return { ...base, state: 'none' };
  return g.finished ? { ...base, state: 'done', result: g.won ? 'Trouvé' : 'Raté', success: g.won } : { ...base, state: 'started' };
}
