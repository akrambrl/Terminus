import { Platform } from 'react-native';
import { setAdStatus } from './status';

let pending: Promise<boolean> | null = null;

/**
 * Prépare la publicité, une seule fois par lancement (app native) :
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
    setAdStatus('consentement en cours');
    const consent = await ads.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) {
      setAdStatus(`consentement refusé (${consent.status ?? '?'}) : aucune pub`);
      return false;
    }

    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracking = require('expo-tracking-transparency');
      const t = await tracking.requestTrackingPermissionsAsync();
      setAdStatus(`suivi iOS : ${t.status}`);
    }

    await ads.default().initialize();
    setAdStatus('SDK prêt, en attente d’une pub');
    return true;
  } catch (e) {
    setAdStatus(`erreur de préparation : ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
