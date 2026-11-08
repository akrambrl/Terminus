import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, logoColors, palette } from '../theme';

/** Logo : chaque lettre de TERMINUS sur une tuile colorée, comme une suite de pastilles de lignes. */
export function Logo({ tile = 34 }: { tile?: number }) {
  return (
    <View style={styles.wrap} accessibilityRole="header" accessibilityLabel="Terminus Paris">
      <View style={styles.tiles}>
        {'TERMINUS'.split('').map((letter, i) => (
          <View
            key={i}
            style={[
              styles.tile,
              {
                width: tile,
                height: tile * 1.12,
                borderRadius: tile * 0.26,
                backgroundColor: logoColors[i],
                transform: [{ rotate: i % 2 ? '3deg' : '-3deg' }],
              },
            ]}
          >
            <Text
              style={[
                styles.letter,
                { fontSize: tile * 0.68, color: logoColors[i] === palette.sun ? colors.ink : '#FFFFFF' },
              ]}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.parisRow}>
        <View style={[styles.rule, { backgroundColor: palette.tomato }]} />
        <Text style={styles.paris}>PARIS</Text>
        <View style={[styles.rule, { backgroundColor: palette.ultramarine }]} />
      </View>
    </View>
  );
}

/** Petite grille 3×3 colorée (même motif que l'icône de l'app). */
export function GridMark({ size }: { size: number }) {
  const cell = size / 3.6;
  const tints = [
    palette.ultramarine, palette.tomato, palette.sun,
    palette.mint, '#FFFFFF', palette.pink,
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
  tiles: { flexDirection: 'row', gap: 3 },
  tile: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.display, includeFontPadding: false },
  parisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, alignSelf: 'stretch' },
  rule: { flex: 1, height: 4, borderRadius: 2 },
  paris: { fontFamily: fonts.heavy, fontSize: 14, letterSpacing: 8, color: colors.ink, paddingLeft: 8 },
});
