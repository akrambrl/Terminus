import { ADS_ENABLED, IN_EXPO_GO, REWARDED_UNIT_ID } from './config';
import { prepareAds } from './prepare';

/** Pub vidéo disponible : app native construite, pubs activées, bloc AdMob renseigné (ou mode test). */
export function rewardedAdsAvailable(): boolean {
  return ADS_ENABLED && !IN_EXPO_GO && (REWARDED_UNIT_ID !== '' || __DEV__);
}

/**
 * Charge et affiche une pub « avec récompense ».
 * Renvoie true seulement si la pub a été regardée jusqu'au bout (récompense accordée par Google).
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!rewardedAdsAvailable() || !(await prepareAds())) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = require('react-native-google-mobile-ads');
  const ad = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : REWARDED_UNIT_ID);

  return new Promise<boolean>((resolve) => {
    let earned = false;
    let done = false;
    const end = (result: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ad.removeAllListeners();
      resolve(result);
    };
    // Pas de pub disponible après 15 s : on abandonne sans bloquer le joueur.
    const timer = setTimeout(() => end(false), 15000);
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      ad.show().catch(() => end(false));
    });
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => end(earned));
    ad.addAdEventListener(AdEventType.ERROR, () => end(false));
    ad.load();
  });
}
