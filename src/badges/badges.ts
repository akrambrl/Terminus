import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATIONS } from '../data/stations';
import { LINES } from '../game/criteria';
import { dailySeed, generatePuzzle } from '../game/generator';
import { goldStations } from '../game/gold';
import { gridPoints } from '../game/points';
import { loadModeStats, loadStats, type SavedArret, type SavedDefi, type SavedGame, type SavedPendu } from '../game/storage';
import { arretTrip } from '../modes/arret/arret';
import type { LineId } from '../game/types';
import { generateDefi } from '../modes/defi/defi';

/**
 * Badges et collection de stations, calculés sur l'appareil à partir des parties enregistrées
 * (jeux du jour et jours passés ; les parties « en plus » ne comptent pas).
 */
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Avancement : valeur actuelle / objectif. */
  current: number;
  target: number;
  unlocked: boolean;
}

export interface LineProgress {
  line: LineId;
  found: number;
  total: number;
}

export interface BadgeReport {
  badges: Badge[];
  lines: LineProgress[];
  /** Stations différentes trouvées (toutes parties confondues). */
  collection: number;
  totalStations: number;
}

const DAY_KEY = /^terminus:(daily|defi|pendu|arret):(\d{4}-\d{2}-\d{2})$/;
const SEEN_KEY = 'terminus:badges-seen';

const goldCache = new Map<string, Set<string>>();
function goldOf(day: string) {
  let g = goldCache.get(day);
  if (!g) {
    g = goldStations(generatePuzzle(dailySeed(day))).ids;
    goldCache.set(day, g);
  }
  return g;
}

const STATIONS_BY_LINE = new Map<LineId, string[]>(
  LINES.map((l) => [l, STATIONS.filter((s) => s.lines.includes(l)).map((s) => s.id)]),
);

export async function computeBadges(): Promise<BadgeReport> {
  let keys: readonly string[] = [];
  try {
    keys = (await AsyncStorage.getAllKeys()).filter((k) => DAY_KEY.test(k));
  } catch {
    keys = [];
  }
  const entries = keys.length ? await AsyncStorage.multiGet(keys) : [];
  const [stats, defiStats, penduStats, arretStats] = await Promise.all([
    loadStats(),
    loadModeStats('defi'),
    loadModeStats('pendu'),
    loadModeStats('arret'),
  ]);

  const collection = new Set<string>();
  const finishedByDay = new Map<string, Set<string>>();
  let grids = 0;
  let perfect = 0;
  let flawless = 0;
  let bestPoints = stats.bestPoints ?? 0;
  let gold = 0;
  let defiComplete = 0;
  let penduFlawless = 0;
  let arretFirst = 0;
  let arretWon = 0;

  for (const [key, raw] of entries) {
    if (!raw) continue;
    const m = DAY_KEY.exec(key)!;
    const [, game, day] = m;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (game === 'daily') {
      const g = data as SavedGame;
      if (!g?.finished || !Array.isArray(g.cells)) continue;
      const ids = g.cells.flat().filter((id): id is string => !!id);
      ids.forEach((id) => collection.add(id));
      grids++;
      if (ids.length === 9) {
        perfect++;
        if (g.errors === 0) flawless++;
      }
      bestPoints = Math.max(bestPoints, gridPoints(g.cells));
      if (ids.length && ids.some((id) => goldOf(day).has(id))) gold++;
    } else if (game === 'defi') {
      const g = data as SavedDefi;
      if (!g?.finished || !Array.isArray(g.found)) continue;
      g.found.forEach((id) => collection.add(id));
      try {
        if (g.found.length === generateDefi(day).answers.length) defiComplete++;
      } catch {
        // défi d'un ancien format : ignoré
      }
    } else if (game === 'arret') {
      const g = data as SavedArret;
      if (!g?.finished || !Array.isArray(g.guesses)) continue;
      if (g.won) {
        arretWon++;
        if (g.guesses.length === 1) arretFirst++;
      }
      // Stations vues pendant le trajet : elles rejoignent la collection.
      try {
        arretTrip(day).stops.slice(0, g.guesses.length).forEach((id) => collection.add(id));
      } catch {
        // trajet d'un ancien format : ignoré
      }
    } else {
      const g = data as SavedPendu;
      if (!g?.finished) continue;
      if (g.won) {
        collection.add(g.station);
        if (g.errors === 0) penduFlawless++;
      }
    }
    const set = finishedByDay.get(day) ?? new Set<string>();
    set.add(game);
    finishedByDay.set(day, set);
  }

  const trio = [...finishedByDay.values()].some((s) => s.size >= 3) ? 1 : 0;
  const quatuor = [...finishedByDay.values()].some((s) => s.size >= 4) ? 1 : 0;
  const bestStreak = Math.max(stats.bestStreak, defiStats.bestStreak, penduStats.bestStreak, arretStats.bestStreak);
  const lines: LineProgress[] = LINES.map((line) => {
    const ids = STATIONS_BY_LINE.get(line) ?? [];
    return { line, found: ids.filter((id) => collection.has(id)).length, total: ids.length };
  });
  const bestLine = Math.max(0, ...lines.map((l) => (l.total ? l.found / l.total : 0)));
  const total = STATIONS.length;

  const b = (id: string, emoji: string, title: string, description: string, current: number, target: number): Badge => ({
    id,
    emoji,
    title,
    description,
    current: Math.min(current, target),
    target,
    unlocked: current >= target,
  });

  const badges: Badge[] = [
    b('first', '🎫', 'Premier ticket', 'Terminer une grille', grids, 1),
    b('trio', '🚇', 'Trio', 'Finir trois jeux le même jour', trio, 1),
    b('quatuor', '🎟️', 'Carnet complet', 'Finir les quatre jeux le même jour', quatuor, 1),
    b('perfect', '✅', 'Grille parfaite', 'Faire 9/9', perfect, 1),
    b('flawless', '💎', 'Sans faute', 'Faire 9/9 sans aucune erreur', flawless, 1),
    b('perfect10', '🏅', 'Abonné au 9/9', '10 grilles parfaites', perfect, 10),
    b('gold', '⭐', 'Station en or', 'Placer la station en or dans une grille', gold, 1),
    b('points600', '🦄', 'Explorateur', '600 points sur une grille', bestPoints, 600),
    b('points800', '🗺️', 'Grand explorateur', '800 points sur une grille', bestPoints, 800),
    b('defi', '🎯', 'Défi complet', 'Trouver toutes les stations d’un défi', defiComplete, 1),
    b('pendu', '🔤', 'Pendu sans faute', 'Trouver la station du pendu sans erreur', penduFlawless, 1),
    b('arret1', '🚦', 'Du premier coup', 'Trouver la ligne du Prochain arrêt dès la 1re station', arretFirst, 1),
    b('arret10', '🧳', 'Navigateur', 'Trouver 10 lignes au Prochain arrêt', arretWon, 10),
    b('streak7', '🔥', 'Une semaine', 'Jouer 7 jours de suite (série)', bestStreak, 7),
    b('streak30', '🚀', 'Un mois', 'Jouer 30 jours de suite (série)', bestStreak, 30),
    b('col50', '🧭', 'Voyageur', 'Trouver 50 stations différentes', collection.size, 50),
    b('col150', '🎒', 'Grand voyageur', 'Trouver 150 stations différentes', collection.size, 150),
    b('line', '🚉', 'Ligne complète', 'Trouver toutes les stations d’une ligne', Math.floor(bestLine * 100), 100),
    b('all', '👑', 'Tout le réseau', `Trouver les ${total} stations`, collection.size, total),
  ];
  return { badges, lines, collection: collection.size, totalStations: total };
}

/** Badges débloqués depuis la dernière fois (et les note comme vus). */
export async function takeNewBadges(): Promise<Badge[]> {
  const report = await computeBadges();
  let seen: string[] = [];
  try {
    seen = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '[]') as string[];
  } catch {
    seen = [];
  }
  const unlocked = report.badges.filter((x) => x.unlocked);
  const fresh = unlocked.filter((x) => !seen.includes(x.id));
  if (fresh.length) {
    try {
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(unlocked.map((x) => x.id)));
    } catch {
      // rien
    }
  }
  return fresh;
}
