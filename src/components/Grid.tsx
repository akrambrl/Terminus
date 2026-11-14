import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STATION_BY_ID } from '../game/lookup';
import type { Criterion, LineId, Puzzle, Station } from '../game/types';
import { solidShadow } from '../design/ui';
import { colors, fonts, lineColors, ui } from '../theme';
import { CriterionLabel } from './CriterionLabel';
import { GridMark } from './Logo';
import { LineBadge } from './LineBadge';
import { stationPoints } from '../game/points';

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

/**
 * Taille du nom de la station : le mot le plus long tient sur une ligne de la case, et le nom sur
 * 3 lignes au plus (adjustsFontSizeToFit n'existe pas sur le web).
 */
function nameFont(name: string, size: number) {
  const inner = size - 8 - 10;
  const longest = Math.max(...name.split(/[\s-]+/).map((w) => w.length));
  // Noms longs (« Palais Royal - Musée du Louvre ») : un peu plus petits pour tenir avec les points et les pastilles.
  const max = name.length > 22 ? 10 : name.length > 15 ? 11 : 12;
  const fontSize = Math.max(8.5, Math.min(max, Math.floor((inner / (longest * 0.62)) * 2) / 2));
  return { fontSize, lineHeight: Math.round(fontSize * 1.15) };
}

export function Grid({ puzzle, cells, finished, width, onPressCell, onPressCriterion }: Props) {
  // La grille est posée dans une carte blanche à bordure bleu nuit et ombre pleine (charte).
  const pad = ui.space.s;
  const size = Math.floor((width - 2 * (pad + ui.border)) / 4);
  const radius = ui.radiusFor(size - 8);
  return (
    <View style={[styles.board, solidShadow(), { padding: pad }]}>
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
                  { width: size - 8, height: size - 8, borderRadius: radius },
                  !station && !finished && solidShadow(colors.border, 3),
                  tint && { backgroundColor: tint.bg, borderColor: tint.bg },
                  !station && finished && styles.cellMissed,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={station ? station.name : `Case vide : ${r.label} et ${c.label}`}
              >
                {station && tint ? (
                  <>
                    {/* Points gagnés : plus la station est peu fréquentée, plus elle rapporte. */}
                    <View style={[styles.points, { backgroundColor: tint.fg }]}>
                      <Text style={[styles.pointsText, { color: tint.bg }]}>+{stationPoints(station.id)}</Text>
                    </View>
                    <Text
                      style={[styles.stationName, { color: tint.fg, ...nameFont(station.name, size) }]}
                      numberOfLines={3}
                      adjustsFontSizeToFit
                    >
                      {station.name}
                    </Text>
                    <View style={styles.badges}>
                      {station.lines.slice(0, 4).map((l) => (
                        <LineBadge key={l} line={l as LineId} size={Math.max(13, Math.min(17, size * 0.17))} ring />
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
  board: {
    backgroundColor: colors.surface,
    borderWidth: ui.border,
    borderColor: colors.ink,
    borderRadius: ui.radiusCard,
  },
  row: { flexDirection: 'row' },
  corner: { alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  cell: {
    margin: 4,
    backgroundColor: colors.surface,
    borderWidth: ui.borderThin,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cellMissed: { backgroundColor: colors.missed, borderColor: colors.missed },
  plus: { fontSize: 28, color: colors.plus, fontFamily: fonts.heavy },
  stationName: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 14, textAlign: 'center' },
  // Pastille des points posée au-dessus du nom (dans le flux) : elle ne cache plus jamais le nom.
  points: { borderRadius: ui.radiusPill, paddingHorizontal: 5, paddingVertical: 1, marginBottom: 2 },
  pointsText: { fontFamily: fonts.heavy, fontSize: 9 },
  badges: { flexDirection: 'row', gap: 2, marginTop: 4 },
  missedText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  missedCount: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
});
