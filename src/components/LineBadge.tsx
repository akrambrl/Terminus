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
