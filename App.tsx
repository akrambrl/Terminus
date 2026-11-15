import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Grid } from './src/components/Grid';
import { InfoModal, infoStyles } from './src/components/InfoModal';
import { LineBadge } from './src/components/LineBadge';
import { SearchModal } from './src/components/SearchModal';
import { dailyNumber, dailySeed, generatePuzzle, puzzleSignature } from './src/game/generator';
import { addDays, currentDayKey } from './src/game/day';
import { Button, Stat } from './src/components/Button';
import type { GameTab } from './src/components/ModeTabs';
import { DayHeader } from './src/components/DayHeader';
import { bestGridPoints, gridPoints, stationPoints } from './src/game/points';
import { goldStations } from './src/game/gold';
import { gridAnswers, percentText, pickPercent, rarestPick, usePicks } from './src/game/originality';
import { NextGame } from './src/components/NextGame';
import { NotifPrompt } from './src/notifications/NotifPrompt';
import {
  disableMorningNotifications,
  enableMorningNotifications,
  getNotifPref,
  notificationsSupported,
  refreshMorningNotifications,
  skipTodayNotification,
} from './src/notifications';
import { MORNING_HOUR } from './src/notifications/content';
import { BrickWall } from './src/design/ui';
import { screens, ui, type ScreenId } from './src/theme';
import { shareMessage } from './src/components/share';
import { challengeLink, getChallenge } from './src/share/challenge';
import { ChallengeBanner, DuelLine } from './src/share/ChallengeBanner';
import { DefiGame } from './src/modes/defi/DefiGame';
import { DEFI_MAX_ERRORS, defiFromSeed, defiSignature, generateDefi } from './src/modes/defi/defi';
import { PenduGame } from './src/modes/pendu/PenduGame';
import { ArretGame } from './src/modes/arret/ArretGame';
import { ArretCapture } from './src/modes/arret/ArretCapture';
import { ARRET_STOPS, arretTrip, tripSignature } from './src/modes/arret/arret';
import { MAX_PENDU_ERRORS, penduFromSeed, penduStation } from './src/modes/pendu/pendu';
import { ARCHIVE_COST, archiveState, type ArchiveDay, type ArchiveGame } from './src/archives/archives';
import { ArchivesLink } from './src/archives/ArchivesLink';
import { ArchivesModal } from './src/archives/ArchivesModal';
import { BadgesModal, NewBadgesLine } from './src/badges/BadgesModal';
import { MedalIcon } from './src/badges/BadgeArt';
import { HomeScreen } from './src/home/HomeScreen';
import { STATION_BY_ID } from './src/game/lookup';
import {
  EMPTY_STATS,
  hasSeenHelp,
  loadDaily,
  loadDefi,
  loadFreeDefi,
  loadFreePendu,
  loadPendu,
  saveFreeDefi,
  saveFreePendu,
  type SavedFreeDefi,
  type SavedFreePendu,
  loadStats,
  markHelpSeen,
  recordDaily,
  saveDaily,
  saveDefi,
  savePendu,
  loadArret,
  saveArret,
  loadFreeGame,
  saveFreeGame,
  type SavedFreeGame,
  type Stats,
} from './src/game/storage';
import type { Criterion, LineId, Station } from './src/game/types';
import { colors, fonts, palette, WEB_TOP_GAP } from './src/theme';
import { APP_VERSION } from './src/version';
import { setAnalyticsSink, track } from './src/analytics';
import { getStatsOptOut, sendEvent, setStatsOptOut, startPresence, submitScore } from './src/analytics/supabase';
import { StatsDashboard } from './src/stats/StatsDashboard';
import { LeaderboardModal } from './src/leaderboard/LeaderboardModal';
import { readAcquisition } from './src/analytics/acquisition';
import { hasPrivacyChoices, openPrivacyChoices, startConsent } from './src/privacy/consent';
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
  TICKETS_COST,
  TICKETS_PACK,
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
import Svg, { Path } from 'react-native-svg';
/** Erreurs permises par grille : les bonnes réponses ne coûtent rien. */
const MAX_ERRORS = 3;
type Mode = 'daily' | 'free' | 'archive';
type Cell = { row: number; col: number };

const emptyCells = () => [0, 1, 2].map(() => [null, null, null] as (string | null)[]);

function yesterdayKey(day: string) {
  return addDays(day, -1);
}

/**
 * Tableau de bord privé : terminusparis.fr/?stats=CODE (le code est vérifié par la base, pas ici).
 * Lu une fois au chargement, sur le web seulement.
 */
const STATS_CODE = (() => {
  if (Platform.OS !== 'web') return null;
  try {
    return new URLSearchParams((globalThis as { location?: { search?: string } }).location?.search ?? '').get('stats');
  } catch {
    return null;
  }
})();

/**
 * Page de capture pour TikTok et Instagram : terminusparis.fr/?capture=arret (&stops=3, &reveal=1).
 * Le trajet du jour en plein écran 9:16, sans boutons, à filmer avec l'enregistrement d'écran.
 */
const CAPTURE = (() => {
  if (Platform.OS !== 'web') return null;
  try {
    const q = new URLSearchParams((globalThis as { location?: { search?: string } }).location?.search ?? '');
    if (q.get('capture') !== 'arret') return null;
    return { stops: Number(q.get('stops') ?? 3) || 3, reveal: q.get('reveal') === '1' };
  } catch {
    return null;
  }
})();

// Statistiques du jeu : envoyées à la base Supabase de Terminus (sauf sur le tableau de bord et la capture).
if (!STATS_CODE && !CAPTURE) setAnalyticsSink(sendEvent);

export default function App() {
  return (
    <SafeAreaProvider>
      {STATS_CODE ? <StatsPage code={STATS_CODE} /> : CAPTURE ? <CapturePage {...CAPTURE} /> : <Game />}
    </SafeAreaProvider>
  );
}

function CapturePage({ stops, reveal }: { stops: number; reveal: boolean }) {
  const [loaded, error] = useGameFonts();
  if (!loaded && !error) return <View style={[styles.screen, { backgroundColor: '#000' }]} />;
  return <ArretCapture stops={stops} reveal={reveal} />;
}

function useGameFonts() {
  // Polices de la charte, embarquées dans l'app (aucun chargement depuis Internet).
  return useFonts({
    [fonts.display]: require('./assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
    [fonts.bold]: require('./assets/fonts/Figtree-Bold.ttf'),
    [fonts.heavy]: require('./assets/fonts/Figtree-ExtraBold.ttf'),
  });
}

function StatsPage({ code }: { code: string }) {
  const [loaded, error] = useGameFonts();
  if (!loaded && !error) return <View style={[styles.screen, { backgroundColor: colors.background }]} />;
  return <StatsDashboard code={code} />;
}

function Game() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded, fontError] = useGameFonts();
  const [day, setDay] = useState(currentDayKey);
  const [noStats, setNoStats] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const openRanking = useCallback(() => setShowRanking(true), []);
  const [showBadges, setShowBadges] = useState(false);
  const openBadges = useCallback(() => setShowBadges(true), []);
  /** Minuit à Paris : on passe aux jeux du nouveau jour sans relancer l'app. */
  const newDay = useCallback(() => setDay(currentDayKey()), []);
  // Lien de défi d'un ami : on ouvre directement le jeu concerné.
  const [tab, setTab] = useState<GameTab>(() => getChallenge()?.game ?? 'grille');
  /** Page d'accueil (les quatre jeux) : affichée à l'ouverture, sauf lien de défi d'un ami. */
  const [home, setHome] = useState(() => !getChallenge());
  const [done, setDone] = useState<Record<GameTab, boolean>>({ grille: false, defi: false, pendu: false, arret: false });
  const [defiScreen, setDefiScreen] = useState<ScreenId>('defi');
  /** Défi / Pendu en plus en cours (graine), ou null pour celui du jour. */
  const [defiSeed, setDefiSeed] = useState<string | null>(null);
  const [penduSeed, setPenduSeed] = useState<string | null>(null);
  const [freeDefi, setFreeDefi] = useState<SavedFreeDefi | null>(null);
  const [freePendu, setFreePendu] = useState<SavedFreePendu | null>(null);
  const [success, setSuccess] = useState({ defi: false, pendu: false });
  // Les quatre jeux du jour sont faits : pas de rappel ce matin-là (parties jouées avant 8 h).
  useEffect(() => {
    if (done.grille && done.defi && done.pendu && done.arret) skipTodayNotification(day);
  }, [done, day]);
  const markDone = useCallback((t: GameTab) => setDone((d) => (d[t] ? d : { ...d, [t]: true })), []);
  const [mode, setMode] = useState<Mode>('daily');
  const [freeSeed, setFreeSeed] = useState(() => `libre-${Date.now()}`);
  /** Jours passés (archives) en cours de jeu, ou null. */
  const [gridArchive, setGridArchive] = useState<string | null>(null);
  const [defiArchive, setDefiArchive] = useState<string | null>(null);
  const [penduArchive, setPenduArchive] = useState<string | null>(null);
  const [arretArchive, setArretArchive] = useState<string | null>(null);
  const [archivesFor, setArchivesFor] = useState<ArchiveGame | null>(null);
  /** Jour de la grille affichée (celui d'aujourd'hui, ou un jour passé). */
  const gridDay = mode === 'archive' && gridArchive ? gridArchive : day;
  const puzzle = useMemo(
    () => generatePuzzle(mode === 'free' ? freeSeed : dailySeed(gridDay)),
    [mode, gridDay, freeSeed],
  );

  const [cells, setCells] = useState(emptyCells);
  const [errors, setErrors] = useState(0);
  /** Lots de 3 tickets rachetés pour la grille en cours. */
  const [bought, setBought] = useState(0);
  const [showOut, setShowOut] = useState(false);
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
  const [gridBox, setGridBox] = useState<{ h: number } | null>(null);

  // Consentement (pub et statistiques) dès le lancement.
  useEffect(() => {
    startConsent();
    getStatsOptOut().then(setNoStats);
    // Rappel du matin : reprogramme les 14 prochains matins (si le joueur l'a activé).
    refreshMorningNotifications();
    getNotifPref().then((p) => setNotifOn(p === 'on'));
    // « Je suis en ligne » pour le tableau de bord (toutes les minutes tant que le jeu est affiché).
    return startPresence();
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
      const [saved, s, seen, wallet, free, defi, pendu, arret] = await Promise.all([
        loadDaily(day),
        loadStats(),
        hasSeenHelp(),
        claimDailyBonus(day),
        loadFreeGame(),
        loadDefi(day),
        loadPendu(day),
        loadArret(day),
      ]);
      setDone({ grille: !!saved?.finished, defi: !!defi?.finished, pendu: !!pendu?.finished, arret: !!arret?.finished });
      // Défi et Pendu en plus : réservés à ceux qui ont réussi celui du jour (comme la grille).
      setSuccess({
        defi: !!defi?.finished && defi.found.length === generateDefi(day).answers.length,
        pendu: !!pendu?.won,
      });
      const [fd, fp] = await Promise.all([loadFreeDefi(), loadFreePendu()]);
      setFreeDefi(fd);
      setFreePendu(fp);
      setDefiSeed(null);
      setPenduSeed(null);
      setDefiArchive(null);
      setPenduArchive(null);
      setArretArchive(null);
      setGridArchive(null);
      setMode((m) => (m === 'archive' ? 'daily' : m));
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
        setBought(saved.bought ?? 0);
        setFinished(saved.finished);
        // Classement : renvoie la grille du jour terminée (sans effet si elle est déjà enregistrée).
        if (saved.finished) submitScore(day, 'grille', { cells: saved.cells.flat(), errors: saved.errors });
      } else {
        // Nouveau jour (ou première partie) : grille du jour vierge.
        setMode('daily');
        setCells(emptyCells());
        setErrors(0);
        setBought(0);
        setFinished(false);
        setShowResult(false);
      }
      setStats(s);
      setShowHelp(!seen);
      setLoaded(true);
      const acq = readAcquisition();
      track('app_opened', {
        daily_number: dailyNumber(day),
        daily_finished: !!saved?.finished,
        returning: s.played > 0,
        ...(acq ? { source: acq.source, medium: acq.medium, campaign: acq.campaign } : {}),
      });
    })();
  }, [day]);

  const usedIds = useMemo(() => new Set(cells.flat().filter((c): c is string => !!c)), [cells]);
  const found = usedIds.size;
  /** Points de la grille : stations peu fréquentées = plus de points. */
  const points = gridPoints(cells);
  /** Erreurs permises : 3, plus 3 par lot de tickets racheté. */
  const maxErrors = MAX_ERRORS + TICKETS_PACK * bought;
  /** Plus de tickets, grille pas finie : en attente d'un rachat ou de « Terminer ». */
  const outOfTickets = !finished && errors >= maxErrors;
  const maxPoints = useMemo(() => bestGridPoints(puzzle.answers), [puzzle]);
  /** Réponses des autres joueurs ce jour-là (grille du jour ou jour passé terminée). */
  const picks = usePicks(gridDay, 'grille', mode !== 'free' && finished);
  const gold = useMemo(() => goldStations(puzzle), [puzzle]);
  const goldFound = cells.flat().find((id) => !!id && gold.ids.has(id)) ?? null;
  const rarest = mode !== 'free' ? rarestPick(picks, gridAnswers(cells)) : null;

  const finish = useCallback(
    async (finalCells: (string | null)[][], errorCount: number, gaveUp = false) => {
      setFinished(true);
      const foundCount = finalCells.flat().filter(Boolean).length;
      track('game_finished', { game: 'grille', mode, found: foundCount, errors: errorCount, gave_up: gaveUp, points: gridPoints(finalCells) });
      onGameFinished(foundCount);
      if (mode === 'free') {
        const game = { seed: freeSeed, cells: finalCells, errors: errorCount, finished: true, bought };
        setFreeSaved(game);
        saveFreeGame(game);
      }
      if (mode === 'archive') {
        // Jour passé : gardé pour les archives et les badges, sans classement ni série.
        await saveDaily(gridDay, { puzzle: puzzleSignature(puzzle), cells: finalCells, errors: errorCount, finished: true, bought });
      }
      if (mode === 'daily') {
        markDone('grille');
        submitScore(day, 'grille', { cells: finalCells.flat(), errors: errorCount });
        await saveDaily(day, { puzzle: puzzleSignature(puzzle), cells: finalCells, errors: errorCount, finished: true, bought });
        const count = finalCells.flat().filter(Boolean).length;
        setStats(await recordDaily(day, count, yesterdayKey(day), gridPoints(finalCells)));
      }
      setTimeout(() => setShowResult(true), 400);
    },
    [mode, day, gridDay, puzzle, freeSeed, markDone, bought],
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
      game: 'grille',
      mode,
      correct,
      row: puzzle.rows[row].id,
      col: puzzle.cols[col].id,
      first_guess: firstGuess,
    });
    if (firstGuess) track('game_started', { game: 'grille', mode });
    if (correct) {
      setCells(next);
      setActive(null);
      setFeedback(null);
    } else {
      const left = maxErrors - nextErrors;
      setFeedback(
        left > 0
          ? `« ${station.name} » ne remplit pas les deux critères. Encore ${left} erreur${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}.`
          : `« ${station.name} » ne remplit pas les deux critères.`,
      );
    }
    const complete = next.flat().every(Boolean);
    if (complete) {
      setActive(null);
      finish(next, nextErrors);
      return;
    }
    if (nextErrors >= maxErrors) {
      // Plus de tickets : on propose d'en racheter 3 avec une pièce, ou de terminer la grille.
      setActive(null);
      setTimeout(() => setShowOut(true), 350);
    }
    saveProgress(next, nextErrors, bought);
  };

  /** Sauvegarde de la grille en cours (du jour ou en plus). */
  const saveProgress = (c: (string | null)[][], e: number, b: number) => {
    if (mode !== 'free') {
      saveDaily(gridDay, { puzzle: puzzleSignature(puzzle), cells: c, errors: e, finished: false, bought: b });
    } else {
      const game = { seed: freeSeed, cells: c, errors: e, finished: false, bought: b };
      setFreeSaved(game);
      saveFreeGame(game);
    }
  };

  /** Rachète 3 tickets avec une pièce pour continuer la grille. */
  const buyTickets = async () => {
    const paid = await spendCoins(TICKETS_COST, day);
    setCoins(paid.coins);
    setAdsLeft(paid.adsLeft);
    if (!paid.ok) {
      track('not_enough_coins', { coins: paid.coins, for: 'tickets' });
      return;
    }
    track('tickets_bought', { game: 'grille', mode, cost: TICKETS_COST, coins_left: paid.coins, found });
    const b = bought + 1;
    setBought(b);
    setShowOut(false);
    setFeedback(null);
    saveProgress(cells, errors, b);
  };

  /** Le joueur ne rachète pas de tickets : la grille se termine. */
  const endGrid = () => {
    setShowOut(false);
    finish(cells, errors);
  };

  const showFreeGame = (game: SavedFreeGame) => {
    setMode('free');
    setFreeSeed(game.seed);
    setCells(game.cells);
    setErrors(game.errors);
    setBought(game.bought ?? 0);
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
    const game = { seed: `libre-${Date.now()}`, cells: emptyCells(), errors: 0, finished: false, bought: 0 };
    setFreeSaved(game);
    saveFreeGame(game);
    showFreeGame(game);
  };

  /**
   * Défi ou Pendu en plus : reprend gratuitement celui déjà payé et pas fini, sinon en achète un
   * nouveau pour 1 pièce (jamais d'argent réel).
   */
  const playExtra = async (game: 'defi' | 'pendu') => {
    const saved = game === 'defi' ? await loadFreeDefi() : await loadFreePendu();
    const setSeed = game === 'defi' ? setDefiSeed : setPenduSeed;
    if (saved && !saved.finished) {
      track('free_game_resumed', { game });
      setSeed(saved.seed);
      return;
    }
    const paid = await spendCoins(GRID_COST, day);
    setCoins(paid.coins);
    setAdsLeft(paid.adsLeft);
    if (!paid.ok) {
      track('not_enough_coins', { coins: paid.coins, for: game });
      setShowNoCoins(true);
      return;
    }
    const seed = `${game}-${Date.now()}`;
    track('free_game_started', { game, cost: GRID_COST, coins_left: paid.coins });
    if (game === 'defi') {
      const g = { seed, defi: defiSignature(defiFromSeed(seed)), found: [], errors: 0, finished: false, gaveUp: false };
      await saveFreeDefi(g);
      setFreeDefi(g);
    } else {
      const g = { seed, station: penduFromSeed(seed, day).id, letters: [], wrongNames: [], errors: 0, finished: false, won: false };
      await saveFreePendu(g);
      setFreePendu(g);
    }
    setSeed(seed);
  };

  /** Bouton proposé sous le Défi / Pendu du jour terminé. */
  const extraLabel = (game: 'defi' | 'pendu'): string | undefined => {
    const pending = game === 'defi' ? freeDefi : freePendu;
    const noun = game === 'defi' ? 'défi' : 'pendu';
    if (pending && !pending.finished) return `Reprendre mon ${noun} en plus (déjà payé)`;
    return success[game] ? `${noun === 'défi' ? 'Défi' : 'Pendu'} en plus · ${GRID_COST}` : undefined;
  };

  /**
   * Jour passé choisi dans les archives : une partie jamais ouverte coûte une pièce (elle est alors
   * enregistrée comme commencée, donc reprise gratuitement ensuite) ; sinon on la rouvre telle quelle.
   */
  const openArchive = async (game: ArchiveGame, picked: ArchiveDay) => {
    // État relu au moment du choix : un jour déjà payé n'est jamais facturé deux fois.
    const d = await archiveState(game, picked.day);
    if (d.state === 'none') {
      const paid = await spendCoins(ARCHIVE_COST, day);
      setCoins(paid.coins);
      setAdsLeft(paid.adsLeft);
      if (!paid.ok) {
        track('not_enough_coins', { coins: paid.coins, for: `archive-${game}` });
        setArchivesFor(null);
        setShowNoCoins(true);
        return;
      }
      track('archive_started', { game, day: d.day, cost: ARCHIVE_COST, coins_left: paid.coins });
      if (game === 'grille') {
        const p = generatePuzzle(dailySeed(d.day));
        await saveDaily(d.day, { puzzle: puzzleSignature(p), cells: emptyCells(), errors: 0, finished: false, bought: 0 });
      } else if (game === 'defi') {
        await saveDefi(d.day, { defi: defiSignature(generateDefi(d.day)), found: [], errors: 0, finished: false, gaveUp: false });
      } else if (game === 'pendu') {
        await savePendu(d.day, { station: penduStation(d.day).id, letters: [], wrongNames: [], errors: 0, finished: false, won: false });
      } else {
        await saveArret(d.day, { trip: tripSignature(arretTrip(d.day)), guesses: [], startedAt: null, ms: null, finished: false, won: false });
      }
    } else {
      track('archive_opened', { game, day: d.day, state: d.state });
    }
    setArchivesFor(null);
    setTab(game);
    if (game === 'grille') {
      const saved = await loadDaily(d.day);
      setMode('archive');
      setGridArchive(d.day);
      setCells(saved?.cells ?? emptyCells());
      setErrors(saved?.errors ?? 0);
      setBought(saved?.bought ?? 0);
      setFinished(saved?.finished ?? false);
      setShowResult(false);
    } else if (game === 'defi') {
      setDefiSeed(null);
      setDefiArchive(d.day);
    } else if (game === 'pendu') {
      setPenduSeed(null);
      setPenduArchive(d.day);
    } else {
      setArretArchive(d.day);
    }
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
    setGridArchive(null);
    setCells(saved?.cells ?? emptyCells());
    setErrors(saved?.errors ?? 0);
    setBought(saved?.bought ?? 0);
    setFinished(saved?.finished ?? false);
    setShowResult(false);
  };

  const giveUp = () => {
    finish(cells, errors, true);
  };

  const share = async () => {
    const grid = cells.map((r) => r.map((c) => (c ? '🟩' : '⬜')).join('')).join('\n');
    const title =
      mode === 'daily'
        ? `Terminus Paris n°${dailyNumber(day)}`
        : mode === 'archive'
          ? `Terminus Paris n°${dailyNumber(gridDay)} (${formatDay(gridDay)})`
          : 'Terminus Paris (partie libre)';
    const errorText = errors === 0 ? 'sans erreur' : `${errors} erreur${errors > 1 ? 's' : ''}`;
    const link = mode === 'daily' ? await challengeLink('grille', day, { found, extra: points }) : WEB_URL;
    const call = mode === 'daily' ? 'Fais mieux que moi 👀' : 'À toi de jouer :';
    const goldLine = goldFound ? `\n⭐ Station en or trouvée !` : '';
    const rare = rarest ? `\n🦄 ${STATION_BY_ID.get(rarest.id)?.name} : ${percentText(rarest.percent)} des joueurs` : '';
    const message = `${title} : ${found}/9 · ${points} pts · ${errorText}\n${grid}${goldLine}${rare}\n\n${call} ${link}`;
    track('result_shared', { game: 'grille', mode, found, errors });
    if ((await shareMessage(message)) === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Écran fixe (pas de défilement) : la grille prend la place laissée par le reste,
  // et rétrécit d'elle-même quand la bannière publicitaire apparaît.
  const contentWidth = Math.min(width - 32, 480);
  const gridWidth = gridBox ? Math.max(200, Math.min(contentWidth, gridBox.h - 8)) : 0;
  const activeRow = active ? puzzle.rows[active.row] : undefined;
  const activeCol = active ? puzzle.cols[active.col] : undefined;

  if (!loaded || !(fontsLoaded || fontError)) return <View style={[styles.screen, { backgroundColor: colors.ink }]} />;

  // Fond de l'écran (charte) : grille sur fond clair, défi violet, réponses menthe, pendu bleu nuit.
  const screen: ScreenId = home
    ? 'pendu'
    : tab === 'grille'
      ? 'grille'
      : tab === 'defi'
        ? defiScreen
        : tab === 'arret'
          ? 'arret'
          : 'pendu';
  const dark = screens[screen].dark;
  // Site : la barre du navigateur (et la zone de l'heure sur iPhone) prend la couleur de l'écran.
  if (Platform.OS === 'web') {
    const meta = (globalThis as { document?: Document }).document?.querySelector('meta[name="theme-color"]');
    if (meta && meta.getAttribute('content') !== screens[screen].bg) meta.setAttribute('content', screens[screen].bg);
  }

  return (
    <View style={styles.root}>
    <BrickWall screen={screen} />
    <SafeAreaView style={styles.screen} edges={adsActive ? ['top', 'left', 'right'] : undefined}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={[styles.content, { paddingTop: WEB_TOP_GAP }]}>
        <View style={[styles.header, { width: contentWidth }]}>
          <View style={styles.headerLeft}>
            {!home && (
              <Pressable
                onPress={() => setHome(true)}
                style={[styles.helpButton, styles.backButton]}
                accessibilityRole="button"
                accessibilityLabel="Retour à l'accueil"
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M15 4 L7 12 L15 20" fill="none" stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            )}
            <Pressable onPress={() => setHome(true)} accessibilityRole="button" accessibilityLabel="Accueil">
              <Logo
                tile={Math.min(dark ? (height < 700 ? 22 : 30) : 34, (contentWidth - (home ? 196 : 250)) / 8.6)}
                plaque={dark}
              />
            </Pressable>
          </View>
          <View style={styles.headerButtons}>
            <Pressable onPress={openRanking} style={styles.helpButton} accessibilityRole="button" accessibilityLabel="Classement du jour">
              <Text style={styles.trophy}>🏆</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowBadges(true);
                track('badges_opened', { game: tab });
              }}
              style={styles.helpButton}
              accessibilityRole="button"
              accessibilityLabel="Mes badges"
            >
              <MedalIcon size={24} />
            </Pressable>
            <Pressable onPress={() => { setShowHelp(true); track('help_opened', { game: tab }); }} style={styles.helpButton} accessibilityRole="button" accessibilityLabel="Règles du jeu">
              <Text style={styles.helpText}>?</Text>
            </Pressable>
          </View>
        </View>
        {home ? (
          <HomeScreen
            day={day}
            width={contentWidth}
            coins={coins}
            refresh={JSON.stringify(done)}
            onNewDay={newDay}
            onOpen={(t) => {
              track('mode_selected', { game: t, already_played: done[t], from: 'home' });
              setTab(t);
              setHome(false);
            }}
          />
        ) : (
        <>
        <ChallengeBanner game={tab} day={day} width={contentWidth} refresh={`${done[tab]}-${finished}`} />
        {tab === 'defi' && (
          <DefiGame
            key={`${defiArchive ?? day}-${defiSeed ?? (defiArchive ? 'archive' : 'jour')}`}
            day={defiArchive ?? day}
            width={contentWidth}
            seed={defiSeed ?? undefined}
            archive={!!defiArchive}
            onArchives={() => setArchivesFor('defi')}
            onBadges={openBadges}
            onDone={(_, ok) => {
              if (defiArchive) return;
              markDone('defi');
              if (ok) setSuccess((s) => ({ ...s, defi: true }));
            }}
            onScreen={setDefiScreen}
            onNewDay={newDay}
            onRanking={defiSeed || defiArchive ? undefined : openRanking}
            extraLabel={extraLabel('defi')}
            onExtra={() => playExtra('defi')}
            onBackToDaily={async () => {
              setDefiSeed(null);
              setDefiArchive(null);
              setFreeDefi(await loadFreeDefi());
            }}
          />
        )}
        {tab === 'arret' && (
          <ArretGame
            key={arretArchive ?? day}
            day={arretArchive ?? day}
            width={contentWidth}
            archive={!!arretArchive}
            onArchives={() => setArchivesFor('arret')}
            onBadges={openBadges}
            onNewDay={newDay}
            onRanking={arretArchive ? undefined : openRanking}
            onDone={() => {
              if (!arretArchive) markDone('arret');
            }}
            onBackToDaily={() => setArretArchive(null)}
          />
        )}
        {tab === 'pendu' && (
          <PenduGame
            key={`${penduArchive ?? day}-${penduSeed ?? (penduArchive ? 'archive' : 'jour')}`}
            day={penduArchive ?? day}
            seed={penduSeed ?? undefined}
            archive={!!penduArchive}
            onArchives={() => setArchivesFor('pendu')}
            onBadges={openBadges}
            onNewDay={newDay}
            onRanking={penduSeed || penduArchive ? undefined : openRanking}
            width={contentWidth}
            active={!showHelp && !showIntro && !bonus}
            onDone={(_, ok) => {
              if (penduArchive) return;
              markDone('pendu');
              if (ok) setSuccess((s) => ({ ...s, pendu: true }));
            }}
            extraLabel={extraLabel('pendu')}
            onExtra={() => playExtra('pendu')}
            onBackToDaily={async () => {
              setPenduSeed(null);
              setPenduArchive(null);
              setFreePendu(await loadFreePendu());
            }}
          />
        )}
        {tab === 'grille' && (
        <>
        <DayHeader
          width={contentWidth}
          title={mode === 'free' ? 'Grille en plus' : `Grille n°${dailyNumber(gridDay)}`}
          sub={
            mode === 'daily' ? formatDay(day) : mode === 'archive' ? `${formatDay(gridDay)} · jour passé` : `${GRID_COST} pièce la grille`
          }
          right={<CoinPill coins={coins} />}
        />

        <View
          style={styles.gridArea}
          onLayout={(e) => setGridBox({ h: e.nativeEvent.layout.height })}
        >
          {gridWidth > 0 && (
            <Grid
              puzzle={puzzle}
              cells={cells}
              finished={finished}
              width={gridWidth}
              onPressCell={(row, col) => {
                if (finished) setAnswersFor({ row, col });
                else if (outOfTickets) setShowOut(true);
                else {
                  setFeedback(null);
                  setActive({ row, col });
                }
              }}
              onPressCriterion={(row, col) =>
                setCriterionInfo(row !== null ? puzzle.rows[row] : puzzle.cols[col as number])
              }
            />
          )}
        </View>

        <View style={[styles.status, { width: contentWidth - 24 }]}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {finished ? `Terminé · ${found}/9` : `Erreurs possibles · ${maxErrors - errors}`}
            </Text>
            <Text style={styles.statusValue} accessibilityLabel={`${points} points`}>
              {points} <Text style={styles.statusUnit}>pts</Text>
            </Text>
          </View>
          {/* Après un rachat, 3 tickets neufs : on n'affiche que le lot en cours. */}
          <TicketTrack total={MAX_ERRORS} used={Math.min(MAX_ERRORS, Math.max(0, errors - TICKETS_PACK * bought))} />
          {mode === 'daily' && finished && <NextGame day={day} label="Prochaine grille" onNewDay={newDay} />}
        </View>

        <View style={styles.actions}>
          {finished ? (
            <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
          ) : outOfTickets ? (
            <>
              <Button label="Terminer" onPress={endGrid} tone="danger" />
              <Button label={`3 tickets · ${TICKETS_COST}`} coin primary onPress={() => setShowOut(true)} />
            </>
          ) : (
            <Button label="Abandonner" onPress={giveUp} tone="danger" />
          )}
          {mode === 'daily' ? (
            // Grille en plus déjà payée et pas finie : reprise gratuite, une fois la grille du jour terminée.
            finished && freeSaved && !freeSaved.finished ? (
              <Button label="Reprendre ma grille en plus (déjà payée)" onPress={resumeOrBuyFree} />
            ) : finished && found === 9 ? (
              // Les grilles en plus sont réservées à ceux qui ont réussi la grille du jour.
              <Button label={`Grille en plus · ${GRID_COST}`} coin onPress={buyFree} />
            ) : null
          ) : mode === 'archive' ? (
            <>
              {finished && <Button label="Autres jours" onPress={() => setArchivesFor('grille')} />}
              <Button label="Grille du jour" onPress={backToDaily} />
            </>
          ) : (
            <>
              {finished && <Button label={`Nouvelle grille · ${GRID_COST}`} coin onPress={buyFree} />}
              <Button label="Grille du jour" onPress={backToDaily} />
            </>
          )}
        </View>
        {mode === 'daily' && finished && (
          <ArchivesLink onPress={() => setArchivesFor('grille')} color={dark ? colors.white : colors.ink} />
        )}
        </>
        )}

        </>
        )}

        <StoreBanner />
      </View>
      {/* Bannière publicitaire (app des stores uniquement). */}
      <AdBanner />

      <BadgesModal visible={showBadges} onClose={() => setShowBadges(false)} />

      <ArchivesModal
        game={archivesFor}
        today={day}
        coins={coins}
        onPick={openArchive}
        onClose={() => setArchivesFor(null)}
      />

      <SearchModal
        visible={!!active}
        row={activeRow}
        col={activeCol}
        usedIds={usedIds}
        errorsLeft={maxErrors - errors}
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
            {[...puzzle.answers[answersFor.row][answersFor.col]].sort((a, b) => stationPoints(b) - stationPoints(a)).map((id) => {
              const s = STATION_BY_ID.get(id)!;
              return (
                <View key={id} style={styles.answer}>
                  <Text style={[styles.answerName, cells[answersFor.row][answersFor.col] === id && styles.answerMine]}>
                    {gold.ids.has(id) ? '⭐ ' : ''}
                    {s.name}
                  </Text>
                  <View style={styles.answerLines}>
                    {s.lines.map((l) => (
                      <LineBadge key={l} line={l as LineId} size={18} />
                    ))}
                    {s.rer.length > 0 && <Text style={styles.rer}>RER {s.rer.join(' ')}</Text>}
                    <Text style={styles.answerPoints}>
                      +{stationPoints(id)}
                      {picks && mode !== 'free' ? ` · ${percentText(pickPercent(picks, answersFor.row * 3 + answersFor.col, id) ?? 0)}` : ''}
                    </Text>
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
        footer={
          <View style={{ gap: 10 }}>
            <Button
              label={copied ? 'Lien copié !' : mode === 'daily' ? 'Défier mes amis' : 'Partager mon résultat'}
              onPress={share}
              primary
            />
            {mode === 'daily' && (
              <Button
                label="Voir le classement"
                onPress={() => {
                  setShowResult(false);
                  setShowRanking(true);
                }}
              />
            )}
          </View>
        }
      >
        <Text style={styles.bigScore}>{found}/9</Text>
        <NewBadgesLine
          visible={showResult}
          onOpen={() => {
            setShowResult(false);
            setShowBadges(true);
          }}
        />
        {mode === 'daily' && <DuelLine game="grille" day={day} mine={{ found, extra: points }} />}
        <Text style={styles.pointsLine}>
          {points} points <Text style={styles.pointsMax}>sur {maxPoints} possibles</Text>
        </Text>
        {gold.ids.size > 0 && (
          <Text style={[infoStyles.p, { textAlign: 'center' }]}>
            {goldFound ? (
              <>
                ⭐ Tu as trouvé la station en or : <Text style={infoStyles.strong}>{STATION_BY_ID.get(goldFound)?.name}</Text>,
                {gold.cells === 9 ? ' qui remplit les 6 critères !' : ` valable dans ${gold.cells} cases !`}
              </>
            ) : (
              <>
                ⭐ Station en or ({gold.cells === 9 ? 'elle remplit les 6 critères' : `valable dans ${gold.cells} cases`}) :{' '}
                <Text style={infoStyles.strong}>
                  {[...gold.ids].map((id) => STATION_BY_ID.get(id)?.name).join(', ')}
                </Text>
                .
              </>
            )}
          </Text>
        )}
        {rarest && (
          <Text style={[infoStyles.p, { textAlign: 'center' }]}>
            🦄 Ta réponse la plus originale : <Text style={infoStyles.strong}>{STATION_BY_ID.get(rarest.id)?.name}</Text>,
            choisie par {percentText(rarest.percent)} des joueurs.
          </Text>
        )}
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          Touche une case de la grille pour voir toutes les réponses possibles.
        </Text>
        {mode === 'daily' && found < 9 && (
          <Text style={[infoStyles.small, { textAlign: 'center' }]}>
            Réussis la grille du jour (9/9) pour débloquer des grilles en plus.
          </Text>
        )}
        {mode === 'daily' && (
          <View style={styles.stats}>
            <Stat value={stats.played} label="Grilles" />
            <Stat value={stats.perfect} label="Parfaites" />
            <Stat value={stats.bestPoints ?? 0} label="Record pts" />
            <Stat value={stats.streak} label="Série" />
            <Stat value={stats.bestStreak} label="Record" />
          </View>
        )}
        <NotifPrompt />
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
          Une grille, un défi ou un pendu en plus coûte {GRID_COST} pièce. Ton solde : {bonus?.coins} pièces (maximum {MAX_COINS}).
        </Text>
      </InfoModal>

      <InfoModal
        visible={showOut}
        title="Plus de tickets !"
        onClose={() => setShowOut(false)}
        footer={
          <View style={{ gap: 10 }}>
            {coins >= TICKETS_COST ? (
              <Button label={`Racheter 3 tickets · ${TICKETS_COST}`} coin primary onPress={buyTickets} />
            ) : canWatchAd ? (
              <Button
                label={watchingAd ? 'Chargement de la pub…' : `Regarder une pub · +${AD_REWARD}`}
                coin
                primary
                onPress={() => !watchingAd && watchAd()}
              />
            ) : null}
            <Button label="Terminer la grille" onPress={endGrid} />
          </View>
        }
      >
        <View style={styles.bonusRow}>
          <TicketTrack total={MAX_ERRORS} used={MAX_ERRORS} />
        </View>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          Tu as trouvé {found} station{found > 1 ? 's' : ''} sur 9. Rachète 3 tickets pour {TICKETS_COST} pièce et
          continue la grille, ou termine-la pour voir toutes les réponses.
        </Text>
        <Text style={[infoStyles.small, { textAlign: 'center' }]}>
          {coins >= TICKETS_COST
            ? `Ton solde : ${coins} pièce${coins > 1 ? 's' : ''}.`
            : canWatchAd
              ? `Tu n'as plus de pièce : regarde une courte pub pour en gagner ${AD_REWARD}.`
              : "Tu n'as plus de pièce : tu en gagnes 3 chaque jour en ouvrant le jeu."}
          {mode === 'daily' ? ' Au classement, chaque erreur compte.' : ''}
        </Text>
        {adMessage && <Text style={[infoStyles.small, { textAlign: 'center', color: colors.ink }]}>{adMessage}</Text>}
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
          Une partie en plus coûte {GRID_COST} pièce. Tu gagnes {DAILY_BONUS} pièces chaque jour en ouvrant l'app
          {canWatchAd ? `, ou ${AD_REWARD} pièces en regardant une courte pub.` : ' : reviens demain !'}
        </Text>
        {adMessage && <Text style={[infoStyles.small, { textAlign: 'center', color: colors.danger }]}>{adMessage}</Text>}
        <Text style={[infoStyles.small, { textAlign: 'center' }]}>Les jeux du jour, eux, sont toujours gratuits.</Text>
      </InfoModal>

      <InfoModal
        visible={showHelp && !showIntro}
        title={tab === 'defi' ? 'Le Défi' : tab === 'pendu' ? 'Le Pendu du métro' : tab === 'arret' ? 'Prochain arrêt' : 'Comment jouer'}
        onClose={() => {
          setShowHelp(false);
          markHelpSeen();
        }}
      >
        {tab === 'defi' && (
          <>
            <Text style={infoStyles.p}>
              Chaque jour, <Text style={infoStyles.strong}>deux critères</Text> se croisent, par exemple « Ligne 4 » ×
              « Commence par S ». Trouve le plus possible de stations qui remplissent les deux.
            </Text>
            <Text style={infoStyles.p}>
              Propose les stations une par une. Une mauvaise réponse coûte un ticket :{' '}
              <Text style={infoStyles.strong}>{DEFI_MAX_ERRORS} erreurs</Text> maximum. Tu peux aussi abandonner, et
              découvrir alors toutes les réponses.
            </Text>
          </>
        )}
        {tab === 'arret' && (
          <>
            <Text style={infoStyles.p}>
              Tu es dans une rame, mais <Text style={infoStyles.strong}>sur quelle ligne ?</Text> La rame avance toute
              seule et s'arrête 3 secondes à chaque station. Touche la pastille de la ligne dès que tu l'as reconnue.
            </Text>
            <Text style={infoStyles.p}>
              Le chrono démarre à la 1re station : <Text style={infoStyles.strong}>100 points</Text> au départ, 3 points
              de moins par seconde et 15 de moins par erreur. {ARRET_STOPS} stations, 3 erreurs et 30 secondes au maximum.
              La 1re station est souvent une correspondance : tu paries tout de suite, ou tu attends la suivante ?
            </Text>
          </>
        )}
        {tab === 'pendu' && (
          <>
            <Text style={infoStyles.p}>
              Chaque jour, <Text style={infoStyles.strong}>une station à deviner</Text>, lettre par lettre. Les pastilles
              des lignes qui la desservent sont ton indice.
            </Text>
            <Text style={infoStyles.p}>
              Une lettre juste apparaît partout dans le nom (É compte comme E) ; une lettre absente coûte un ticket :{' '}
              <Text style={infoStyles.strong}>{MAX_PENDU_ERRORS} erreurs</Text> maximum. Tu peux proposer le nom complet à
              tout moment, mais un mauvais nom coûte aussi un ticket.
            </Text>
          </>
        )}
        {tab === 'grille' && (
        <>
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
          <Text style={infoStyles.strong}>Points</Text> : chaque bonne réponse rapporte de 10 à 100 points selon la
          fréquentation de la station. Châtelet ou Saint-Lazare, très fréquentées, valent 10 points ; une petite station
          comme Pelleport en vaut 100. Trouve les stations les moins connues pour battre ton record !
        </Text>
        <Text style={infoStyles.p}>
          <Text style={infoStyles.strong}>⭐ Station en or</Text> : chaque grille est construite autour d'une station
          qui remplit les 6 critères à la fois. La trouveras-tu ? Et à la fin, découvre quelle part des joueurs a
          choisi les mêmes stations que toi : 🦄 la réponse la plus originale est mise en avant.
        </Text>
        <Text style={infoStyles.p}>
          Une nouvelle grille gratuite t'attend chaque jour. Tu gagnes {DAILY_BONUS} pièces chaque jour en ouvrant l'app
          (jusqu'à {MAX_COINS} en réserve) : plus de tickets après 3 erreurs ? {TICKETS_COST} pièce rachète 3 tickets pour
          continuer. Jeu du jour réussi (grille en 9/9, défi complet, station du pendu trouvée) ? {GRID_COST} pièce débloque
          une partie en plus du même jeu, hors classement. Les jours passés se rejouent aussi pour {ARCHIVE_COST} pièce
          (📅 sous le jeu du jour terminé). Les pièces ne
          s'achètent pas : elles se gagnent seulement en jouant.
        </Text>
        </>
        )}
        <Text style={infoStyles.p}>
          Trois jeux t'attendent chaque jour, les mêmes pour tout le monde : la Grille, le Défi et le Pendu. Ils changent
          à minuit, heure de Paris.
        </Text>
        <Text style={infoStyles.small}>
          Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités. Données des stations : Wikidata
          (licence CC0) ; fréquentation : open data Île-de-France Mobilités (validations 2026). Les lignes en projet
          ne sont pas incluses.
        </Text>
        <View style={styles.privacyLinks}>
          <Text style={styles.privacyLink} onPress={() => Linking.openURL(`${WEB_URL}archives/`)}>
            Les réponses des jours passés
          </Text>
          <Text style={styles.privacyLink} onPress={() => Linking.openURL(`${WEB_URL}lignes/`)}>
            Les lignes et les stations du métro
          </Text>
          <Text style={styles.privacyLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Politique de confidentialité
          </Text>
          <Text
            style={styles.privacyLink}
            onPress={async () => {
              await setStatsOptOut(!noStats);
              setNoStats(!noStats);
            }}
          >
            {noStats ? 'Compter de nouveau mes visites (statistiques anonymes)' : 'Ne pas compter mes visites (statistiques anonymes)'}
          </Text>
          {notificationsSupported && (
            <Text
              style={styles.privacyLink}
              onPress={async () => {
                if (notifOn) {
                  await disableMorningNotifications();
                  setNotifOn(false);
                } else setNotifOn(await enableMorningNotifications());
              }}
            >
              {notifOn
                ? `Désactiver le rappel du matin (${MORNING_HOUR} h)`
                : `Activer le rappel du matin (${MORNING_HOUR} h)`}
            </Text>
          )}
          {hasPrivacyChoices && (
            <Text
              style={styles.privacyLink}
              onPress={async () => {
                setShowHelp(false);
                markHelpSeen();
                await openPrivacyChoices();
              }}
            >
              Gérer mes choix publicitaires
            </Text>
          )}
          <Text style={infoStyles.small}>Contact : {CONTACT_EMAIL} · Version {APP_VERSION}</Text>
        </View>
      </InfoModal>
    </SafeAreaView>
    <LeaderboardModal visible={showRanking} initialGame={tab} onClose={() => setShowRanking(false)} />
    {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </View>
  );
}

function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  gridArea: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
  },
  helpButton: {
    width: ui.touch,
    height: ui.touch,
    borderRadius: ui.radiusPill,
    backgroundColor: palette.sun,
    borderWidth: ui.border,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontSize: 20, fontFamily: fonts.display, color: colors.ink },
  trophy: { fontSize: 20 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 40 },
  status: { marginTop: 8, gap: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.8 },
  statusValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  statusUnit: { fontFamily: fonts.heavy, fontSize: 13, color: colors.muted },
  pointsLine: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: 'center', marginBottom: 6 },
  pointsMax: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 14 },
  bigScore: { fontSize: 64, fontFamily: fonts.display, color: palette.ultramarine, textAlign: 'center', letterSpacing: -1.3 },
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
  answerMine: { fontFamily: fonts.heavy, color: colors.ink, textDecorationLine: 'underline', textDecorationColor: palette.mint },
  answerLines: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  answerPoints: { fontFamily: fonts.heavy, fontSize: 12, color: colors.muted, minWidth: 34, textAlign: 'right' },
  privacyLinks: { marginTop: 12, gap: 8 },
  privacyLink: { fontFamily: fonts.bold, fontSize: 14, color: palette.ultramarine, textDecorationLine: 'underline' },
  bonusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 8 },
  bonusAmount: { fontFamily: fonts.display, fontSize: 48, color: colors.ink },
  rer: {
    fontFamily: fonts.heavy,
    fontSize: 10,
    color: colors.white,
    backgroundColor: colors.ink,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
