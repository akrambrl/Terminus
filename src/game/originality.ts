import { useEffect, useState } from 'react';
import { fetchPicks, type Picks } from '../analytics/supabase';

/** Pourcentage des joueurs du jour qui ont choisi cette station (dans cette case), ou null. */
export function pickPercent(picks: Picks | null, cell: number, id: string): number | null {
  if (!picks || picks.players <= 0) return null;
  const n = picks.picks[String(cell)]?.[id] ?? 0;
  if (n === 0) return 0;
  return Math.max(1, Math.round((100 * n) / picks.players));
}

/** « 4 % », ou « moins de 1 % » (personne, ou presque). */
export const percentText = (p: number) => (p === 0 ? 'moins de 1 %' : `${p} %`);

/**
 * Ma réponse la plus originale (la moins choisie par les autres joueurs).
 * Grille : cells (9 cases) ; défi : liste de stations (case 0).
 */
export function rarestPick(picks: Picks | null, answers: { cell: number; id: string }[]) {
  if (!picks || picks.players < 3) return null;
  let best: { id: string; percent: number } | null = null;
  for (const a of answers) {
    const p = pickPercent(picks, a.cell, a.id);
    if (p === null) continue;
    if (!best || p < best.percent) best = { id: a.id, percent: p };
  }
  return best;
}

export function gridAnswers(cells: (string | null)[][]) {
  return cells.flat().flatMap((id, cell) => (id ? [{ cell, id }] : []));
}

/** Totaux du jour, chargés quand `enabled` passe à vrai (fin de partie, fenêtre ouverte…). */
export function usePicks(day: string, game: 'grille' | 'defi', enabled: boolean): Picks | null {
  const [picks, setPicks] = useState<Picks | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // Petit délai : laisse la partie qui vient de finir être comptée.
    const t = setTimeout(() => fetchPicks(day, game).then((p) => alive && setPicks(p)), 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [day, game, enabled]);
  return picks;
}
