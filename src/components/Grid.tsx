import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STATION_BY_ID } from '../game/lookup';
import type { Criterion, LineId, Puzzle, Station } from '../game/types';
import { colors, fonts, lineColors, palette } from '../theme';
import { CriterionLabel } from './CriterionLabel';
import { GridMark } from './Logo';
import { LineBadge } from './LineBadge';

interface Props {
  puzzle: Puzzle;
  cells: (string | null)[][];
  finished: boolean;
  width: number;
  onPressCell: (row: number, col: number) => void;
  onPressCriterion: (row: number | null, col: number | null) => void;
}

/** Une case trouvée prend la couleur de la ligne demandée, sinon de la première ligne de la station. */
function cellLine(station: Station, row: Criterion, col: Criterion): LineId {
  const wanted = row.line ?? col.line;
  if (wanted) return wanted;
  const group = row.lines ?? col.lines;
  const inGroup = group && station.lines.find((l) => (group as string[]).includes(l));
  return (inGroup ?? station.lines[0]) as LineId;
}

export function Grid({ puzzle, cells, finished, width, onPressCell, onPressCriterion }: Props) {
  const size = Math.floor(width / 4);
  return (
    <View style={{ width: size * 4 }}>
      <View style={styles.row}>
        <View style={[styles.corner, { width: size, height: size }]}>
          <GridMark size={size * 0.5} />
        </View>
        {puzzle.cols.map((c, j) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [styles.header, { width: size, height: size }, pressed && styles.pressed]}
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
            style={({ pressed }) => [styles.header, { width: size, height: size }, pressed && styles.pressed]}
            onPress={() => onPressCriterion(i, null)}
            accessibilityLabel={`Ligne : ${r.label}`}
          >
            <CriterionLabel criterion={r} size={size} />
          </Pressable>
          {puzzle.cols.map((c, j) => {
            const id = cells[i][j];
            const station = id ? STATION_BY_ID.get(id) : undefined;
            const tint = station ? lineColors[cellLine(station, r, c)] : null;
            const total = puzzle.answers[i][j].length;
            return (
              <Pressable
                key={c.id}
                disabled={!finished && !!station}
                onPress={() => onPressCell(i, j)}
                style={({ pressed }) => [
                  styles.cell,
                  { width: size - 6, height: size - 6 },
                  tint && { backgroundColor: tint.bg, borderColor: tint.bg },
                  !station && finished && styles.cellMissed,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={station ? station.name : `Case vide : ${r.label} et ${c.label}`}
              >
                {station && tint ? (
                  <>
                    <Text
                      style={[styles.stationName, { color: tint.fg }]}
                      numberOfLines={3}
                      adjustsFontSizeToFit
                    >
                      {station.name}
                    </Text>
                    <View style={styles.badges}>
                      {station.lines.slice(0, 4).map((l) => (
                        <View key={l} style={styles.badgeRing}>
                          <LineBadge line={l as LineId} size={14} />
                        </View>
                      ))}
                    </View>
                  </>
                ) : finished ? (
                  <Text style={styles.missedText}>
                    <Text style={styles.missedCount}>{total}</Text>
                    {'\n'}réponses
                  </Text>
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
  corner: { alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  cell: {
    margin: 3,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellMissed: { backgroundColor: colors.missed, borderColor: colors.missed },
  plus: { fontSize: 30, color: palette.ultramarine, fontFamily: fonts.display, opacity: 0.35 },
  stationName: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 14, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: 2, marginTop: 4 },
  badgeRing: { borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  missedText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  missedCount: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
});
