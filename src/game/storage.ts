import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedGame {
  /** Signature de la grille jouée (voir puzzleSignature). */
  puzzle?: string;
  /** cells[r][c] = identifiant de la station trouvée, ou null. */
  cells: (string | null)[][];
  /** Erreurs commises (la partie s'arrête à MAX_ERRORS, plus 3 par lot de tickets racheté). */
  errors: number;
  finished: boolean;
  /** Lots de 3 tickets rachetés avec des pièces. */
  bought?: number;
}

export interface Stats {
  played: number;
  perfect: number;
  totalFound: number;
  /** Meilleur total de points sur une grille du jour (stations rares = plus de points). */
  bestPoints?: number;
  streak: number;
  bestStreak: number;
  lastDaily: string | null;
}

export const EMPTY_STATS: Stats = {
  played: 0,
  perfect: 0,
  totalFound: 0,
  streak: 0,
  bestStreak: 0,
  lastDaily: null,
};

const gameKey = (day: string) => `terminus:daily:${day}`;
const STATS_KEY = 'terminus:stats';
const SEEN_HELP_KEY = 'terminus:seen-help';

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Le jeu reste jouable sans sauvegarde.
  }
}

export const loadDaily = (day: string) => readJson<SavedGame>(gameKey(day));
export const saveDaily = (day: string, game: SavedGame) => writeJson(gameKey(day), game);
export const loadStats = async () => (await readJson<Stats>(STATS_KEY)) ?? EMPTY_STATS;

/** Enregistre une grille du jour terminée et met à jour la série. */
export async function recordDaily(day: string, found: number, yesterday: string, points = 0): Promise<Stats> {
  const stats = await loadStats();
  if (stats.lastDaily === day) return stats;
  const streak = stats.lastDaily === yesterday ? stats.streak + 1 : 1;
  const next: Stats = {
    played: stats.played + 1,
    perfect: stats.perfect + (found === 9 ? 1 : 0),
    totalFound: stats.totalFound + found,
    bestPoints: Math.max(stats.bestPoints ?? 0, points),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastDaily: day,
  };
  await writeJson(STATS_KEY, next);
  return next;
}

export async function hasSeenHelp(): Promise<boolean> {
  return (await readJson<boolean>(SEEN_HELP_KEY)) === true;
}
export const markHelpSeen = () => writeJson(SEEN_HELP_KEY, true);

/** Grille en plus (payée en pièces), gardée pour pouvoir la reprendre sans repayer. */
export interface SavedFreeGame {
  seed: string;
  cells: (string | null)[][];
  errors: number;
  finished: boolean;
  bought?: number;
}

const FREE_KEY = 'terminus:free-game';
export const loadFreeGame = () => readJson<SavedFreeGame>(FREE_KEY);
export const saveFreeGame = (game: SavedFreeGame) => writeJson(FREE_KEY, game);

/* ---------- Le Défi et le Pendu : une partie par jour, des stats séparées ---------- */

export type DailyMode = 'defi' | 'pendu';

export interface ModeStats {
  played: number;
  /** Défi : toutes les réponses trouvées. Pendu : station trouvée. */
  complete: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
}

export const EMPTY_MODE_STATS: ModeStats = { played: 0, complete: 0, streak: 0, bestStreak: 0, lastDay: null };

export interface SavedDefi {
  /** Signature du défi joué (ses deux critères). */
  defi: string;
  found: string[];
  errors: number;
  finished: boolean;
  gaveUp: boolean;
}

export interface SavedPendu {
  station: string;
  /** Lettres proposées (de base, en majuscules). */
  letters: string[];
  /** Noms complets proposés à tort. */
  wrongNames: string[];
  errors: number;
  finished: boolean;
  won: boolean;
}

const modeGameKey = (mode: DailyMode, day: string) => `terminus:${mode}:${day}`;
const modeStatsKey = (mode: DailyMode) => `terminus:${mode}-stats`;

export const loadDefi = (day: string) => readJson<SavedDefi>(modeGameKey('defi', day));
export const saveDefi = (day: string, game: SavedDefi) => writeJson(modeGameKey('defi', day), game);
export const loadPendu = (day: string) => readJson<SavedPendu>(modeGameKey('pendu', day));
export const savePendu = (day: string, game: SavedPendu) => writeJson(modeGameKey('pendu', day), game);

export const loadModeStats = async (mode: DailyMode) =>
  (await readJson<ModeStats>(modeStatsKey(mode))) ?? EMPTY_MODE_STATS;

/** Calcule les stats après une partie du jour terminée (fonction pure, testable). */
export function nextModeStats(stats: ModeStats, day: string, yesterday: string, complete: boolean): ModeStats {
  if (stats.lastDay === day) return stats;
  const streak = stats.lastDay === yesterday ? stats.streak + 1 : 1;
  return {
    played: stats.played + 1,
    complete: stats.complete + (complete ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastDay: day,
  };
}

/** Enregistre une partie du jour terminée (Défi ou Pendu) et met à jour la série. */
export async function recordMode(mode: DailyMode, day: string, yesterday: string, complete: boolean): Promise<ModeStats> {
  const next = nextModeStats(await loadModeStats(mode), day, yesterday, complete);
  await writeJson(modeStatsKey(mode), next);
  return next;
}
