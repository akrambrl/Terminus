/** Version web et par défaut : pas de pub vidéo. La version native est dans rewarded.native.ts. */
export function rewardedAdsAvailable(): boolean {
  return false;
}

export async function showRewardedAd(): Promise<boolean> {
  return false;
}
