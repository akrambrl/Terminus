import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { adsActive, BANNER_HEIGHT, SHOW_AD_PLACEHOLDER } from './config';

/**
 * Emplacement de la bannière, fixé en bas de l'écran sous la zone qui défile :
 * la grille et les boutons restent toujours au-dessus, jamais cachés par la pub.
 *
 * Pour brancher AdMob, remplacer le contenu de l'encart par :
 *   <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 * (bibliothèque react-native-google-mobile-ads, voir le README).
 */
export function AdBanner() {
  const insets = useSafeAreaInsets();
  if (!adsActive) return null;
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={[styles.slot, { height: BANNER_HEIGHT }]}>
        {SHOW_AD_PLACEHOLDER && <Text style={styles.placeholder}>Emplacement publicitaire</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  slot: { alignItems: 'center', justifyContent: 'center' },
  placeholder: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
});
