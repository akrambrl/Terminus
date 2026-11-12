import { IN_EXPO_GO } from '../ads/config';
import { prepareAds } from '../ads/prepare';

/** Au lancement : formulaire de consentement Google pour la publicité. */
export function startConsent(): void {
  if (IN_EXPO_GO) return;
  prepareAds();
}

/** L'app native permet de revoir ses choix publicitaires. */
export const hasPrivacyChoices = true;

/** Rouvre le formulaire de choix publicitaires (Google). */
export async function openPrivacyChoices(): Promise<void> {
  if (IN_EXPO_GO) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AdsConsent } = require('react-native-google-mobile-ads');
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    // Formulaire indisponible (consentement non exigé dans ce pays, réseau…).
  }
}
