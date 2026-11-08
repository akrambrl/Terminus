import { StyleSheet, Text, View } from 'react-native';
import type { Criterion } from '../game/types';
import { colors, fonts, kindColors } from '../theme';
import { LineBadge } from './LineBadge';

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
        <Text style={[styles.text, styles.groupText]} numberOfLines={2} adjustsFontSizeToFit>
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
        <Text style={[styles.text, { color: fg }]} numberOfLines={2} adjustsFontSizeToFit>
          {criterion.near.place}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={3} adjustsFontSizeToFit>
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
  text: { fontFamily: fonts.heavy, fontSize: 13, lineHeight: 16, textAlign: 'center' },
  groupCard: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.ink, gap: 5 },
  groupText: { color: colors.ink, fontSize: 12, lineHeight: 15 },
  groupBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  nearKm: { fontFamily: fonts.bold, fontSize: 10, marginBottom: 2, opacity: 0.9, textAlign: 'center' },
});
