import { setAnalyticsConsent } from '../analytics';
import { IN_EXPO_GO } from '../ads/config';
import { analyticsAllowedFromConsent, prepareAds } from '../ads/prepare';

/** Au lancement : formulaire de consentement Google (pub et statistiques). */
export function startConsent(): void {
  if (IN_EXPO_GO) {
    // Le module de consentement n'existe pas dans Expo Go : pas de statistiques en test.
    setAnalyticsConsent(false);
    return;
  }
  prepareAds();
}

/** Sur le web uniquement. */
export const needsWebConsent = false;

/** Rouvre le formulaire de choix (pub et statistiques). */
export async function openPrivacyChoices(): Promise<void> {
  if (IN_EXPO_GO) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AdsConsent } = require('react-native-google-mobile-ads');
    await AdsConsent.showPrivacyOptionsForm();
    setAnalyticsConsent(await analyticsAllowedFromConsent());
  } catch {
    // Formulaire indisponible (consentement non exigé dans ce pays, réseau…).
  }
}
