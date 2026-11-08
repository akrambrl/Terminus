import { StyleSheet, Text, View } from 'react-native';
import type { Criterion } from '../game/types';
import { colors } from '../theme';
import { LineBadge } from './LineBadge';

export function CriterionLabel({ criterion, size }: { criterion: Criterion; size: number }) {
  if (criterion.kind === 'line' && criterion.line) {
    return (
      <View style={styles.center}>
        <LineBadge line={criterion.line} size={Math.min(44, size * 0.5)} />
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <Text style={styles.text} numberOfLines={3} adjustsFontSizeToFit>
        {criterion.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  text: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
