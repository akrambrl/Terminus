import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

/**
 * Version web : pas encore de publicité (en attente de la validation AdSense).
 * Pour régler la mise en page, terminusparis.fr/?pub=1 affiche un faux encart de 100 px en bas de l'écran,
 * à la place de la future bannière (même hauteur que la grande bannière AdMob des apps).
 * La version des apps est dans AdBanner.native.tsx.
 */
const TEST_SLOT = (() => {
  if (Platform.OS !== 'web') return false;
  try {
    return new URLSearchParams((globalThis as { location?: { search?: string } }).location?.search ?? '').get('pub') === '1';
  } catch {
    return false;
  }
})();

export function AdBanner() {
  if (!TEST_SLOT) return null;
  return (
    <View style={styles.slot}>
      <Text style={styles.text}>Emplacement publicitaire (test)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: 100,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
});
