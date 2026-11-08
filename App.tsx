import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Grid } from './src/components/Grid';
import { InfoModal, infoStyles } from './src/components/InfoModal';
import { LineBadge } from './src/components/LineBadge';
import { SearchModal } from './src/components/SearchModal';
import { dailyNumber, dailySeed, generatePuzzle, todayKey } from './src/game/generator';
import { STATION_BY_ID } from './src/game/lookup';
import {
  EMPTY_STATS,
  hasSeenHelp,
  loadDaily,
  loadStats,
  markHelpSeen,
  recordDaily,
  saveDaily,
  type Stats,
} from './src/game/storage';
import type { Criterion, LineId, Station } from './src/game/types';
import { colors } from './src/theme';

const MAX_GUESSES = 9;
type Mode = 'daily' | 'free';
type Cell = { row: number; col: number };

const emptyCells = () => [0, 1, 2].map(() => [null, null, null] as (string | null)[]);

function yesterdayKey(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const { width } = useWindowDimensions();
  const [day] = useState(todayKey);
  const [mode, setMode] = useState<Mode>('daily');
  const [freeSeed, setFreeSeed] = useState(() => `libre-${Date.now()}`);
  const puzzle = useMemo(
    () => generatePuzzle(mode === 'daily' ? dailySeed(day) : freeSeed),
    [mode, day, freeSeed],
  );

  const [cells, setCells] = useState(emptyCells);
  const [guessesLeft, setGuessesLeft] = useState(MAX_GUESSES);
  const [finished, setFinished] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  const [active, setActive] = useState<Cell | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [answersFor, setAnswersFor] = useState<Cell | null>(null);
  const [criterionInfo, setCriterionInfo] = useState<Criterion | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Chargement de la grille du jour sauvegardée et des statistiques.
  useEffect(() => {
    (async () => {
      const [saved, s, seen] = await Promise.all([loadDaily(day), loadStats(), hasSeenHelp()]);
      if (saved) {
        setCells(saved.cells);
        setGuessesLeft(saved.guessesLeft);
        setFinished(saved.finished);
      }
      setStats(s);
      setShowHelp(!seen);
      setLoaded(true);
    })();
  }, [day]);

  const usedIds = useMemo(() => new Set(cells.flat().filter((c): c is string => !!c)), [cells]);
  const found = usedIds.size;

  const finish = useCallback(
    async (finalCells: (string | null)[][], left: number) => {
      setFinished(true);
      if (mode === 'daily') {
        await saveDaily(day, { cells: finalCells, guessesLeft: left, finished: true });
        const count = finalCells.flat().filter(Boolean).length;
        setStats(await recordDaily(day, count, yesterdayKey(day)));
      }
      setTimeout(() => setShowResult(true), 400);
    },
    [mode, day],
  );

  const submit = (station: Station) => {
    if (!active || finished || usedIds.has(station.id)) return;
    const { row, col } = active;
    const left = guessesLeft - 1;
    const correct = puzzle.answers[row][col].includes(station.id);
    const next = correct
      ? cells.map((r, i) => r.map((c, j) => (i === row && j === col ? station.id : c)))
      : cells;
    setGuessesLeft(left);
    if (correct) {
      setCells(next);
      setActive(null);
      setFeedback(null);
    } else {
      setFeedback(`« ${station.name} » ne remplit pas les deux critères.`);
    }
    const complete = next.flat().every(Boolean);
    if (complete || left === 0) {
      setActive(null);
      finish(next, left);
    } else if (mode === 'daily') {
      saveDaily(day, { cells: next, guessesLeft: left, finished: false });
    }
  };

  const startFree = () => {
    setMode('free');
    setFreeSeed(`libre-${Date.now()}`);
    setCells(emptyCells());
    setGuessesLeft(MAX_GUESSES);
    setFinished(false);
    setShowResult(false);
  };

  const backToDaily = async () => {
    const saved = await loadDaily(day);
    setMode('daily');
    setCells(saved?.cells ?? emptyCells());
    setGuessesLeft(saved?.guessesLeft ?? MAX_GUESSES);
    setFinished(saved?.finished ?? false);
    setShowResult(false);
  };

  const giveUp = () => {
    setGuessesLeft(0);
    finish(cells, 0);
  };

  const share = () => {
    const grid = cells.map((r) => r.map((c) => (c ? '🟩' : '⬜')).join('')).join('\n');
    const title =
      mode === 'daily' ? `Terminus Paris n°${dailyNumber(day)}` : 'Terminus Paris (partie libre)';
    Share.share({ message: `${title} : ${found}/9\n${grid}` });
  };

  const gridWidth = Math.min(width - 24, 480);
  const activeRow = active ? puzzle.rows[active.row] : undefined;
  const activeCol = active ? puzzle.cols[active.col] : undefined;

  if (!loaded) return <View style={styles.screen} />;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Terminus Paris</Text>
            <Text style={styles.subtitle}>
              {mode === 'daily' ? `Grille n°${dailyNumber(day)} · ${formatDay(day)}` : 'Partie libre'}
            </Text>
          </View>
          <Pressable onPress={() => setShowHelp(true)} style={styles.helpButton} accessibilityLabel="Règles du jeu">
            <Text style={styles.helpText}>?</Text>
          </Pressable>
        </View>

        <Grid
          puzzle={puzzle}
          cells={cells}
          finished={finished}
          width={gridWidth}
          onPressCell={(row, col) => {
            if (finished) setAnswersFor({ row, col });
            else {
              setFeedback(null);
              setActive({ row, col });
            }
          }}
          onPressCriterion={(row, col) =>
            setCriterionInfo(row !== null ? puzzle.rows[row] : puzzle.cols[col as number])
          }
        />

        <View style={styles.status}>
          <Text style={styles.statusText}>
            {finished ? `Terminé : ${found}/9` : `Essais restants : ${guessesLeft}`}
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: MAX_GUESSES }, (_, i) => (
              <View key={i} style={[styles.dot, i < guessesLeft && styles.dotOn]} />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {finished ? (
            <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
          ) : (
            <Button label="Abandonner" onPress={giveUp} />
          )}
          {mode === 'daily' ? (
            <Button label="Partie libre" onPress={startFree} />
          ) : (
            <>
              <Button label="Nouvelle grille" onPress={startFree} />
              <Button label="Grille du jour" onPress={backToDaily} />
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.
        </Text>
      </ScrollView>

      <SearchModal
        visible={!!active}
        row={activeRow}
        col={activeCol}
        usedIds={usedIds}
        guessesLeft={guessesLeft}
        feedback={feedback}
        onSubmit={submit}
        onClose={() => setActive(null)}
      />

      <InfoModal visible={!!criterionInfo} title={criterionInfo?.label ?? ''} onClose={() => setCriterionInfo(null)}>
        <Text style={infoStyles.p}>{criterionInfo?.description}</Text>
      </InfoModal>

      <InfoModal
        visible={!!answersFor}
        title="Réponses possibles"
        onClose={() => setAnswersFor(null)}
      >
        {answersFor && (
          <>
            <Text style={infoStyles.small}>
              {puzzle.rows[answersFor.row].label} × {puzzle.cols[answersFor.col].label}
            </Text>
            {puzzle.answers[answersFor.row][answersFor.col].map((id) => {
              const s = STATION_BY_ID.get(id)!;
              return (
                <View key={id} style={styles.answer}>
                  <Text style={[styles.answerName, cells[answersFor.row][answersFor.col] === id && styles.answerMine]}>
                    {s.name}
                  </Text>
                  <View style={styles.answerLines}>
                    {s.lines.map((l) => (
                      <LineBadge key={l} line={l as LineId} size={18} />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </InfoModal>

      <InfoModal
        visible={showResult}
        title={found === 9 ? 'Grille parfaite !' : found >= 6 ? 'Bien joué !' : 'Fin de partie'}
        onClose={() => setShowResult(false)}
        footer={<Button label="Partager mon résultat" onPress={share} primary />}
      >
        <Text style={styles.bigScore}>{found}/9</Text>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          Touche une case de la grille pour voir toutes les réponses possibles.
        </Text>
        {mode === 'daily' && (
          <View style={styles.stats}>
            <Stat value={stats.played} label="Grilles" />
            <Stat value={stats.perfect} label="Parfaites" />
            <Stat value={stats.streak} label="Série" />
            <Stat value={stats.bestStreak} label="Record" />
          </View>
        )}
      </InfoModal>

      <InfoModal
        visible={showHelp}
        title="Comment jouer"
        onClose={() => {
          setShowHelp(false);
          markHelpSeen();
        }}
      >
        <Text style={infoStyles.p}>
          Remplis la grille avec <Text style={infoStyles.strong}>9 stations de métro parisiennes</Text>.
        </Text>
        <Text style={infoStyles.p}>
          Chaque case doit recevoir une station qui respecte à la fois le critère de sa ligne et celui de sa colonne.
          Par exemple : une station de la ligne 4 située dans le 6e arrondissement.
        </Text>
        <Text style={infoStyles.p}>
          Tu as <Text style={infoStyles.strong}>9 essais</Text> et chaque station ne peut servir qu'une fois.
          Touche un critère pour lire sa définition exacte.
        </Text>
        <Text style={infoStyles.p}>
          Une nouvelle grille t'attend chaque jour. En partie libre, tu peux enchaîner autant de grilles que tu veux.
        </Text>
        <Text style={infoStyles.small}>
          Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités. Données des stations : Wikidata
          (licence CC0). Les lignes en projet ne sont pas incluses.
        </Text>
      </InfoModal>
    </SafeAreaView>
  );
}

function Button({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', paddingHorizontal: 12, paddingBottom: 32 },
  header: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  status: { alignItems: 'center', marginTop: 16 },
  statusText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.accent },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  buttonPrimary: { backgroundColor: colors.ink, alignSelf: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  buttonTextPrimary: { color: '#fff' },
  disclaimer: { fontSize: 11, color: colors.muted, marginTop: 24, textAlign: 'center' },
  bigScore: { fontSize: 56, fontWeight: '900', color: colors.accent, textAlign: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  answerName: { fontSize: 15, color: colors.ink, flexShrink: 1 },
  answerMine: { fontWeight: '800', color: colors.accent },
  answerLines: { flexDirection: 'row', gap: 3 },
});
