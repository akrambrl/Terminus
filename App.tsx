import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Grid } from './src/components/Grid';
import { InfoModal, infoStyles } from './src/components/InfoModal';
import { LineBadge } from './src/components/LineBadge';
import { SearchModal } from './src/components/SearchModal';
import { dailyNumber, dailySeed, generatePuzzle, puzzleSignature, todayKey } from './src/game/generator';
import { STATION_BY_ID } from './src/game/lookup';
import {
  EMPTY_STATS,
  hasSeenHelp,
  loadDaily,
  loadStats,
  markHelpSeen,
  recordDaily,
  saveDaily,
  loadFreeGame,
  saveFreeGame,
  type SavedFreeGame,
  type Stats,
} from './src/game/storage';
import type { Criterion, LineId, Station } from './src/game/types';
import { colors, fonts, palette, WEB_TOP_GAP } from './src/theme';
import { APP_VERSION } from './src/version';
import { track } from './src/analytics';
import { openPrivacyChoices, startConsent } from './src/privacy/consent';
import { StatsBanner } from './src/privacy/StatsBanner';
import { CONTACT_EMAIL, PRIVACY_URL } from './src/privacy/links';
import { StoreBanner } from './src/store/StoreBanner';
import { WEB_URL } from './src/store/links';
import { onGameFinished } from './src/store/review';
import { Coin, CoinPill } from './src/components/CoinPill';
import {
  AD_REWARD,
  claimDailyBonus,
  DAILY_BONUS,
  grantAdReward,
  GRID_COST,
  MAX_COINS,
  spendCoins,
  type BonusResult,
} from './src/game/coins';
import { rewardedAdsAvailable, showRewardedAd } from './src/ads/rewarded';
import { TicketTrack } from './src/components/TicketTrack';
import { Logo } from './src/components/Logo';
import { Intro } from './src/components/Intro';
import { AdBanner } from './src/ads/AdBanner';
import { adsActive } from './src/ads/config';
import { useFonts } from 'expo-font';
// Import poids par poids pour n'embarquer que les fichiers de police utilisés.
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Figtree_800ExtraBold } from '@expo-google-fonts/figtree/800ExtraBold';

/** Erreurs permises par grille : les bonnes réponses ne coûtent rien. */
const MAX_ERRORS = 3;
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
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_800ExtraBold,
    Figtree_500Medium,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const [day] = useState(todayKey);
  const [mode, setMode] = useState<Mode>('daily');
  const [freeSeed, setFreeSeed] = useState(() => `libre-${Date.now()}`);
  const puzzle = useMemo(
    () => generatePuzzle(mode === 'daily' ? dailySeed(day) : freeSeed),
    [mode, day, freeSeed],
  );

  const [cells, setCells] = useState(emptyCells);
  const [errors, setErrors] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  const [active, setActive] = useState<Cell | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [answersFor, setAnswersFor] = useState<Cell | null>(null);
  const [criterionInfo, setCriterionInfo] = useState<Criterion | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [consentKey, setConsentKey] = useState(0);

  // Consentement (pub et statistiques) dès le lancement.
  useEffect(() => {
    startConsent();
  }, []);
  const [coins, setCoins] = useState(0);
  const [adsLeft, setAdsLeft] = useState(0);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusResult | null>(null);
  const [showNoCoins, setShowNoCoins] = useState(false);
  const [freeSaved, setFreeSaved] = useState<SavedFreeGame | null>(null);

  // Chargement de la grille du jour sauvegardée et des statistiques.
  useEffect(() => {
    (async () => {
      const [saved, s, seen, wallet, free] = await Promise.all([
        loadDaily(day),
        loadStats(),
        hasSeenHelp(),
        claimDailyBonus(day),
        loadFreeGame(),
      ]);
      setCoins(wallet.coins);
      setAdsLeft(wallet.adsLeft);
      // Les sauvegardes d'avant le système d'erreurs (9 essais) sont ignorées.
      setFreeSaved(free && typeof free.errors === 'number' ? free : null);
      if (wallet.granted > 0) {
        setBonus(wallet);
        track('coins_bonus', { granted: wallet.granted, welcome: wallet.welcome, coins: wallet.coins });
      }
      if (saved && typeof saved.errors === 'number' && saved.puzzle === puzzleSignature(generatePuzzle(dailySeed(day)))) {
        setCells(saved.cells);
        setErrors(saved.errors);
        setFinished(saved.finished);
      }
      setStats(s);
      setShowHelp(!seen);
      setLoaded(true);
      track('app_opened', { daily_number: dailyNumber(day), daily_finished: !!saved?.finished, returning: s.played > 0 });
    })();
  }, [day]);

  const usedIds = useMemo(() => new Set(cells.flat().filter((c): c is string => !!c)), [cells]);
  const found = usedIds.size;

  const finish = useCallback(
    async (finalCells: (string | null)[][], errorCount: number, gaveUp = false) => {
      setFinished(true);
      const foundCount = finalCells.flat().filter(Boolean).length;
      track('game_finished', { mode, found: foundCount, errors: errorCount, gave_up: gaveUp });
      onGameFinished(foundCount);
      if (mode === 'free') {
        const game = { seed: freeSeed, cells: finalCells, errors: errorCount, finished: true };
        setFreeSaved(game);
        saveFreeGame(game);
      }
      if (mode === 'daily') {
        await saveDaily(day, { puzzle: puzzleSignature(puzzle), cells: finalCells, errors: errorCount, finished: true });
        const count = finalCells.flat().filter(Boolean).length;
        setStats(await recordDaily(day, count, yesterdayKey(day)));
      }
      setTimeout(() => setShowResult(true), 400);
    },
    [mode, day, puzzle, freeSeed],
  );

  const submit = (station: Station) => {
    if (!active || finished || usedIds.has(station.id)) return;
    const { row, col } = active;
    const correct = puzzle.answers[row][col].includes(station.id);
    const nextErrors = correct ? errors : errors + 1;
    const firstGuess = errors === 0 && usedIds.size === 0;
    const next = correct
      ? cells.map((r, i) => r.map((c, j) => (i === row && j === col ? station.id : c)))
      : cells;
    setErrors(nextErrors);
    track('guess', {
      mode,
      correct,
      row: puzzle.rows[row].id,
      col: puzzle.cols[col].id,
      first_guess: firstGuess,
    });
    if (firstGuess) track('game_started', { mode });
    if (correct) {
      setCells(next);
      setActive(null);
      setFeedback(null);
    } else {
      const left = MAX_ERRORS - nextErrors;
      setFeedback(
        left > 0
          ? `« ${station.name} » ne remplit pas les deux critères. Encore ${left} erreur${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}.`
          : `« ${station.name} » ne remplit pas les deux critères.`,
      );
    }
    const complete = next.flat().every(Boolean);
    if (complete || nextErrors >= MAX_ERRORS) {
      setActive(null);
      finish(next, nextErrors);
    } else if (mode === 'daily') {
      saveDaily(day, { puzzle: puzzleSignature(puzzle), cells: next, errors: nextErrors, finished: false });
    } else {
      const game = { seed: freeSeed, cells: next, errors: nextErrors, finished: false };
      setFreeSaved(game);
      saveFreeGame(game);
    }
  };

  const showFreeGame = (game: SavedFreeGame) => {
    setMode('free');
    setFreeSeed(game.seed);
    setCells(game.cells);
    setErrors(game.errors);
    setFinished(game.finished);
    setShowResult(false);
  };

  /** Une grille payée et pas finie se reprend gratuitement. */
  const resumeOrBuyFree = () => {
    if (freeSaved && !freeSaved.finished) {
      track('free_game_resumed');
      showFreeGame(freeSaved);
    } else {
      buyFree();
    }
  };

  /** Achète une nouvelle grille avec des pièces (jamais avec de l'argent réel). */
  const buyFree = async () => {
    const paid = await spendCoins(GRID_COST, day);
    setCoins(paid.coins);
    setAdsLeft(paid.adsLeft);
    if (!paid.ok) {
      track('not_enough_coins', { coins: paid.coins });
      setShowNoCoins(true);
      return;
    }
    track('free_game_started', { cost: GRID_COST, coins_left: paid.coins });
    const game = { seed: `libre-${Date.now()}`, cells: emptyCells(), errors: 0, finished: false };
    setFreeSaved(game);
    saveFreeGame(game);
    showFreeGame(game);
  };

  /** Pub vidéo facultative : des pièces en échange d'une pub regardée jusqu'au bout. */
  const watchAd = async () => {
    setWatchingAd(true);
    setAdMessage(null);
    track('ad_reward_started', { coins });
    const earned = await showRewardedAd();
    setWatchingAd(false);
    if (!earned) {
      setAdMessage("Aucune pub n'est disponible pour l'instant. Réessaie un peu plus tard.");
      track('ad_reward_failed');
      return;
    }
    const w = await grantAdReward(day);
    setCoins(w.coins);
    setAdsLeft(w.adsLeft);
    track('ad_reward_earned', { granted: w.granted, coins: w.coins });
    setShowNoCoins(false);
  };
  const canWatchAd = rewardedAdsAvailable() && adsLeft > 0 && coins < MAX_COINS;

  const backToDaily = async () => {
    const loadedGame = await loadDaily(day);
    const saved =
      loadedGame && typeof loadedGame.errors === 'number' && loadedGame.puzzle === puzzleSignature(generatePuzzle(dailySeed(day)))
        ? loadedGame
        : null;
    setMode('daily');
    setCells(saved?.cells ?? emptyCells());
    setErrors(saved?.errors ?? 0);
    setFinished(saved?.finished ?? false);
    setShowResult(false);
  };

  const giveUp = () => {
    finish(cells, errors, true);
  };

  const share = async () => {
    const grid = cells.map((r) => r.map((c) => (c ? '🟩' : '⬜')).join('')).join('\n');
    const title =
      mode === 'daily' ? `Terminus Paris n°${dailyNumber(day)}` : 'Terminus Paris (partie libre)';
    const errorText = errors === 0 ? 'sans erreur' : `${errors} erreur${errors > 1 ? 's' : ''}`;
    const message = `${title} : ${found}/9 · ${errorText}\n${grid}\n\nÀ toi de jouer : ${WEB_URL}`;
    track('result_shared', { mode, found, errors });
    try {
      await Share.share({ message });
    } catch {
      // Navigateur sans fenêtre de partage : on copie le résultat.
      const clipboard = (globalThis as { navigator?: { clipboard?: Clipboard } }).navigator?.clipboard;
      if (clipboard) {
        await clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const gridWidth = Math.min(width - 32, 480);
  const activeRow = active ? puzzle.rows[active.row] : undefined;
  const activeCol = active ? puzzle.cols[active.col] : undefined;

  if (!loaded || !(fontsLoaded || fontError)) return <View style={styles.screen} />;

  return (
    <View style={styles.root}>
    <SafeAreaView style={styles.screen} edges={adsActive ? ['top', 'left', 'right'] : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: WEB_TOP_GAP }]}>
        <View style={[styles.header, { width: gridWidth }]}>
          <Logo tile={Math.min(36, (gridWidth - 60) / 8.6)} />
          <Pressable onPress={() => { setShowHelp(true); track('help_opened'); }} style={styles.helpButton} accessibilityLabel="Règles du jeu">
            <Text style={styles.helpText}>?</Text>
          </Pressable>
        </View>
        <View style={[styles.ticket, { width: gridWidth }]}>
          <View>
            <Text style={styles.ticketMain}>
              {mode === 'daily' ? `Grille n°${dailyNumber(day)}` : 'Grille en plus'}
            </Text>
            <Text style={styles.ticketSub}>{mode === 'daily' ? formatDay(day) : `${GRID_COST} pièce la grille`}</Text>
          </View>
          <CoinPill coins={coins} />
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

        <View style={[styles.status, { width: gridWidth - 24 }]}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{finished ? 'Terminé' : 'Erreurs possibles'}</Text>
            <Text style={styles.statusValue}>{finished ? `${found}/9` : MAX_ERRORS - errors}</Text>
          </View>
          <TicketTrack total={MAX_ERRORS} used={errors} />
        </View>

        <View style={styles.actions}>
          {finished ? (
            <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
          ) : (
            <Button label="Abandonner" onPress={giveUp} tone="danger" />
          )}
          {mode === 'daily' ? (
            freeSaved && !freeSaved.finished ? (
              <Button label="Reprendre la grille en plus" onPress={resumeOrBuyFree} />
            ) : (
              <Button label={`Grille en plus · ${GRID_COST}`} coin onPress={buyFree} />
            )
          ) : (
            <>
              {finished && <Button label={`Nouvelle grille · ${GRID_COST}`} coin onPress={buyFree} />}
              <Button label="Grille du jour" onPress={backToDaily} />
            </>
          )}
        </View>

        <StoreBanner />

        <Text style={styles.disclaimer}>
          Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.{'\n'}Version {APP_VERSION}
        </Text>
      </ScrollView>
      {/* Bandeau de choix des statistiques (version web uniquement). */}
      <StatsBanner refreshKey={consentKey} />
      {/* Bannière publicitaire (app des stores uniquement). */}
      <AdBanner />

      <SearchModal
        visible={!!active}
        row={activeRow}
        col={activeCol}
        usedIds={usedIds}
        errorsLeft={MAX_ERRORS - errors}
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
                    {s.rer.length > 0 && <Text style={styles.rer}>RER {s.rer.join(' ')}</Text>}
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
        footer={<Button label={copied ? 'Résultat copié !' : 'Partager mon résultat'} onPress={share} primary />}
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
        visible={!!bonus && !showIntro && !(showHelp && !showIntro)}
        title={bonus?.welcome ? 'Bienvenue !' : 'Bonus du jour'}
        onClose={() => setBonus(null)}
      >
        <View style={styles.bonusRow}>
          <Coin size={40} />
          <Text style={styles.bonusAmount}>+{bonus?.granted}</Text>
        </View>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          {bonus?.welcome
            ? `Voici tes ${bonus?.granted} pièces du jour. Tu en gagnes ${DAILY_BONUS} chaque jour en ouvrant l'app.`
            : `Tu gagnes ${bonus?.granted} pièces pour ta visite du jour. Reviens demain pour en gagner ${DAILY_BONUS} de plus !`}
        </Text>
        <Text style={[infoStyles.small, { textAlign: 'center' }]}>
          Une grille en plus coûte {GRID_COST} pièce. Ton solde : {bonus?.coins} pièces (maximum {MAX_COINS}).
        </Text>
      </InfoModal>

      <InfoModal
        visible={showNoCoins}
        title="Plus de pièces"
        onClose={() => {
          setShowNoCoins(false);
          setAdMessage(null);
        }}
        footer={
          canWatchAd ? (
            <Button
              label={watchingAd ? 'Chargement de la pub…' : `Regarder une pub · +${AD_REWARD}`}
              coin
              primary
              onPress={() => !watchingAd && watchAd()}
            />
          ) : undefined
        }
      >
        <View style={styles.bonusRow}>
          <Coin size={40} />
          <Text style={styles.bonusAmount}>{coins}</Text>
        </View>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          Une grille en plus coûte {GRID_COST} pièce. Tu gagnes {DAILY_BONUS} pièces chaque jour en ouvrant l'app
          {canWatchAd ? `, ou ${AD_REWARD} pièces en regardant une courte pub.` : ' : reviens demain !'}
        </Text>
        {adMessage && <Text style={[infoStyles.small, { textAlign: 'center', color: colors.danger }]}>{adMessage}</Text>}
        <Text style={[infoStyles.small, { textAlign: 'center' }]}>La grille du jour, elle, est toujours gratuite.</Text>
      </InfoModal>

      <InfoModal
        visible={showHelp && !showIntro}
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
          Par exemple : une station de la ligne 6 à moins de 2 km de la tour Eiffel.
        </Text>
        <Text style={infoStyles.p}>
          Tu as droit à <Text style={infoStyles.strong}>{MAX_ERRORS} erreurs</Text> : les bonnes réponses ne comptent pas.
          Chaque station ne peut servir qu'une fois.
          Touche un critère pour lire sa définition exacte.
        </Text>
        <Text style={infoStyles.p}>
          Une nouvelle grille gratuite t'attend chaque jour. Pour jouer d'autres grilles, utilise tes pièces : chaque
          grille en plus coûte {GRID_COST} pièce, et tu gagnes {DAILY_BONUS} pièces chaque jour en ouvrant l'app (jusqu'à{' '}
          {MAX_COINS} en réserve). Les pièces ne s'achètent pas : elles se gagnent seulement en jouant.
        </Text>
        <Text style={infoStyles.small}>
          Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités. Données des stations : Wikidata
          (licence CC0). Les lignes en projet ne sont pas incluses.
        </Text>
        <View style={styles.privacyLinks}>
          <Text style={styles.privacyLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Politique de confidentialité
          </Text>
          <Text
            style={styles.privacyLink}
            onPress={async () => {
              setShowHelp(false);
              markHelpSeen();
              await openPrivacyChoices();
              setConsentKey((k) => k + 1);
            }}
          >
            Gérer mes choix (pub et statistiques)
          </Text>
          <Text style={infoStyles.small}>Contact : {CONTACT_EMAIL}</Text>
        </View>
      </InfoModal>
    </SafeAreaView>
    {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </View>
  );
}

function Button({
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
  root: { flex: 1, backgroundColor: colors.ink },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  helpButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontSize: 20, fontFamily: fonts.display, color: colors.ink },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  ticketMain: { fontFamily: fonts.display, fontSize: 17, color: '#FFFFFF' },
  ticketSub: { fontFamily: fonts.bold, fontSize: 12, color: palette.sun, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  status: { marginTop: 18, gap: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 24 },
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
  disclaimer: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 28, textAlign: 'center' },
  bigScore: { fontSize: 64, fontFamily: fonts.display, color: palette.ultramarine, textAlign: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 26, fontFamily: fonts.display, color: colors.ink },
  statLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.muted },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  answerName: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink, flexShrink: 1 },
  answerMine: { fontFamily: fonts.heavy, color: palette.mint },
  answerLines: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  privacyLinks: { marginTop: 12, gap: 8 },
  privacyLink: { fontFamily: fonts.bold, fontSize: 14, color: palette.ultramarine, textDecorationLine: 'underline' },
  bonusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 8 },
  bonusAmount: { fontFamily: fonts.display, fontSize: 48, color: colors.ink },
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
});
