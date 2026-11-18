import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays } from './day';
import { grantCoins } from './coins';
import { loadModeStats, loadStats } from './storage';

/**
 * Série de jours joués (tous jeux confondus) et bonus de pièces associés.
 * Un jour compte dès qu'un des quatre jeux du jour est terminé (les jours passés et les parties en plus
 * ne comptent pas). Bonus : STREAK_REWARDS[7] pièces au 7e jour de suite, puis STREAK_REWARDS[30]
 * à chaque palier de 30 jours (30, 60, 90…). Ces bonus dépassent le plafond de pièces.
 */
export const STREAK_REWARDS = { 7: 5, 30: 15 } as const;

const KEY = 'terminus:play-streak';

interface Tracker {
  /** Dernier jour joué (AAAA-MM-JJ, heure de Paris). */
  last: string;
  streak: number;
  /** Bonus gagné, pas encore montré au joueur. */
  pending?: { streak: number; granted: number } | null;
}

/** Pièces gagnées en atteignant cette série (0 si ce n'est pas un palier). Fonction pure, testée. */
export function streakReward(streak: number): number {
  if (streak > 0 && streak % 30 === 0) return STREAK_REWARDS[30];
  if (streak === 7) return STREAK_REWARDS[7];
  return 0;
}

/** Prochain palier et sa récompense, pour l'afficher (« bonus dans 2 jours »). */
export function nextStreakReward(streak: number): { at: number; coins: number } {
  if (streak < 7) return { at: 7, coins: STREAK_REWARDS[7] };
  const at = (Math.floor(streak / 30) + 1) * 30;
  return { at, coins: STREAK_REWARDS[30] };
}

/** Nouvel état après un jour joué (fonction pure, testée). */
export function nextTracker(t: Tracker | null, day: string): { tracker: Tracker; reward: number } {
  if (t && t.last === day) return { tracker: t, reward: 0 };
  const streak = t && t.last === addDays(day, -1) ? t.streak + 1 : 1;
  const reward = streakReward(streak);
  return { tracker: { last: day, streak, pending: t?.pending ?? null }, reward };
}

async function read(): Promise<Tracker | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tracker) : null;
  } catch {
    return null;
  }
}

async function write(t: Tracker) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // ignoré
  }
}

/**
 * Première fois (joueurs d'avant cette version) : on reprend la meilleure série en cours des quatre jeux,
 * pour ne pas remettre à zéro une série déjà commencée.
 */
async function seed(day: string): Promise<Tracker | null> {
  const [grille, ...modes] = await Promise.all([
    loadStats(),
    loadModeStats('defi'),
    loadModeStats('pendu'),
    loadModeStats('arret'),
  ]);
  const yesterday = addDays(day, -1);
  const runs = [
    { last: grille.lastDaily, streak: grille.streak },
    ...modes.map((m) => ({ last: m.lastDay, streak: m.streak })),
  ].filter((r): r is { last: string; streak: number } => r.last === day || r.last === yesterday);
  if (!runs.length) return null;
  // Un jeu déjà fait aujourd'hui : la série inclut déjà ce jour.
  const today = runs.filter((r) => r.last === day);
  const best = (today.length ? today : runs).reduce((a, b) => (b.streak > a.streak ? b : a));
  return { last: best.last, streak: best.streak, pending: null };
}

/**
 * Un jeu du jour vient d'être terminé : met la série à jour et donne le bonus du palier atteint.
 * Renvoie le nouveau solde de pièces si un bonus a été donné.
 */
export async function recordPlayDay(day: string): Promise<{ streak: number; granted: number; coins?: number }> {
  const current = (await read()) ?? (await seed(day));
  const { tracker, reward } = nextTracker(current, day);
  if (current && tracker === current) return { streak: tracker.streak, granted: 0 };
  let coins: number | undefined;
  if (reward > 0) {
    coins = (await grantCoins(reward, day)).coins;
    tracker.pending = { streak: tracker.streak, granted: reward };
  }
  await write(tracker);
  return { streak: tracker.streak, granted: reward, coins };
}

/** Série en cours (0 si le joueur a manqué hier et n'a pas encore joué aujourd'hui). */
export async function currentPlayStreak(day: string): Promise<number> {
  const t = (await read()) ?? (await seed(day));
  if (!t) return 0;
  return t.last === day || t.last === addDays(day, -1) ? t.streak : 0;
}

/** Bonus de série gagné et pas encore vu (gardé jusqu'à la fermeture de la fenêtre). */
export async function pendingStreakBonus(): Promise<{ streak: number; granted: number } | null> {
  return (await read())?.pending ?? null;
}

/** Le joueur a vu son bonus de série : on ne le remontre plus. */
export async function clearPendingStreakBonus(): Promise<void> {
  const t = await read();
  if (t?.pending) await write({ ...t, pending: null });
}
