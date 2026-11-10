import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pièces du jeu : monnaie virtuelle, jamais achetée avec de l'argent réel.
 * - DAILY_BONUS pièces à la première ouverture de chaque jour (WELCOME_BONUS en plus la 1re fois).
 * - Une grille en plus de la grille du jour coûte GRID_COST pièce.
 * - Une pub vidéo facultative rapporte AD_REWARD pièces, au plus MAX_ADS_PER_DAY fois par jour.
 * - Le stock est plafonné à MAX_COINS pour garder l'envie de revenir chaque jour.
 */
export const DAILY_BONUS = 3;
export const WELCOME_BONUS = 3;
export const GRID_COST = 1;
export const AD_REWARD = 2;
export const MAX_ADS_PER_DAY = 3;
export const MAX_COINS = 10;

const WALLET_KEY = 'terminus:wallet';

interface Wallet {
  coins: number;
  lastBonusDay: string | null;
  adsDay?: string;
  adsCount?: number;
}

export interface WalletState {
  coins: number;
  /** Pubs encore possibles aujourd'hui. */
  adsLeft: number;
}

async function load(): Promise<Wallet | null> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as Wallet;
    return { ...w, coins: Math.min(w.coins, MAX_COINS) };
  } catch {
    return null;
  }
}

async function save(w: Wallet) {
  try {
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(w));
  } catch {
    // Le jeu reste jouable sans sauvegarde.
  }
}

const adsLeft = (w: Wallet, day: string) =>
  MAX_ADS_PER_DAY - (w.adsDay === day ? (w.adsCount ?? 0) : 0);
const state = (w: Wallet, day: string): WalletState => ({ coins: w.coins, adsLeft: adsLeft(w, day) });

export interface BonusResult extends WalletState {
  /** Pièces gagnées à cette ouverture (0 si le bonus du jour a déjà été donné). */
  granted: number;
  welcome: boolean;
}

/** Donne le bonus quotidien s'il n'a pas encore été donné aujourd'hui. */
export async function claimDailyBonus(day: string): Promise<BonusResult> {
  const wallet = await load();
  if (!wallet) {
    const w = { coins: Math.min(WELCOME_BONUS + DAILY_BONUS, MAX_COINS), lastBonusDay: day };
    await save(w);
    return { ...state(w, day), granted: w.coins, welcome: true };
  }
  if (wallet.lastBonusDay === day) return { ...state(wallet, day), granted: 0, welcome: false };
  const coins = Math.min(wallet.coins + DAILY_BONUS, MAX_COINS);
  const next = { ...wallet, coins, lastBonusDay: day };
  await save(next);
  return { ...state(next, day), granted: coins - wallet.coins, welcome: false };
}

/** Dépense des pièces ; renvoie ok: false (sans rien retirer) si le solde ne suffit pas. */
export async function spendCoins(amount: number, day: string): Promise<WalletState & { ok: boolean }> {
  const wallet = (await load()) ?? { coins: 0, lastBonusDay: null };
  if (wallet.coins < amount) return { ...state(wallet, day), ok: false };
  const next = { ...wallet, coins: wallet.coins - amount };
  await save(next);
  return { ...state(next, day), ok: true };
}

/** Crédite la récompense d'une pub vue en entier (dans la limite du jour et du plafond). */
export async function grantAdReward(day: string): Promise<WalletState & { granted: number }> {
  const wallet = (await load()) ?? { coins: 0, lastBonusDay: null };
  if (adsLeft(wallet, day) <= 0) return { ...state(wallet, day), granted: 0 };
  const coins = Math.min(wallet.coins + AD_REWARD, MAX_COINS);
  const next = {
    ...wallet,
    coins,
    adsDay: day,
    adsCount: (wallet.adsDay === day ? (wallet.adsCount ?? 0) : 0) + 1,
  };
  await save(next);
  return { ...state(next, day), granted: coins - wallet.coins };
}
