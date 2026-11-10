import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Réglages de la bannière publicitaire AdMob (app des stores uniquement).
 * Voir la section « Publicité » du README.
 */
export const ADS_ENABLED = true;

/** Affiche un faux encart gris à la place de la pub, pour régler la mise en page. */
export const SHOW_AD_PLACEHOLDER = false;

/**
 * Identifiants AdMob du compte de l'éditeur.
 * Les ID d'application sont aussi déclarés dans app.json (plugin react-native-google-mobile-ads).
 */
export const ADMOB = {
  ios: {
    appId: 'ca-app-pub-4450845101011880~9098886467',
    bannerId: 'ca-app-pub-4450845101011880/3592630109',
    /** Bloc « Avec récompense » (pub vidéo contre des pièces), à créer dans AdMob. */
    rewardedId: '',
  },
  android: {
    appId: 'ca-app-pub-4450845101011880~8427309339',
    bannerId: 'ca-app-pub-4450845101011880/4498517669',
    rewardedId: '',
  },
};

export const BANNER_UNIT_ID =
  Platform.OS === 'ios' ? ADMOB.ios.bannerId : Platform.OS === 'android' ? ADMOB.android.bannerId : '';

/** Expo Go ne contient pas le module natif AdMob : la pub n'y est jamais chargée. */
export const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** La pub ne s'affiche que dans l'app native construite (jamais sur le web ni dans Expo Go). */
export const adsActive =
  Platform.OS !== 'web' &&
  ((ADS_ENABLED && !IN_EXPO_GO && BANNER_UNIT_ID !== '') || SHOW_AD_PLACEHOLDER);

export const REWARDED_UNIT_ID =
  Platform.OS === 'ios' ? ADMOB.ios.rewardedId : Platform.OS === 'android' ? ADMOB.android.rewardedId : '';
