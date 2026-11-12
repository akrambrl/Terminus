import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, logoColors, logoTilt, palette, textOn, ui } from '../theme';

/** Logo : chaque lettre de TERMINUS sur une tuile colorée, comme une suite de pastilles de lignes. */
export function Logo({ tile = 34, plaque }: { tile?: number; plaque?: boolean }) {
  // Sur fond coloré ou sombre, le logo est posé dans une plaque bleu nuit à bord blanc (charte).
  return (
    <View
      style={[styles.wrap, plaque && styles.plaque, plaque && { borderRadius: ui.radiusFor(tile * 1.6) }]}
      accessibilityRole="header"
      accessibilityLabel="Terminus Paris"
    >
      <View style={styles.tiles}>
        {'TERMINUS'.split('').map((letter, i) => (
          <View
            key={i}
            style={[
              styles.tile,
              {
                width: tile,
                height: tile * 1.12,
                borderRadius: ui.radiusFor(tile),
                backgroundColor: logoColors[i],
                transform: [{ rotate: `${logoTilt[i]}deg` }],
              },
            ]}
          >
            <Text
              style={[
                styles.letter,
                { fontSize: tile * 0.66, color: textOn(logoColors[i], 24) },
              ]}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.parisRow}>
        {!plaque && <View style={[styles.rule, { backgroundColor: palette.tomato }]} />}
        <Text style={[styles.paris, { fontSize: tile * 0.4, letterSpacing: tile * 0.4 * 0.6 }, plaque && { color: colors.gold }]}>
          PARIS
        </Text>
        {!plaque && <View style={[styles.rule, { backgroundColor: palette.ultramarine }]} />}
      </View>
    </View>
  );
}

/** Petite grille 3×3 colorée (même motif que l'icône de l'app). */
export function GridMark({ size }: { size: number }) {
  const cell = size / 3.6;
  const tints = [
    palette.ultramarine, palette.tomato, palette.sun,
    palette.mint, colors.white, palette.pink,
    palette.violet, palette.sun, palette.ultramarine,
  ];
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: cell * 0.3 }}>
      {tints.map((c, i) => (
        <View key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.3, backgroundColor: c }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  plaque: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: ui.border,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tiles: { flexDirection: 'row', gap: 3 },
  tile: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.display, includeFontPadding: false },
  parisRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, alignSelf: 'stretch' },
  rule: { flex: 1, height: 4, borderRadius: 2 },
  paris: { fontFamily: fonts.heavy, color: colors.ink, paddingLeft: 6 },
});
