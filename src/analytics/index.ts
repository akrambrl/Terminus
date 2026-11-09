import PostHog from 'posthog-react-native';
import { Platform } from 'react-native';
import { APP_VERSION } from '../version';

/**
 * Statistiques d'utilisation (PostHog, hébergement européen).
 * Tant que POSTHOG_KEY est vide, rien n'est envoyé.
 *
 * Tableau de bord : utilisateurs en direct, par jour / semaine / mois, pays et ville
 * (déduits de l'IP), heures de connexion, appareils, rétention, et les événements du jeu ci-dessous.
 */
export const POSTHOG_KEY = 'phc_oRc7aSZgvyup76g4XYY7X9wHunn34mi7kKMM9TktHowj';
export const POSTHOG_HOST = 'https://eu.i.posthog.com';

let client: PostHog | null = null;
try {
  if (POSTHOG_KEY) {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Ouverture de l'app, mise en arrière-plan, installation, mise à jour.
      captureAppLifecycleEvents: true,
      // Joueurs anonymes : aucun nom ni e-mail n'est collecté.
      personProfiles: 'identified_only',
    });
    client.register({ app_version: APP_VERSION, platform: Platform.OS });
  }
} catch {
  client = null;
}

export type GameEvent =
  | 'app_opened'
  | 'game_started'
  | 'guess'
  | 'game_finished'
  | 'result_shared'
  | 'free_game_started'
  | 'help_opened';

/** Envoie un événement ; ne fait jamais planter le jeu. */
export function track(event: GameEvent, properties?: Record<string, string | number | boolean>) {
  try {
    client?.capture(event, properties);
  } catch {
    // Les statistiques ne doivent jamais bloquer le jeu.
  }
}
