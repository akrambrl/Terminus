import { Platform } from 'react-native';
import { setAnalyticsConsent } from '../analytics';

let pending: Promise<boolean> | null = null;

/**
 * Prépare la publicité et les statistiques, une seule fois par lancement (app native) :
 * 1. formulaire de consentement RGPD de Google (UMP), affiché si nécessaire ;
 * 2. statistiques PostHog activées seulement si le joueur a accepté la mesure d'audience ;
 * 3. sur iPhone, demande d'autorisation de suivi (App Tracking Transparency) ;
 * 4. initialisation du SDK AdMob.
 * Renvoie false si les pubs ne peuvent pas être demandées (refus, erreur, réseau…).
 */
export function prepareAds(): Promise<boolean> {
  if (!pending) pending = run();
  return pending;
}

/** Les statistiques sont autorisées si le consentement n'est pas exigé, ou s'il couvre la mesure d'audience. */
export async function analyticsAllowedFromConsent(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AdsConsent, AdsConsentStatus } = require('react-native-google-mobile-ads');
  const info = await AdsConsent.getConsentInfo();
  if (info.status === AdsConsentStatus.NOT_REQUIRED) return true;
  if (info.status !== AdsConsentStatus.OBTAINED) return false;
  const c = await AdsConsent.getUserChoices();
  return !!c.storeAndAccessInformationOnDevice && !!(c.measureContentPerformance || c.developAndImproveProducts);
}

async function run(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require('react-native-google-mobile-ads');
    const consent = await ads.AdsConsent.gatherConsent();
    setAnalyticsConsent(await analyticsAllowedFromConsent().catch(() => false));
    if (!consent.canRequestAds) return false;

    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracking = require('expo-tracking-transparency');
      await tracking.requestTrackingPermissionsAsync();
    }

    await ads.default().initialize();
    return true;
  } catch {
    setAnalyticsConsent(false);
    return false;
  }
}
