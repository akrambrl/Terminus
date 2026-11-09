import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { adsActive, BANNER_UNIT_ID, IN_EXPO_GO, SHOW_AD_PLACEHOLDER } from './config';
import { prepareAds } from './prepare';

/**
 * Bannière fixée en bas de l'écran, sous la zone qui défile : la grille et les boutons
 * restent toujours au-dessus. Elle n'est chargée qu'après le consentement (RGPD, puis suivi Apple).
 */
export function AdBanner() {
  const insets = useSafeAreaInsets();
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (!adsActive || SHOW_AD_PLACEHOLDER || IN_EXPO_GO) return;
    let alive = true;
    prepareAds().then((ok) => alive && setCanShow(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (!adsActive) return null;

  let content = null;
  if (SHOW_AD_PLACEHOLDER) {
    content = <Text style={styles.placeholder}>Emplacement publicitaire</Text>;
  } else if (canShow) {
    // Chargé à la demande : le module natif n'existe pas dans Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
    content = (
      <BannerAd
        // En développement, bannière de test Google : ne jamais cliquer sur ses propres pubs.
        unitId={__DEV__ ? TestIds.ADAPTIVE_BANNER : BANNER_UNIT_ID}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      />
    );
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={styles.slot}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  slot: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
});
