import { StyleSheet, Text, View } from 'react-native';
import type { LineId } from '../game/types';
import { fonts, lineColors } from '../theme';

interface Props {
  line: LineId;
  size?: number;
}

/** Pastille de ligne : carré arrondi avec le numéro (design propre au jeu). */
export function LineBadge({ line, size = 28 }: Props) {
  const { bg, fg } = lineColors[line];
  const isBis = line.endsWith('bis');
  const label = line.replace('bis', '');
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, width: size, height: size, borderRadius: size * 0.28 },
        isBis && { borderWidth: 2, borderColor: '#15123D', borderStyle: 'dashed' },
      ]}
    >
      <Text style={[styles.text, { color: fg, fontSize: size * (label.length > 1 ? 0.44 : 0.52) }]}>
        {label}
      </Text>
      {isBis && <Text style={[styles.bis, { color: fg, fontSize: size * 0.26 }]}>bis</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display, includeFontPadding: false },
  bis: { fontFamily: fonts.heavy, marginTop: -2 },
});
