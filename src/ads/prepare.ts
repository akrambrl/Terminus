import { Platform } from 'react-native';

let pending: Promise<boolean> | null = null;

/**
 * Prépare la publicité, une seule fois par lancement :
 * 1. formulaire de consentement RGPD de Google (UMP), affiché si nécessaire ;
 * 2. sur iPhone, demande d'autorisation de suivi (App Tracking Transparency) ;
 * 3. initialisation du SDK AdMob.
 * Renvoie false si les pubs ne peuvent pas être demandées (refus, erreur, réseau…).
 */
export function prepareAds(): Promise<boolean> {
  if (!pending) pending = run();
  return pending;
}

async function run(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require('react-native-google-mobile-ads');
    const consent = await ads.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) return false;

    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracking = require('expo-tracking-transparency');
      await tracking.requestTrackingPermissionsAsync();
    }

    await ads.default().initialize();
    return true;
  } catch {
    return false;
  }
}
