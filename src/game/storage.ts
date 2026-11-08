import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedGame {
  /** cells[r][c] = identifiant de la station trouvée, ou null. */
  cells: (string | null)[][];
  guessesLeft: number;
  finished: boolean;
}

export interface Stats {
  played: number;
  perfect: number;
  totalFound: number;
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
export async function recordDaily(day: string, found: number, yesterday: string): Promise<Stats> {
  const stats = await loadStats();
  if (stats.lastDaily === day) return stats;
  const streak = stats.lastDaily === yesterday ? stats.streak + 1 : 1;
  const next: Stats = {
    played: stats.played + 1,
    perfect: stats.perfect + (found === 9 ? 1 : 0),
    totalFound: stats.totalFound + found,
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
