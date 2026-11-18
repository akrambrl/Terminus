import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { readAcquisition } from './acquisition';
import type { GameEvent, Props } from './index';

/**
 * Envoi des statistiques vers la base Supabase (projet partagé avec GOAT FC, tables tp_*).
 * Voir supabase/terminus-stats.sql : la clé publique ne permet que d'écrire, jamais de lire.
 *
 * Mesure d'audience exemptée de consentement (CNIL) : identifiant d'appareil aléatoire renouvelé
 * tous les 13 mois, aucune donnée personnelle, statistiques réservées à l'éditeur ; le joueur peut
 * s'y opposer (« Ne pas compter mes visites », dans l'aide).
 */
export const SUPABASE_URL = 'https://ialjlsrgcolocoaegzrc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGpsc3JnY29sb2NvYWVnenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDM3NzksImV4cCI6MjA5MTA3OTc3OX0.-SU8anuPhnpoa-PYhIHQqrcuOBsHxdtBJKRZuiGcGwM';

const DEVICE_KEY = 'terminus:device';
const OPT_OUT_KEY = 'terminus:no-stats';
const DEVICE_MAX_AGE = 395 * 86400000; // 13 mois

/** Événements enregistrés (les réponses une à une ne le sont pas : trop nombreuses). */
const KEPT = new Set<GameEvent>([
  'app_opened',
  'game_started',
  'game_finished',
  'result_shared',
  'mode_selected',
  'free_game_started',
  'ad_reward_earned',
  'store_link_clicked',
  'leaderboard_opened',
  'tickets_bought',
  'archive_started',
  'badges_opened',
  'hint_bought',
  'streak_bonus',
]);

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

/** Support du joueur : app iPhone, app Android, site sur téléphone ou sur ordinateur. */
export function platformLabel(): string {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  try {
    const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? '';
    return /Mobi|Android|iPhone|iPad/i.test(ua) ? 'web-mobile' : 'web-desktop';
  } catch {
    return 'web';
  }
}

function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

let device: string | null = null;
let optedOut = false;

async function ensureDevice(): Promise<string | null> {
  if (device) return device;
  try {
    optedOut = (await AsyncStorage.getItem(OPT_OUT_KEY)) === '1';
    const raw = await AsyncStorage.getItem(DEVICE_KEY);
    const saved = raw ? (JSON.parse(raw) as { id: string; since: number }) : null;
    if (saved && Date.now() - saved.since < DEVICE_MAX_AGE) device = saved.id;
    else {
      device = randomId();
      await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify({ id: device, since: Date.now() }));
    }
  } catch {
    device = device ?? randomId();
  }
  return device;
}

/** Le joueur refuse d'être compté (ou l'accepte de nouveau). */
export async function setStatsOptOut(out: boolean): Promise<void> {
  optedOut = out;
  try {
    if (out) await AsyncStorage.setItem(OPT_OUT_KEY, '1');
    else await AsyncStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // ignoré
  }
}

export async function getStatsOptOut(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPT_OUT_KEY)) === '1';
  } catch {
    return false;
  }
}

let currentGame = 'grille';

/** Envoie un événement (sans jamais bloquer ni faire planter le jeu). */
export function sendEvent(event: GameEvent, properties?: Props): void {
  if (typeof properties?.game === 'string') currentGame = properties.game;
  if (!KEPT.has(event)) return;
  ensureDevice().then((id) => {
    if (!id || optedOut) return;
    const acq = readAcquisition();
    const { game, ...rest } = properties ?? {};
    fetch(`${SUPABASE_URL}/rest/v1/tp_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        device: id,
        event,
        game: typeof game === 'string' ? game : null,
        platform: platformLabel(),
        source: acq?.source || null,
        campaign: acq?.campaign || null,
        props: Object.keys(rest).length ? rest : null,
      }),
    }).catch(() => {});
  });
}

/** « Je suis en ligne » : toutes les minutes tant que le jeu est affiché. */
export function startPresence(): () => void {
  const ping = () =>
    ensureDevice().then((id) => {
      if (!id || optedOut || AppState.currentState !== 'active') return;
      fetch(`${SUPABASE_URL}/rest/v1/rpc/tp_ping`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_device: id, p_platform: platformLabel(), p_game: currentGame }),
      }).catch(() => {});
    });
  ping();
  const timer = setInterval(ping, 60000);
  const sub = AppState.addEventListener('change', (s) => s === 'active' && ping());
  return () => {
    clearInterval(timer);
    sub.remove();
  };
}

/** Chiffres du tableau de bord privé (le code est vérifié par le serveur). */
export async function fetchStats(code: string, days: number): Promise<StatsData> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tp_stats`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ p_code: code, p_days: days }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('forbidden');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.includes('forbidden') ? 'forbidden' : `HTTP ${res.status}`);
  }
  return (await res.json()) as StatsData;
}

export interface StatsData {
  generated_at: string;
  days: number;
  online: { total: number; by_game: Record<string, number>; by_platform: Record<string, number> };
  totals: { visits: number; visitors: number; new_visitors: number; games_started: number; games_finished: number; shares: number };
  per_day: { day: string; visits: number; visitors: number; new_visitors: number; games_finished: number; shares: number }[];
  per_game: { game: string; started: number; finished: number; players: number; shares: number }[];
  sources: { source: string; campaign: string; visitors: number; visits: number }[];
  platforms: { platform: string; visitors: number }[];
}

/* ---------- Classement (supabase/terminus-classement.sql) ---------- */

export type RankedGame = 'grille' | 'defi' | 'pendu' | 'arret';
export type RankPeriod = 'day' | 'week';

export interface RankRow {
  rank: number;
  pseudo: string | null;
  score: number;
  found: number;
  errors: number;
  games: number;
  me?: boolean;
}

export interface Leaderboard {
  game: RankedGame;
  period: RankPeriod;
  day: string;
  players: number;
  top: RankRow[];
  me: RankRow | null;
  pseudo: string | null;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Identifiant aléatoire de l'appareil (le même que pour les statistiques). */
export const getDeviceId = ensureDevice;

const PSEUDO_KEY = 'terminus:pseudo';

export async function getLocalPseudo(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PSEUDO_KEY);
  } catch {
    return null;
  }
}

/* Pseudo automatique : sans lui, presque tout le classement s'affichait « Joueur anonyme ».
   Après la première partie classée, le joueur reçoit un pseudo tiré au hasard (« Renard Futé »),
   qu'il peut changer ou supprimer dans le classement. Une seule fois par appareil. */
const AUTO_KEY = 'terminus:pseudo-auto';
const ANIMALS = ['Renard', 'Hibou', 'Pigeon', 'Chat', 'Lapin', 'Panda', 'Loup', 'Moineau', 'Castor', 'Koala',
  'Hérisson', 'Blaireau', 'Corbeau', 'Lynx', 'Faucon', 'Ours', 'Tigre', 'Raton', 'Écureuil', 'Pingouin'];
const ADJECTIVES = ['Futé', 'Rapide', 'Malin', 'Curieux', 'Pressé', 'Rêveur', 'Matinal', 'Joyeux', 'Discret',
  'Express', 'Agile', 'Zen', 'Têtu', 'Perdu', 'Pétillant', 'Noctambule', 'Gourmand', 'Flâneur', 'Intrépide', 'Ponctuel'];

/** Pseudo au hasard de 16 caractères au plus (format accepté par tp_pseudo_ok), avec un numéro si besoin. */
export function randomPseudo(withNumber = false): string {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  for (;;) {
    const base = `${pick(ANIMALS)} ${pick(ADJECTIVES)}`;
    const name = withNumber ? `${base} ${10 + Math.floor(Math.random() * 90)}` : base;
    if (name.length <= 16) return name;
  }
}

/** Ce pseudo a-t-il été donné automatiquement (et jamais changé) ? */
export async function isAutoPseudo(): Promise<boolean> {
  try {
    const [auto, pseudo] = await Promise.all([AsyncStorage.getItem(AUTO_KEY), AsyncStorage.getItem(PSEUDO_KEY)]);
    return !!pseudo && auto === pseudo;
  } catch {
    return false;
  }
}

async function autoPseudo(): Promise<void> {
  if (optedOut) return;
  if ((await getLocalPseudo()) || (await AsyncStorage.getItem(AUTO_KEY))) return;
  for (let i = 0; i < 4; i++) {
    const name = randomPseudo(i > 0);
    const r = await setPseudo(name);
    if (r === 'ok') {
      await AsyncStorage.setItem(AUTO_KEY, name);
      return;
    }
    if (r === 'error') return; // hors ligne : on réessaiera à la prochaine partie
  }
  await AsyncStorage.setItem(AUTO_KEY, 'off');
}

/** Choisit le pseudo du classement. Renvoie 'ok', 'invalid' (format ou mot interdit), 'taken' ou 'error'. */
export async function setPseudo(pseudo: string): Promise<'ok' | 'invalid' | 'taken' | 'error'> {
  const device = await ensureDevice();
  if (!device) return 'error';
  try {
    const r = await rpc<string>('tp_set_pseudo', { p_device: device, p_pseudo: pseudo });
    if (r === 'ok') await AsyncStorage.setItem(PSEUDO_KEY, pseudo.trim().replace(/\s+/g, ' '));
    return r === 'ok' || r === 'invalid' || r === 'taken' ? r : 'error';
  } catch {
    return 'error';
  }
}

/** Retire le joueur du classement (pseudo et scores supprimés). */
export async function deletePlayer(): Promise<boolean> {
  const device = await ensureDevice();
  if (!device) return false;
  try {
    await rpc('tp_delete_player', { p_device: device });
    await AsyncStorage.removeItem(PSEUDO_KEY);
    await AsyncStorage.setItem(AUTO_KEY, 'off'); // ne plus lui donner de pseudo automatique
    return true;
  } catch {
    return false;
  }
}

/**
 * Envoie une partie du jour terminée. Le serveur recalcule le score et ne garde que la première partie
 * du jour par jeu ; un nouvel envoi (au lancement suivant, par exemple) est donc sans effet.
 */
export async function submitScore(day: string, game: RankedGame, payload: Record<string, unknown>): Promise<void> {
  const device = await ensureDevice();
  if (!device) return;
  try {
    await rpc('tp_submit', { p_device: device, p_day: day, p_game: game, p_payload: payload });
    await autoPseudo();
  } catch {
    // Hors ligne : la partie sera renvoyée au prochain lancement.
  }
}

export async function fetchLeaderboard(game: RankedGame, period: RankPeriod): Promise<Leaderboard> {
  const device = (await ensureDevice()) ?? '';
  return rpc<Leaderboard>('tp_leaderboard', { p_game: game, p_period: period, p_device: device });
}

/* ---------- Originalité des réponses (supabase/terminus-originalite.sql) ---------- */

export interface Picks {
  /** Parties comptées ce jour-là. */
  players: number;
  /** picks[case][station] = nombre de joueurs (grille : case 0 à 8 ; défi : case 0). */
  picks: Record<string, Record<string, number>>;
}

const picksCache = new Map<string, { at: number; value: Picks | null }>();

/** Totaux des réponses d'un jour (null hors ligne ou si personne n'a encore joué). */
export async function fetchPicks(day: string, game: 'grille' | 'defi'): Promise<Picks | null> {
  const key = `${day}:${game}`;
  const hit = picksCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.value;
  try {
    const value = await rpc<Picks | null>('tp_picks', { p_day: day, p_game: game });
    const ok = value && value.players > 0 ? value : null;
    picksCache.set(key, { at: Date.now(), value: ok });
    return ok;
  } catch {
    return null;
  }
}
