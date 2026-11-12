/**
 * Version web : pas de publicité pour l'instant, donc aucun choix à demander.
 * (La mesure d'audience du jeu est anonyme et interne : exemptée de consentement par la CNIL.)
 */
export function startConsent(): void {}

/** Sur le web, aucun choix publicitaire à gérer. */
export const hasPrivacyChoices = false;

export async function openPrivacyChoices(): Promise<void> {}
