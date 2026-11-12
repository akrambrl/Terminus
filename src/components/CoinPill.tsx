import { StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts, mix, palette } from '../theme';

/** Bord de la pièce : le jaune soleil assombri. */
const COIN_EDGE = mix(palette.sun, colors.ink, 0.25);

/** Une pièce dessinée (disque doré à double bord). */
export function Coin({ size = 18 }: { size?: number }) {
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.12 }]}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size * 0.21,
          borderWidth: size * 0.08,
          borderColor: COIN_EDGE,
        }}
      />
    </View>
  );
}

/** Solde de pièces, affiché dans le bandeau de la grille. */
export function CoinPill({ coins }: { coins: number }) {
  return (
    <View style={styles.pill} accessibilityLabel={`${coins} pièces`}>
      <Coin />
      <Text style={styles.count}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: { backgroundColor: palette.sun, borderColor: COIN_EDGE, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: alpha(colors.white, 0.14),
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  count: { fontFamily: fonts.display, fontSize: 16, color: colors.white },
});
