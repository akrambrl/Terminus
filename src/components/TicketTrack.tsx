import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, palette } from '../theme';

/**
 * Les erreurs possibles, dessinées comme des tickets de métro.
 * Chaque erreur composte (barre) un ticket.
 */
export function TicketTrack({ total, used, maxWidth }: { total: number; used: number; maxWidth?: number }) {
  // Avec beaucoup de tickets (pendu : 5), ils rétrécissent pour tenir sur une ligne.
  const gap = total > 3 ? 8 : 12;
  const w = maxWidth ? Math.min(W, Math.floor((maxWidth - gap * (total - 1)) / total)) : W;
  const narrow = w < 70;
  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`${total - used} erreurs possibles sur ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const punched = i >= total - used;
        return (
          <View key={i} style={[styles.ticket, { width: w }, punched && styles.ticketPunched]}>
            <View style={[styles.stripe, punched && styles.stripePunched]} />
            <Text style={[styles.label, narrow && styles.labelNarrow, punched && styles.labelPunched]}>TICKET</Text>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={[styles.notch, styles.notchRight]} />
            {punched && <View style={[styles.cross, { width: w * 1.1 }]} />}
          </View>
        );
      })}
    </View>
  );
}

const W = 82;
const H = 44;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  ticket: {
    width: W,
    height: H,
    borderRadius: 7,
    backgroundColor: '#FFF7DF',
    borderWidth: 2,
    borderColor: colors.ink,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketPunched: { backgroundColor: colors.missed, borderColor: colors.border },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 7, height: 7, backgroundColor: palette.violet },
  stripePunched: { backgroundColor: colors.border },
  label: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 2, color: colors.ink, marginBottom: 8 },
  labelNarrow: { fontSize: 10, letterSpacing: 1 },
  labelPunched: { color: colors.muted },
  notch: {
    position: 'absolute',
    top: H / 2 - 7,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  notchLeft: { left: -7 },
  notchRight: { right: -7 },
  cross: {
    position: 'absolute',
    width: W * 1.1,
    height: 3,
    backgroundColor: colors.danger,
    transform: [{ rotate: '-24deg' }],
  },
});
