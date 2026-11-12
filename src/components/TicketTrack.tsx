import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, ui } from '../theme';

/**
 * Les erreurs possibles, dessinées comme des tickets (charte) : crème, bordure bleu nuit,
 * « TICKET » espacé, bande violette en bas, légère inclinaison. Ticket perdu : estompé et barré de tomate.
 */
const W = 82;
const H = 44;
const TILT = [-3, 2, -2, 3, -2];

export function TicketTrack({
  total,
  used,
  maxWidth,
  compact,
}: {
  total: number;
  used: number;
  maxWidth?: number;
  /** Petits écrans : tickets moins hauts. */
  compact?: boolean;
}) {
  const h = compact ? H * 0.75 : H;
  // Avec beaucoup de tickets (pendu : 5), ils rétrécissent pour tenir sur une ligne.
  const gap = total > 3 ? 8 : 12;
  const w = maxWidth ? Math.min(W, Math.floor((maxWidth - gap * (total - 1)) / total)) : W;
  const narrow = w < 70;
  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`${total - used} erreurs possibles sur ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const punched = i >= total - used;
        return (
          <View
            key={i}
            style={[
              styles.ticket,
              { width: w, height: h, borderRadius: ui.radiusFor(h) * 0.6, transform: [{ rotate: `${TILT[i % TILT.length]}deg` }] },
              punched && styles.ticketPunched,
            ]}
          >
            <View style={[styles.stripe, punched && styles.faded]} />
            <Text style={[styles.label, narrow && styles.labelNarrow, compact && { marginBottom: 4 }, punched && styles.faded]}>TICKET</Text>
            {punched && <View style={[styles.cross, { width: w * 1.1 }]} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  ticket: {
    backgroundColor: colors.cream,
    borderWidth: ui.border,
    borderColor: colors.ink,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketPunched: { backgroundColor: colors.missed, borderColor: colors.plus },
  faded: { opacity: 0.35 },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: colors.violet },
  label: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 11 * 0.2, color: colors.ink, marginBottom: 6 },
  labelNarrow: { fontSize: 10, letterSpacing: 1 },
  cross: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.danger,
    transform: [{ rotate: '-24deg' }],
  },
});
