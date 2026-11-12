import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, palette } from '../theme';
import { Coin } from './CoinPill';

/** Bouton du jeu (bord épais façon « touche »), commun aux trois modes. */
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.buttonPrimary,
        tone === 'danger' && styles.buttonDanger,
        pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          primary && styles.buttonTextPrimary,
          tone === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
      {coin && <Coin size={16} />}
    </Pressable>
  );
}

export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  bigScore: { fontSize: 64, fontFamily: fonts.display, color: palette.ultramarine, textAlign: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  ticketMain: { fontFamily: fonts.display, fontSize: 17, color: '#FFFFFF' },
  ticketSub: { fontFamily: fonts.bold, fontSize: 12, color: palette.sun, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  status: { marginTop: 8, gap: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 14 },
  rer: {
    fontFamily: fonts.heavy,
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: colors.ink,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  unofficial: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 10 },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  buttonPrimary: { backgroundColor: palette.ultramarine, borderColor: colors.ink, alignSelf: 'center' },
  buttonDanger: { borderColor: colors.danger },
  buttonText: { fontSize: 15, fontFamily: fonts.heavy, color: colors.ink },
  buttonTextPrimary: { color: '#fff' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: fonts.display, color: colors.ink },
  statLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.muted },
});
