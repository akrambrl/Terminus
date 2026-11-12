import { StyleSheet, Text, View } from 'react-native';
import { PillButton } from '../design/ui';
import { colors, fonts, ui } from '../theme';
import { Coin } from './CoinPill';

/** Bouton du jeu : pilule de la charte (bordure bleu nuit, ombre pleine), commun aux trois modes. */
export function Button({
  label,
  onPress,
  primary,
  tone,
  coin,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  tone?: 'danger';
  /** Affiche une pièce après le libellé (action payante en pièces). */
  coin?: boolean;
}) {
  return (
    <PillButton
      label={label}
      onPress={onPress}
      tone={primary ? 'primary' : tone === 'danger' ? 'danger' : 'secondary'}
      icon={coin ? <Coin size={16} /> : undefined}
    />
  );
}

export function Stat({ value, label, light }: { value: number; label: string; light?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, light && { color: colors.white }]}>{value}</Text>
      <Text style={[styles.statLabel, light && { color: colors.white }]}>{label}</Text>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  bigScore: { fontSize: 64, fontFamily: fonts.display, color: colors.accent, textAlign: 'center', letterSpacing: -1.3 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: ui.space.m },
  status: { marginTop: ui.space.m, gap: ui.space.m },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.8 },
  statusValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: ui.space.l, marginTop: ui.space.l },
  rer: {
    fontFamily: fonts.heavy,
    fontSize: 10,
    color: colors.white,
    backgroundColor: colors.ink,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  unofficial: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: ui.space.m },
});

const styles = StyleSheet.create({
  stat: { alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: fonts.display, color: colors.ink },
  statLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.muted },
});
