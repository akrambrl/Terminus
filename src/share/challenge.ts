import { Platform } from 'react-native';
import { readAcquisition } from '../analytics/acquisition';
import { getLocalPseudo } from '../analytics/supabase';
import { WEB_URL } from '../store/links';
import { currentDayKey } from '../game/day';

/**
 * Défi entre amis : le lien partagé porte le score du joueur pour le jeu du jour.
 * L'ami qui l'ouvre voit « Akram a fait 7/9, fais mieux ! », puis la comparaison à la fin de sa partie.
 *
 * Adresse : https://terminusparis.fr/?c=g&j=2026-11-14&r=7.640&p=Akram&utm_source=partage&utm_medium=grille
 *   c = jeu (g grille, d défi, p pendu), j = jour, r = résultat, p = pseudo (facultatif).
 *   grille : trouvées.points ; défi : trouvées.total ; pendu : erreurs si trouvé, sinon « x ».
 */
export type ChallengeGame = 'grille' | 'defi' | 'pendu';

export interface MyResult {
  /** Grille : stations trouvées ; défi : stations trouvées ; pendu : 1 si trouvé, sinon 0. */
  found: number;
  /** Grille : points ; défi : nombre de réponses ; pendu : erreurs. */
  extra: number;
}

export interface Challenge extends MyResult {
  game: ChallengeGame;
  day: string;
  from: string | null;
}

const CODES: Record<ChallengeGame, string> = { grille: 'g', defi: 'd', pendu: 'p' };
const KEY = 'terminus:challenge';

const cleanName = (v: string | null) =>
  (v ?? '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 _.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || null;

/** Lien de défi pour le jeu du jour. */
export async function challengeLink(game: ChallengeGame, day: string, r: MyResult): Promise<string> {
  const result = game === 'pendu' ? (r.found ? String(r.extra) : 'x') : `${r.found}.${r.extra}`;
  const params = new URLSearchParams({ c: CODES[game], j: day, r: result });
  const pseudo = await getLocalPseudo();
  if (pseudo) params.set('p', pseudo);
  params.set('utm_source', 'partage');
  params.set('utm_medium', game);
  return `${WEB_URL}?${params.toString()}`;
}

function parse(search: string): Challenge | null {
  const q = new URLSearchParams(search);
  const game = (Object.keys(CODES) as ChallengeGame[]).find((g) => CODES[g] === q.get('c'));
  const day = q.get('j') ?? '';
  const r = q.get('r') ?? '';
  if (!game || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  let found: number;
  let extra: number;
  if (game === 'pendu') {
    if (r === 'x') [found, extra] = [0, 5];
    else if (/^[0-5]$/.test(r)) [found, extra] = [1, Number(r)];
    else return null;
  } else {
    const m = /^(\d{1,2})\.(\d{1,4})$/.exec(r);
    if (!m) return null;
    [found, extra] = [Number(m[1]), Number(m[2])];
    if (game === 'grille' && found > 9) return null;
    if (game === 'defi' && (extra > 30 || found > extra)) return null;
  }
  return { game, day, found, extra, from: cleanName(q.get('p')) };
}

/**
 * Défi reçu par lien, pour aujourd'hui (web seulement). Gardé dans le navigateur pour la journée,
 * et retiré de l'adresse pour qu'un nouveau partage n'emporte pas le score de l'ami.
 */
export function readChallenge(): Challenge | null {
  if (Platform.OS !== 'web') return null;
  const today = currentDayKey();
  try {
    const g = globalThis as {
      location?: { search?: string; pathname?: string; hash?: string };
      localStorage?: Storage;
      history?: History;
    };
    const search = g.location?.search ?? '';
    const fromUrl = parse(search);
    if (fromUrl) {
      readAcquisition(); // garde la provenance « partage » avant de nettoyer l'adresse
      const q = new URLSearchParams(search);
      for (const k of ['c', 'j', 'r', 'p', 'utm_source', 'utm_medium', 'utm_campaign']) q.delete(k);
      const rest = q.toString();
      g.history?.replaceState(null, '', `${g.location?.pathname ?? '/'}${rest ? `?${rest}` : ''}${g.location?.hash ?? ''}`);
      if (fromUrl.day === today) {
        g.localStorage?.setItem(KEY, JSON.stringify(fromUrl));
        return fromUrl;
      }
    }
    const stored = g.localStorage?.getItem(KEY);
    if (!stored) return null;
    const c = JSON.parse(stored) as Challenge;
    if (c.day === today) return c;
    g.localStorage?.removeItem(KEY);
  } catch {
    // navigateur sans stockage : pas de défi
  }
  return null;
}

let current: Challenge | null | undefined;
/** Défi du jour reçu par lien (lu une seule fois). */
export function getChallenge(): Challenge | null {
  if (current === undefined) current = readChallenge();
  return current && current.day === currentDayKey() ? current : null;
}

export function dismissChallenge() {
  current = null;
  try {
    (globalThis as { localStorage?: Storage }).localStorage?.removeItem(KEY);
  } catch {
    // rien
  }
}

/** « 7/9 · 640 pts », « 5/6 », « trouvé avec 2 erreurs ». */
export function resultText(game: ChallengeGame, r: MyResult): string {
  if (game === 'grille') return `${r.found}/9 · ${r.extra} pts`;
  if (game === 'defi') return `${r.found}/${r.extra}`;
  if (!r.found) return 'pas trouvé';
  return r.extra === 0 ? 'trouvé sans erreur' : `trouvé avec ${r.extra} erreur${r.extra > 1 ? 's' : ''}`;
}

/** Valeur comparable : plus c'est haut, mieux c'est. */
function value(game: ChallengeGame, r: MyResult): number {
  if (game === 'grille') return r.extra * 10 + r.found;
  if (game === 'defi') return r.found;
  return r.found ? 6 - r.extra : 0;
}

/** Résultat du duel : 1 si je gagne, 0 égalité, -1 si l'ami gagne. */
export function duel(c: Challenge, mine: MyResult): -1 | 0 | 1 {
  const d = value(c.game, mine) - value(c.game, c);
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

export function duelText(c: Challenge, mine: MyResult): string {
  const who = c.from ?? 'Ton ami';
  const d = duel(c, mine);
  if (d > 0) return `🏆 Tu bats ${who} !`;
  if (d < 0) return `${who} garde l'avantage… Revanche demain !`;
  return `Égalité avec ${who} !`;
}

export function challengeIntro(c: Challenge): string {
  const who = c.from ?? 'Un ami';
  if (c.game === 'pendu') {
    if (!c.found) return `${who} n'a pas trouvé la station du pendu du jour. Fais mieux !`;
    const how = c.extra === 0 ? 'sans erreur' : `avec ${c.extra} erreur${c.extra > 1 ? 's' : ''}`;
    return `${who} a trouvé la station du pendu ${how}. Fais mieux !`;
  }
  return `${who} a fait ${resultText(c.game, c)} ${c.game === 'grille' ? 'sur la grille' : 'au défi'} du jour. Fais mieux !`;
}
