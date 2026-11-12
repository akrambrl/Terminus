/**
 * Mesure d'audience du jeu (propre au site et aux apps, sans service tiers).
 * Les événements sont transmis à `sink`, branché sur la base Supabase de Terminus
 * (tableau de bord privé terminusparis.fr/?stats=…). Tant qu'aucun envoi n'est branché, rien ne part.
 * Aucune donnée personnelle : identifiant d'appareil aléatoire, pas de nom ni d'e-mail.
 */

export type Props = Record<string, string | number | boolean>;

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
  | 'mode_selected'
  | 'leaderboard_opened';

type Sink = (event: GameEvent, properties?: Props) => void;
let sink: Sink | null = null;

/** Branche l'envoi des événements (base Supabase de Terminus). */
export function setAnalyticsSink(next: Sink | null) {
  sink = next;
}

/** Enregistre un événement ; ne fait jamais planter le jeu. */
export function track(event: GameEvent, properties?: Props) {
  try {
    sink?.(event, properties);
  } catch {
    // Les statistiques ne doivent jamais bloquer le jeu.
  }
}
