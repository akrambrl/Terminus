import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pièces du jeu : monnaie virtuelle gagnée en jouant, jamais achetée avec de l'argent réel.
 * - Bonus quotidien : DAILY_BONUS pièces à la première ouverture de chaque jour.
 * - Bienvenue : WELCOME_BONUS pièces en plus à la toute première ouverture.
 * - Une grille en plus de la grille du jour coûte GRID_COST pièces.
 */
export const DAILY_BONUS = 5;
export const WELCOME_BONUS = 10;
export const GRID_COST = 5;

const WALLET_KEY = 'terminus:wallet';

interface Wallet {
  coins: number;
  lastBonusDay: string | null;
}

async function load(): Promise<Wallet | null> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_KEY);
    return raw ? (JSON.parse(raw) as Wallet) : null;
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

export interface BonusResult {
  coins: number;
  /** Pièces gagnées à cette ouverture (0 si le bonus du jour a déjà été donné). */
  granted: number;
  welcome: boolean;
}

/** Donne le bonus quotidien s'il n'a pas encore été donné aujourd'hui. */
export async function claimDailyBonus(day: string): Promise<BonusResult> {
  const wallet = await load();
  if (!wallet) {
    const granted = WELCOME_BONUS + DAILY_BONUS;
    await save({ coins: granted, lastBonusDay: day });
    return { coins: granted, granted, welcome: true };
  }
  if (wallet.lastBonusDay === day) return { coins: wallet.coins, granted: 0, welcome: false };
  const next = { coins: wallet.coins + DAILY_BONUS, lastBonusDay: day };
  await save(next);
  return { coins: next.coins, granted: DAILY_BONUS, welcome: false };
}

/** Dépense des pièces ; renvoie false (sans rien retirer) si le solde ne suffit pas. */
export async function spendCoins(amount: number): Promise<{ ok: boolean; coins: number }> {
  const wallet = (await load()) ?? { coins: 0, lastBonusDay: null };
  if (wallet.coins < amount) return { ok: false, coins: wallet.coins };
  const next = { ...wallet, coins: wallet.coins - amount };
  await save(next);
  return { ok: true, coins: next.coins };
}
