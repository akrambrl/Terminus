import { StyleSheet, Text, View } from 'react-native';
import type { Criterion } from '../game/types';
import { colors, fonts, kindColors } from '../theme';
import { LineBadge } from './LineBadge';

/**
 * Taille de police qui fait tenir le mot le plus long sur une ligne, pour ne jamais couper un mot
 * en deux (« Correspon-dance »). adjustsFontSizeToFit n'existe pas sur le web.
 */
function fitFont(text: string, size: number, max = 13): number {
  const inner = size - 10 - 12; // marges et rembourrage de la carte
  const longest = Math.max(...text.split(/\s+/).map((w) => w.length));
  return Math.max(9, Math.min(max, Math.floor(inner / (longest * 0.78))));
}

export function CriterionLabel({ criterion, size }: { criterion: Criterion; size: number }) {
  if (criterion.kind === 'line' && criterion.line) {
    return (
      <View style={styles.center}>
        <LineBadge line={criterion.line} size={Math.min(46, size * 0.52)} />
      </View>
    );
  }
  if (criterion.lines) {
    return (
      <View style={[styles.card, styles.groupCard]}>
        <Text
          style={[styles.text, styles.groupText, { fontSize: fitFont(criterion.label, size, 12) }]}
          numberOfLines={3}
        >
          {criterion.label}
        </Text>
        <View style={styles.groupBadges}>
          {criterion.lines.map((l) => (
            <LineBadge key={l} line={l} size={Math.min(20, size * 0.2)} />
          ))}
        </View>
      </View>
    );
  }
  const { bg, fg } = kindColors[criterion.kind as keyof typeof kindColors];
  if (criterion.near) {
    return (
      <View style={[styles.card, { backgroundColor: bg }]}>
        <Text style={[styles.nearKm, { color: fg }]} numberOfLines={2}>à moins de {String(criterion.near.km).replace('.', ',')} km</Text>
        <Text
          style={[styles.text, { color: fg, fontSize: fitFont(criterion.near.place, size) }]}
          numberOfLines={3}
        >
          {criterion.near.place}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg, fontSize: fitFont(criterion.label, size) }]} numberOfLines={4}>
        {criterion.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flex: 1,
    alignSelf: 'stretch',
    margin: 5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  text: { fontFamily: fonts.heavy, fontSize: 13, textAlign: 'center' },
  groupCard: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.ink, gap: 5 },
  groupText: { color: colors.ink },
  groupBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  nearKm: { fontFamily: fonts.bold, fontSize: 10, marginBottom: 2, opacity: 0.9, textAlign: 'center' },
});
