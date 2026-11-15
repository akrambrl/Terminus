import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { track } from '../../analytics';
import { submitScore } from '../../analytics/supabase';
import { ArchivesLink } from '../../archives/ArchivesLink';
import { NewBadgesLine } from '../../badges/BadgesModal';
import { Button, Stat, sharedStyles } from '../../components/Button';
import { DayHeader } from '../../components/DayHeader';
import { InfoModal, infoStyles } from '../../components/InfoModal';
import { LineBadge } from '../../components/LineBadge';
import { NextGame } from '../../components/NextGame';
import { formatDay, shareMessage, SITE_LABEL } from '../../components/share';
import { addDays, dayNumber } from '../../game/day';
import { STATION_BY_ID } from '../../game/lookup';
import {
  EMPTY_MODE_STATS,
  loadArret,
  loadModeStats,
  recordMode,
  saveArret,
  type ModeStats,
  type SavedArret,
} from '../../game/storage';
import type { LineId } from '../../game/types';
import { NotifPrompt } from '../../notifications/NotifPrompt';
import { challengeLink } from '../../share/challenge';
import { DuelLine } from '../../share/ChallengeBanner';
import { onGameFinished } from '../../store/review';
import { colors, fonts, ui } from '../../theme';
import {
  ARRET_LIMIT_MS,
  ARRET_LINES,
  ARRET_MAX_ERRORS,
  ARRET_STOP_MS,
  ARRET_STOPS,
  arretScore,
  arretTrip,
  lineLabel,
  secondsText,
  tripSignature,
} from './arret';
import { MetroRide } from './MetroRide';

/** Heure actuelle (ms), lue au moment d'une réponse. */
const clock = () => Date.now();

/** Vitesse de la rame dans le jeu (trajets plus courts que sur la page de capture). */
const SPEED = 0.6;
/** Durée approximative d'une station à la suivante (à quai + trajet), pour reprendre une partie. */
const CYCLE_MS = ARRET_STOP_MS + 2500;

/**
 * Prochain arrêt : la rame avance toute seule (3 s à chaque station) et le joueur devine la ligne au chrono.
 * 100 points au départ, −3 par seconde, −15 par erreur ; 3 erreurs et 30 secondes au plus.
 */
export function ArretGame({
  day,
  width,
  onDone,
  onNewDay,
  onRanking,
  archive,
  onArchives,
  onBadges,
  onBackToDaily,
}: {
  day: string;
  width: number;
  onDone: (done: boolean, success?: boolean) => void;
  onNewDay?: () => void;
  onRanking?: () => void;
  /** Trajet d'un jour passé (archives) : ni classement, ni statistiques. */
  archive?: boolean;
  onArchives?: () => void;
  onBadges?: () => void;
  onBackToDaily?: () => void;
}) {
  const trip = useMemo(() => arretTrip(day), [day]);
  const names = useMemo(() => trip.stops.map((id) => STATION_BY_ID.get(id)?.name ?? '?'), [trip]);
  const ranked = !archive;
  const [game, setGame] = useState<SavedArret>(() => ({
    trip: tripSignature(trip),
    guesses: [],
    startedAt: null,
    ms: null,
    finished: false,
    won: false,
  }));
  const [stats, setStats] = useState<ModeStats>(EMPTY_MODE_STATS);
  const [loaded, setLoaded] = useState(false);
  /** Station que la rame doit atteindre ; elle repart toute seule après 3 s à quai. */
  const [stop, setStop] = useState(0);
  /** Partie reprise en cours de trajet : la rame est déjà à quai. */
  const [resumed, setResumed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [replay, setReplay] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rideBox, setRideBox] = useState({ w: 0, h: 0 });
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const errors = game.guesses.filter((g) => g !== trip.line).length;
  const running = game.startedAt !== null && !game.finished;
  const elapsed = game.finished ? (game.ms ?? 0) : game.startedAt !== null ? Math.min(ARRET_LIMIT_MS, now - game.startedAt) : 0;
  const points = game.finished ? arretScore(game.won, game.ms ?? 0, errors) : arretScore(true, elapsed, errors);
  const wrong = new Set(game.guesses.filter((g) => g !== trip.line));

  const finish = useCallback(
    async (next: SavedArret) => {
      setGame(next);
      saveArret(day, next);
      const wrongCount = next.guesses.filter((g) => g !== trip.line).length;
      track('game_finished', { game: 'arret', mode: archive ? 'archive' : 'daily', won: next.won, ms: next.ms ?? 0, errors: wrongCount });
      if (ranked) {
        submitScore(day, 'arret', { line: next.guesses[next.guesses.length - 1] ?? null, ms: next.ms, errors: wrongCount, won: next.won });
        setStats(await recordMode('arret', day, addDays(day, -1), next.won));
      }
      onDone(true, next.won);
      onGameFinished(next.won ? 9 : 0);
      setTimeout(() => setShowResult(true), 900);
    },
    [archive, day, onDone, ranked, trip.line],
  );

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadArret(day), loadModeStats('arret')]);
      // Les parties de la toute première règle (sans chrono) sont ignorées.
      if (saved && saved.trip === tripSignature(trip) && 'startedAt' in saved) {
        if (!saved.finished && saved.startedAt !== null) {
          // Le chrono a continué pendant l'absence : la rame reprend où elle en serait.
          const spent = Date.now() - saved.startedAt;
          if (spent >= ARRET_LIMIT_MS) {
            const lost = { ...saved, finished: true, won: false, ms: ARRET_LIMIT_MS };
            setGame(lost);
            saveArret(day, lost);
          } else {
            setGame(saved);
            setStop(Math.min(ARRET_STOPS - 1, Math.floor(spent / CYCLE_MS)));
            setResumed(true);
          }
        } else {
          setGame(saved);
          if (saved.finished) setStop(ARRET_STOPS - 1);
        }
        if (saved.finished && ranked) {
          const wrongCount = saved.guesses.filter((g) => g !== trip.line).length;
          submitScore(day, 'arret', { line: saved.guesses[saved.guesses.length - 1] ?? null, ms: saved.ms, errors: wrongCount, won: saved.won });
        }
      }
      setStats(s);
      setLoaded(true);
    })();
  }, [day, trip, ranked]);

  // Chrono : rafraîchi tous les dixièmes de seconde ; au bout de 30 s, la partie est perdue.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const g = gameRef.current;
      const n = Date.now();
      setNow(n);
      if (g.startedAt !== null && !g.finished && n - g.startedAt >= ARRET_LIMIT_MS) {
        setFeedback('Temps écoulé !');
        finish({ ...g, finished: true, won: false, ms: ARRET_LIMIT_MS });
      }
    }, 100);
    return () => clearInterval(t);
  }, [running, finish]);

  /** Arrivée à quai : le chrono démarre à la 1re station ; la rame repart après 3 s. */
  const arrived = (i: number) => {
    const g = gameRef.current;
    if (g.finished) return;
    if (g.startedAt === null) {
      const started = { ...g, startedAt: Date.now() };
      setGame(started);
      setNow(Date.now());
      saveArret(day, started);
      track('game_started', { game: 'arret' });
    }
    if (i < ARRET_STOPS - 1) {
      setTimeout(() => {
        if (!gameRef.current.finished) setStop((s) => Math.max(s, i + 1));
      }, ARRET_STOP_MS);
    }
  };

  const answer = (line: string) => {
    if (!running || wrong.has(line)) return;
    const t = clock();
    const ms = Math.min(ARRET_LIMIT_MS, t - (game.startedAt ?? t));
    const guesses = [...game.guesses, line];
    const won = line === trip.line;
    const wrongCount = guesses.filter((g) => g !== trip.line).length;
    track('guess', { game: 'arret', correct: won, ms });
    if (won || wrongCount >= ARRET_MAX_ERRORS) {
      if (!won) setFeedback(`Pas la ligne ${lineLabel(line)} ! Plus d'essai.`);
      finish({ ...game, guesses, won, finished: true, ms });
      return;
    }
    setFeedback(`Pas la ligne ${lineLabel(line)} ! −15 pts`);
    setTimeout(() => setFeedback(null), 2500);
    const next = { ...game, guesses };
    setGame(next);
    saveArret(day, next);
  };

  const share = async () => {
    const title = `Prochain arrêt n°${dayNumber(day)}${archive ? ` (${formatDay(day)})` : ''}`;
    const result = game.won
      ? `ligne trouvée en ${secondsText(game.ms ?? 0)}${errors ? ` (${errors} erreur${errors > 1 ? 's' : ''})` : ''} · ${points} pts`
      : 'ligne pas trouvée';
    const tail = ranked
      ? `Fais mieux que moi : ${await challengeLink('arret', day, { found: game.won ? 1 : 0, extra: points })}`
      : SITE_LABEL;
    const message = `Terminus Paris · ${title} · ${result}\n\n${tail}`;
    track('result_shared', { game: 'arret', won: game.won, points });
    if ((await shareMessage(message)) === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!loaded) return <View style={{ flex: 1 }} />;

  const badge = Math.min(40, Math.floor((width - 7 * 6) / 8));
  const left = ARRET_MAX_ERRORS - errors;
  return (
    <>
      <DayHeader
        width={width}
        title={`Prochain arrêt n°${dayNumber(day)}`}
        sub={archive ? `${formatDay(day)} · jour passé` : formatDay(day)}
        right={
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.chrono}>{secondsText(elapsed)}</Text>
            <Text style={styles.chronoPts}>{points} pts</Text>
          </View>
        }
      />

      <View style={[styles.rideArea, { width }]} onLayout={(e) => setRideBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {rideBox.h > 0 && (
          <MetroRide
            names={names}
            stop={stop}
            replay={replay}
            fast={replay > 0}
            speed={SPEED}
            jump={resumed}
            width={rideBox.w}
            height={rideBox.h}
            label={(i) => `Station ${i + 1} sur ${ARRET_STOPS}`}
            onArrived={arrived}
          />
        )}
      </View>

      {!game.finished ? (
        <>
          <Text style={styles.question}>{running ? 'Quelle ligne ?' : 'La rame arrive…'}</Text>
          <Text style={[styles.hint, feedback && styles.hintBad]}>
            {feedback ?? `Plus tu es rapide, plus tu marques · ${left} erreur${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}`}
          </Text>
          <View style={[styles.lines, { width, opacity: running ? 1 : 0.55 }]}>
            {ARRET_LINES.map((l) => {
              const off = wrong.has(l);
              return (
                <Pressable
                  key={l}
                  disabled={!running || off}
                  onPress={() => answer(l)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligne ${lineLabel(l)}`}
                  style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }, off && { opacity: 0.25 }]}
                >
                  <LineBadge line={l} size={badge} ring />
                  {off && <Text style={[styles.cross, { fontSize: badge * 0.7, lineHeight: badge }]}>✕</Text>}
                </Pressable>
              );
            })}
          </View>
          {archive && onBackToDaily && (
            <View style={sharedStyles.actions}>
              <Button label="Trajet du jour" onPress={onBackToDaily} />
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.answerRow}>
            <Text style={styles.answerText}>{game.won ? 'Bravo, c’était la' : 'C’était la'}</Text>
            <LineBadge line={trip.line} size={34} ring />
            <Text style={styles.answerText}>
              {game.won ? `· ${secondsText(game.ms ?? 0)} · ${points} pts` : '· pas trouvée'}
            </Text>
          </View>
          {ranked && <NextGame day={day} label="Prochain trajet" color={colors.white} onNewDay={onNewDay} />}
          <View style={sharedStyles.actions}>
            <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
            <Button label="Revoir le trajet" onPress={() => setReplay((r) => r + 1)} />
            {archive && onArchives && <Button label="Autres jours" onPress={onArchives} />}
            {archive && onBackToDaily && <Button label="Trajet du jour" onPress={onBackToDaily} />}
          </View>
          {ranked && onArchives && <ArchivesLink onPress={onArchives} color={colors.white} />}
        </>
      )}

      <InfoModal
        visible={showResult}
        title={game.won ? 'Ligne trouvée !' : 'Pas cette fois…'}
        onClose={() => setShowResult(false)}
        footer={
          <View style={{ gap: 10 }}>
            <Button label={copied ? 'Lien copié !' : ranked ? 'Défier mes amis' : 'Partager mon résultat'} onPress={share} primary />
            {onRanking && ranked && (
              <Button
                label="Voir le classement"
                onPress={() => {
                  setShowResult(false);
                  onRanking();
                }}
              />
            )}
          </View>
        }
      >
        <View style={styles.bigLine}>
          <LineBadge line={trip.line} size={64} />
        </View>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          {game.won
            ? `Trouvée en ${secondsText(game.ms ?? 0)}${errors ? ` avec ${errors} erreur${errors > 1 ? 's' : ''}` : ' sans erreur'} : ${points} points.`
            : `C'était la ligne ${lineLabel(trip.line)}.`}
        </Text>
        <NewBadgesLine
          visible={showResult}
          onOpen={
            onBadges &&
            (() => {
              setShowResult(false);
              onBadges();
            })
          }
        />
        {ranked && <DuelLine game="arret" day={day} mine={{ found: game.won ? 1 : 0, extra: points }} />}
        {game.guesses.some((g) => g !== trip.line) && (
          <Text style={infoStyles.small}>
            Tes erreurs : {game.guesses.filter((g) => g !== trip.line).map((g) => `ligne ${lineLabel(g)}`).join(', ')}.
          </Text>
        )}
        <Text style={infoStyles.small}>Le trajet :</Text>
        {trip.stops.map((id, i) => {
          const s = STATION_BY_ID.get(id);
          return (
            <View key={id} style={styles.stopRow}>
              <Text style={styles.stopNum}>{i + 1}</Text>
              <Text style={styles.stopName} numberOfLines={1}>
                {s?.name}
              </Text>
              <View style={styles.stopLines}>
                {s?.lines.map((l) => (
                  <LineBadge key={l} line={l as LineId} size={18} />
                ))}
              </View>
            </View>
          );
        })}
        {ranked && (
          <View style={sharedStyles.stats}>
            <Stat value={stats.played} label="Trajets" />
            <Stat value={stats.complete} label="Trouvés" />
            <Stat value={stats.streak} label="Série" />
            <Stat value={stats.bestStreak} label="Record" />
          </View>
        )}
        <NotifPrompt />
        <Text style={sharedStyles.unofficial}>Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</Text>
      </InfoModal>
    </>
  );
}

const styles = StyleSheet.create({
  chrono: { fontFamily: fonts.display, fontSize: 20, color: colors.sun },
  chronoPts: { fontFamily: fonts.heavy, fontSize: 12, color: colors.white },
  rideArea: { flex: 1, minHeight: 200, marginTop: ui.space.s },
  question: { fontFamily: fonts.display, fontSize: 20, color: colors.white, marginTop: ui.space.m, textAlign: 'center' },
  hintBad: { color: colors.sun, opacity: 1, fontFamily: fonts.heavy, fontSize: 14 },
  hint: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, textAlign: 'center', opacity: 0.85 },
  lines: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: ui.space.s },
  cross: { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', color: colors.white, fontFamily: fonts.heavy },
  answerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: ui.space.m, flexWrap: 'wrap' },
  answerText: { fontFamily: fonts.display, fontSize: 19, color: colors.white },
  bigLine: { alignItems: 'center', marginVertical: ui.space.s },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  stopNum: { width: 18, fontFamily: fonts.heavy, fontSize: 13, color: colors.muted },
  stopName: { flex: 1, fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  stopLines: { flexDirection: 'row', gap: 3 },
});
