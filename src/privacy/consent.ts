import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAnalyticsConsent } from '../analytics';

/**
 * Version web : pas de formulaire Google. Le choix pour les statistiques est demandé
 * par un bandeau (Accepter / Refuser) et gardé dans le navigateur.
 */
const KEY = 'terminus:stats-consent';

export const needsWebConsent = true;

export async function getWebChoice(): Promise<'granted' | 'denied' | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export async function setWebChoice(granted: boolean): Promise<void> {
  setAnalyticsConsent(granted);
  try {
    await AsyncStorage.setItem(KEY, granted ? 'granted' : 'denied');
  } catch {
    // ignoré
  }
}

/** Au lancement : applique le choix déjà fait, sinon le bandeau s'affichera. */
export function startConsent(): void {
  getWebChoice().then((c) => {
    if (c) setAnalyticsConsent(c === 'granted');
  });
}

/** Efface le choix : le bandeau réapparaît. */
export async function openPrivacyChoices(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignoré
  }
}
