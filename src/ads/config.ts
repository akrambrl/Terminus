import { Platform } from 'react-native';

/**
 * Réglages de la bannière publicitaire (AdMob), prévue pour l'app des stores uniquement.
 * Tant que ADS_ENABLED vaut false, rien ne s'affiche et aucune place n'est réservée.
 * Voir la section « Publicité » du README pour l'activer.
 */
export const ADS_ENABLED = false;

/** Affiche un faux encart gris à la place de la pub, pour régler la mise en page. */
export const SHOW_AD_PLACEHOLDER = false;

/** Identifiants de bannière AdMob, à remplir avec ceux du compte AdMob. */
export const BANNER_UNIT_ID = Platform.select({
  ios: '',
  android: '',
  default: '',
});

/** Hauteur réservée en bas de l'écran (bannière adaptative standard). */
export const BANNER_HEIGHT = 60;

/** La pub ne s'affiche jamais dans la version web. */
export const adsActive = (ADS_ENABLED || SHOW_AD_PLACEHOLDER) && Platform.OS !== 'web';
