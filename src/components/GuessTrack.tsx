import { StyleSheet, View } from 'react-native';
import { colors, palette } from '../theme';

/** Les essais restants dessinés comme les stations d'une ligne : un trait et 9 arrêts. */
export function GuessTrack({ total, left, width }: { total: number; left: number; width: number }) {
  return (
    <View style={[styles.track, { width }]} accessibilityLabel={`${left} essais restants sur ${total}`}>
      <View style={[styles.rail, { width: width - STOP }]}>
        <View style={styles.line} />
        <View style={[styles.lineDone, { width: ((width - STOP) * (total - left)) / (total - 1) }]} />
      </View>
      <View style={styles.stops}>
        {Array.from({ length: total }, (_, i) => {
          const used = i < total - left;
          return <View key={i} style={[styles.stop, used ? styles.stopUsed : styles.stopLeft]} />;
        })}
      </View>
    </View>
  );
}

const STOP = 18;
const styles = StyleSheet.create({
  track: { height: STOP, justifyContent: 'center' },
  rail: { position: 'absolute', left: STOP / 2, height: 6, overflow: 'hidden', borderRadius: 3 },
  line: { height: 6, borderRadius: 3, backgroundColor: palette.ultramarine },
  lineDone: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.border },
  stops: { flexDirection: 'row', justifyContent: 'space-between' },
  stop: { width: STOP, height: STOP, borderRadius: STOP / 2, borderWidth: 4 },
  stopLeft: { backgroundColor: '#FFFFFF', borderColor: colors.ink },
  stopUsed: { backgroundColor: colors.missed, borderColor: colors.border },
});
