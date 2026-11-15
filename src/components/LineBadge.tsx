import { StyleSheet, Text, View } from 'react-native';
import type { LineId } from '../game/types';
import { colors, fonts, lineColors, ui } from '../theme';

interface Props {
  line: LineId;
  size?: number;
  /** Liseré blanc, quand la pastille est posée sur un fond coloré (charte). */
  ring?: boolean;
}

/** Pastille de ligne : carré arrondi (rayon 28 %), numéro en Figtree 800 ; 3bis et 7bis écrits « 3b », « 7b ». */
export function LineBadge({ line, size = 28, ring }: Props) {
  const { bg, fg } = lineColors[line];
  const label = line.replace('bis', 'b');
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, width: size, height: size, borderRadius: ui.badgeRadius(size) },
        ring && { borderWidth: Math.max(1, size * 0.08), borderColor: colors.white },
      ]}
      accessibilityLabel={`Ligne ${line.replace('bis', ' bis')}`}
    >
      <Text
        style={[styles.text, { color: fg, fontSize: size * (label.length > 1 ? 0.46 : 0.56) }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.heavy, includeFontPadding: false },
});

/** Couleurs des lignes de RER (pastilles rondes, pour les distinguer des lignes de métro). */
const RER_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#E3051C', fg: '#FFFFFF' },
  B: { bg: '#5291CE', fg: '#FFFFFF' },
  C: { bg: '#FFCE00', fg: '#15123D' },
  D: { bg: '#00814F', fg: '#FFFFFF' },
  E: { bg: '#C04191', fg: '#FFFFFF' },
};

/** Correspondances RER : petit « RER » puis une pastille ronde de couleur par ligne. */
export function RerBadges({ lines, size = 20, light }: { lines: string[]; size?: number; light?: boolean }) {
  if (!lines.length) return null;
  return (
    <View style={rerStyles.row} accessibilityLabel={`RER ${lines.join(', ')}`}>
      <Text style={[rerStyles.label, { fontSize: size * 0.5, color: light ? colors.white : colors.ink }]}>RER</Text>
      {lines.map((l) => {
        const c = RER_COLORS[l] ?? { bg: colors.ink, fg: colors.white };
        return (
          <View key={l} style={[rerStyles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}>
            <Text style={[rerStyles.text, { color: c.fg, fontSize: size * 0.56 }]} allowFontScaling={false}>
              {l}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const rerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  label: { fontFamily: fonts.heavy, letterSpacing: 0.5, marginRight: 1 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.heavy, includeFontPadding: false },
});
