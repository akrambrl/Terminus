import { StyleSheet, Text, View } from 'react-native';
import type { Criterion } from '../game/types';
import { fonts, kindColors } from '../theme';
import { LineBadge } from './LineBadge';

export function CriterionLabel({ criterion, size }: { criterion: Criterion; size: number }) {
  if (criterion.kind === 'line' && criterion.line) {
    return (
      <View style={styles.center}>
        <LineBadge line={criterion.line} size={Math.min(46, size * 0.52)} />
      </View>
    );
  }
  const { bg, fg } = kindColors[criterion.kind as keyof typeof kindColors];
  if (criterion.near) {
    return (
      <View style={[styles.card, { backgroundColor: bg }]}>
        <Text style={[styles.nearKm, { color: fg }]}>à moins de {String(criterion.near.km).replace('.', ',')} km</Text>
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
  nearKm: { fontFamily: fonts.bold, fontSize: 11, marginBottom: 2, opacity: 0.9 },
});
