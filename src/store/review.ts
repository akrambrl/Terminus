import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const COUNT_KEY = 'terminus:finished-count';
const LAST_ASK_KEY = 'terminus:review-asked-at';
const MIN_GAMES = 3;
const MIN_FOUND = 7;
const DAYS_BETWEEN_ASKS = 60;

/**
 * Demande un avis sur le store au meilleur moment : après une bonne grille (7/9 ou plus),
 * à partir de la 3e grille terminée, et au plus une fois tous les 60 jours.
 * Apple et Google limitent eux-mêmes encore la fréquence d'affichage.
 */
export async function onGameFinished(found: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const count = Number((await AsyncStorage.getItem(COUNT_KEY)) ?? '0') + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(count));
    if (count < MIN_GAMES || found < MIN_FOUND) return;

    const lastAsk = Number((await AsyncStorage.getItem(LAST_ASK_KEY)) ?? '0');
    if (Date.now() - lastAsk < DAYS_BETWEEN_ASKS * 86400000) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StoreReview = require('expo-store-review');
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(LAST_ASK_KEY, String(Date.now()));
    // Laisse d'abord le joueur voir son résultat.
    setTimeout(() => StoreReview.requestReview().catch(() => {}), 1500);
  } catch {
    // Jamais bloquant.
  }
}
