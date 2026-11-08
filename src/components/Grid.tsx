import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STATION_BY_ID } from '../game/lookup';
import type { Puzzle } from '../game/types';
import { colors } from '../theme';
import { CriterionLabel } from './CriterionLabel';
import { LineBadge } from './LineBadge';
import type { LineId } from '../game/types';

interface Props {
  puzzle: Puzzle;
  cells: (string | null)[][];
  finished: boolean;
  width: number;
  onPressCell: (row: number, col: number) => void;
  onPressCriterion: (row: number | null, col: number | null) => void;
}

export function Grid({ puzzle, cells, finished, width, onPressCell, onPressCriterion }: Props) {
  const size = Math.floor(width / 4);
  return (
    <View style={{ width: size * 4 }}>
      <View style={styles.row}>
        <View style={[styles.corner, { width: size, height: size }]}>
          <Text style={styles.cornerText}>TERMINUS</Text>
          <Text style={styles.cornerSub}>PARIS</Text>
        </View>
        {puzzle.cols.map((c, j) => (
          <Pressable
            key={c.id}
            style={[styles.header, { width: size, height: size }]}
            onPress={() => onPressCriterion(null, j)}
            accessibilityLabel={`Colonne : ${c.label}`}
          >
            <CriterionLabel criterion={c} size={size} />
          </Pressable>
        ))}
      </View>
      {puzzle.rows.map((r, i) => (
        <View key={r.id} style={styles.row}>
          <Pressable
            style={[styles.header, { width: size, height: size }]}
            onPress={() => onPressCriterion(i, null)}
            accessibilityLabel={`Ligne : ${r.label}`}
          >
            <CriterionLabel criterion={r} size={size} />
          </Pressable>
          {puzzle.cols.map((c, j) => {
            const id = cells[i][j];
            const station = id ? STATION_BY_ID.get(id) : undefined;
            const total = puzzle.answers[i][j].length;
            return (
              <Pressable
                key={c.id}
                disabled={!finished && !!station}
                onPress={() => onPressCell(i, j)}
                style={({ pressed }) => [
                  styles.cell,
                  { width: size - 4, height: size - 4 },
                  station && styles.cellFound,
                  !station && finished && styles.cellMissed,
                  pressed && styles.cellPressed,
                ]}
                accessibilityLabel={
                  station ? station.name : `Case vide : ${r.label} et ${c.label}`
                }
              >
                {station ? (
                  <>
                    <Text style={styles.stationName} numberOfLines={3} adjustsFontSizeToFit>
                      {station.name}
                    </Text>
                    <View style={styles.badges}>
                      {station.lines.slice(0, 4).map((l) => (
                        <LineBadge key={l} line={l as LineId} size={14} />
                      ))}
                    </View>
                  </>
                ) : finished ? (
                  <Text style={styles.missedText}>{total} réponses possibles</Text>
                ) : (
                  <Text style={styles.plus}>+</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  corner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
    transform: [{ scale: 0.92 }],
  },
  cornerText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  cornerSub: { color: colors.gold, fontWeight: '800', fontSize: 11, letterSpacing: 3 },
  header: { alignItems: 'center', justifyContent: 'center' },
  cell: {
    margin: 2,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellPressed: { backgroundColor: colors.accentSoft },
  cellFound: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  cellMissed: { backgroundColor: '#ECE8DF' },
  plus: { fontSize: 26, color: colors.border, fontWeight: '300' },
  stationName: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  badges: { flexDirection: 'row', gap: 2, marginTop: 4 },
  missedText: { color: colors.muted, fontSize: 10, textAlign: 'center' },
});
