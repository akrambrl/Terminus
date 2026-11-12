import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { APP_VERSION } from '../version';
import { readAcquisition } from './acquisition';

/**
 * Statistiques d'utilisation (PostHog, hébergement européen).
 * Rien n'est envoyé avant l'accord du joueur (consentement RGPD / CNIL) :
 * les événements attendent en mémoire, puis partent s'il accepte ou sont effacés s'il refuse.
 */
export const POSTHOG_KEY = 'phc_oRc7aSZgvyup76g4XYY7X9wHunn34mi7kKMM9TktHowj';
export const POSTHOG_HOST = 'https://eu.i.posthog.com';

type Props = Record<string, string | number | boolean>;

let client: PostHog | null = null;
let consent: 'unknown' | 'granted' | 'denied' = 'unknown';
const pending: { event: GameEvent; properties?: Props }[] = [];

function startClient() {
  if (client || !POSTHOG_KEY) return;
  try {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Ouverture de l'app, mise en arrière-plan, installation, mise à jour.
      captureAppLifecycleEvents: true,
      // Joueurs anonymes : aucun nom ni e-mail n'est collecté.
      personProfiles: 'identified_only',
    });
    const acq = readAcquisition();
    client.register({
      app_version: APP_VERSION,
      platform: Platform.OS,
      // Provenance du joueur (lien suivi TikTok, Instagram…), sur chaque événement.
      ...(acq ? { acq_source: acq.source, acq_medium: acq.medium, acq_campaign: acq.campaign } : {}),
    });
  } catch {
    client = null;
  }
}

/** Applique le choix du joueur (appelé après le formulaire de consentement ou le bandeau web). */
export function setAnalyticsConsent(granted: boolean) {
  consent = granted ? 'granted' : 'denied';
  if (granted) {
    startClient();
    client?.optIn().catch(() => {});
    for (const e of pending.splice(0)) client?.capture(e.event, e.properties);
  } else {
    pending.length = 0;
    try {
      Promise.resolve(client?.optOut()).catch(() => {});
    } catch {
      // ignoré
    }
  }
}

export type GameEvent =
  | 'app_opened'
  | 'game_started'
  | 'guess'
  | 'game_finished'
  | 'result_shared'
  | 'free_game_started'
  | 'help_opened'
  | 'store_link_clicked'
  | 'coins_bonus'
  | 'not_enough_coins'
  | 'free_game_resumed'
  | 'ad_reward_started'
  | 'ad_reward_earned'
  | 'ad_reward_failed'
  | 'mode_selected';

/** Envoie un événement si le joueur a accepté les statistiques ; ne fait jamais planter le jeu. */
export function track(event: GameEvent, properties?: Props) {
  try {
    if (consent === 'granted') client?.capture(event, properties);
    else if (consent === 'unknown' && pending.length < 50) pending.push({ event, properties });
  } catch {
    // Les statistiques ne doivent jamais bloquer le jeu.
  }
}
