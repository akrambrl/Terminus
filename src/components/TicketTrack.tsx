import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, palette } from '../theme';

/**
 * Les erreurs possibles, dessinées comme des tickets de métro.
 * Chaque erreur composte (barre) un ticket.
 */
export function TicketTrack({ total, used }: { total: number; used: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${total - used} erreurs possibles sur ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const punched = i >= total - used;
        return (
          <View key={i} style={[styles.ticket, punched && styles.ticketPunched]}>
            <View style={[styles.stripe, punched && styles.stripePunched]} />
            <Text style={[styles.label, punched && styles.labelPunched]}>TICKET</Text>
            <View style={[styles.notch, styles.notchLeft]} />
            <View style={[styles.notch, styles.notchRight]} />
            {punched && <View style={styles.cross} />}
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
