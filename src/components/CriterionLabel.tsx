import { StyleSheet, Text, View } from 'react-native';
import type { Criterion } from '../game/types';
import { colors, fonts, kindColors, textOn, ui } from '../theme';
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

/**
 * Case critère de la charte :
 * - ligne : case blanche, bordure bleu nuit, « Ligne » au-dessus de la pastille ;
 * - texte : case pleine colorée, texte centré (blanc ou bleu nuit selon la règle de contraste).
 */
export function CriterionLabel({ criterion, size, height = size }: { criterion: Criterion; size: number; height?: number }) {
  const radius = ui.radiusFor(Math.min(size, height));
  if (criterion.kind === 'line' && criterion.line) {
    return (
      <View style={[styles.card, styles.white, { borderRadius: radius }]}>
        <Text style={[styles.lineWord, { fontSize: Math.max(9, Math.min(14, size * 0.15)) }]}>Ligne</Text>
        <LineBadge line={criterion.line} size={Math.min(44, size * 0.42, height * 0.42)} />
      </View>
    );
  }
  if (criterion.lines) {
    return (
      <View style={[styles.card, styles.white, { borderRadius: radius, gap: 4 }]}>
        <Text
          style={[styles.text, { color: colors.ink, fontSize: fitFont(criterion.label, size, 12) }]}
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
  const { bg } = kindColors[criterion.kind as keyof typeof kindColors];
  if (criterion.near) {
    const font = fitFont(criterion.near.place, size);
    return (
      <View style={[styles.card, { backgroundColor: bg, borderRadius: radius }]}>
        <Text style={[styles.nearKm, { color: textOn(bg, 10) }]} numberOfLines={2}>
          à moins de {String(criterion.near.km).replace('.', ',')} km
        </Text>
        <Text style={[styles.text, { color: textOn(bg, font), fontSize: font }]} numberOfLines={3}>
          {criterion.near.place}
        </Text>
      </View>
    );
  }
  const font = fitFont(criterion.label, size);
  return (
    <View style={[styles.card, { backgroundColor: bg, borderRadius: radius }]}>
      <Text style={[styles.text, { color: textOn(bg, font), fontSize: font }]} numberOfLines={4}>
        {criterion.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignSelf: 'stretch',
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  white: { backgroundColor: colors.surface, borderWidth: ui.border, borderColor: colors.ink },
  lineWord: { fontFamily: fonts.heavy, color: colors.ink, marginBottom: 3 },
  text: { fontFamily: fonts.heavy, fontSize: 13, textAlign: 'center' },
  groupBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  nearKm: { fontFamily: fonts.bold, fontSize: 10, marginBottom: 2, textAlign: 'center' },
});
