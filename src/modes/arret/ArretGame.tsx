import { useEffect, useMemo, useState } from 'react';
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
import { ARRET_LINES, ARRET_STOPS, arretPoints, arretTrip, lineLabel, tripSignature } from './arret';
import { MetroRide } from './MetroRide';

const ordinal = (n: number) => (n === 1 ? '1re' : `${n}e`);

/**
 * Prochain arrêt : la rame s'arrête station après station, le joueur devine la ligne.
 * Une proposition par station (ou « station suivante ») ; 5 points à la 1re station, 1 à la 5e.
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
  const empty: SavedArret = { trip: tripSignature(trip), guesses: [], finished: false, won: false };
  const [game, setGame] = useState<SavedArret>(empty);
  const [stats, setStats] = useState<ModeStats>(EMPTY_MODE_STATS);
  const [loaded, setLoaded] = useState(false);
  /** Station où la rame est arrêtée (les pastilles ne répondent qu'à l'arrêt). */
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [replay, setReplay] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Message après une proposition (« Ce n'est pas la ligne 8 »), affiché jusqu'à la station suivante. */
  const [feedback, setFeedback] = useState<{ text: string; bad: boolean } | null>(null);
  const [rideBox, setRideBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadArret(day), loadModeStats('arret')]);
      if (saved && saved.trip === tripSignature(trip)) {
        setGame(saved);
        if (saved.finished && ranked) {
          submitScore(day, 'arret', { line: saved.guesses[saved.guesses.length - 1], stations: saved.guesses.length, won: saved.won });
        }
      }
      setStats(s);
      setLoaded(true);
    })();
  }, [day, trip, ranked]);

  /** Station en cours (indice) : celle de la proposition à venir, ou la dernière vue. */
  const current = game.finished ? Math.max(0, game.guesses.length - 1) : game.guesses.length;
  const canAnswer = !game.finished && stoppedAt === current;
  const wrong = new Set(game.guesses.filter((g): g is string => !!g && g !== trip.line));
  const stations = game.guesses.length;
  const points = arretPoints(game.won, stations);

  const finish = async (next: SavedArret) => {
    track('game_finished', { game: 'arret', mode: archive ? 'archive' : 'daily', won: next.won, stations: next.guesses.length });
    if (ranked) {
      submitScore(day, 'arret', { line: next.guesses[next.guesses.length - 1], stations: next.guesses.length, won: next.won });
      setStats(await recordMode('arret', day, addDays(day, -1), next.won));
    }
    onDone(true, next.won);
    onGameFinished(next.won ? 9 : 0);
    setTimeout(() => setShowResult(true), 900);
  };

  const answer = (line: string | null) => {
    if (!canAnswer) return;
    if (game.guesses.length === 0) track('game_started', { game: 'arret' });
    const guesses = [...game.guesses, line];
    const won = line === trip.line;
    const finished = won || guesses.length >= ARRET_STOPS;
    const next = { ...game, guesses, won, finished };
    track('guess', { game: 'arret', correct: won, station: guesses.length, waited: line === null });
    if (!won) {
      const last = guesses.length >= ARRET_STOPS;
      setFeedback({
        bad: line !== null,
        text:
          line === null
            ? last
              ? 'Dommage…'
              : '⏭️ Tu attends la station suivante…'
            : `❌ Pas la ligne ${lineLabel(line)} !${last ? '' : ' La rame repart…'}`,
      });
    }
    setGame(next);
    saveArret(day, next);
    if (finished) finish(next);
  };

  const share = async () => {
    const marks = Array.from({ length: ARRET_STOPS }, (_, i) => {
      const g = game.guesses[i];
      if (i >= game.guesses.length) return '⬜';
      if (g === trip.line) return '✅';
      return g === null ? '⏭️' : '❌';
    }).join('');
    const title = `Prochain arrêt n°${dayNumber(day)}${archive ? ` (${formatDay(day)})` : ''}`;
    const result = game.won ? `ligne trouvée à la ${ordinal(stations)} station` : 'ligne pas trouvée';
    const tail = ranked
      ? `Fais mieux que moi 👀 ${await challengeLink('arret', day, { found: game.won ? 1 : 0, extra: stations })}`
      : SITE_LABEL;
    const message = `Terminus Paris · ${title} · ${result}\n🚇 ${marks}\n\n${tail}`;
    track('result_shared', { game: 'arret', won: game.won, stations });
    if ((await shareMessage(message)) === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!loaded) return <View style={{ flex: 1 }} />;

  const badge = Math.min(40, Math.floor((width - 7 * 6) / 8));
  return (
    <>
      <DayHeader
        width={width}
        title={`Prochain arrêt n°${dayNumber(day)}`}
        sub={archive ? `${formatDay(day)} · jour passé` : formatDay(day)}
        right={
          !game.finished ? (
            <Text style={styles.potential}>
              {arretPoints(true, current + 1)} <Text style={styles.potentialUnit}>pts</Text>
            </Text>
          ) : undefined
        }
      />

      <View style={[styles.rideArea, { width }]} onLayout={(e) => setRideBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {rideBox.h > 0 && (
          <MetroRide
            names={names}
            stop={current}
            replay={replay}
            fast={replay > 0}
            width={rideBox.w}
            height={rideBox.h}
            label={(i) => `Station ${i + 1} sur ${ARRET_STOPS}`}
            onArrived={setStoppedAt}
          />
        )}
      </View>

      {!game.finished ? (
        <>
          {feedback && !canAnswer ? (
            <Text style={[styles.feedback, feedback.bad && styles.feedbackBad]}>{feedback.text}</Text>
          ) : (
            <>
              <Text style={styles.question}>{canAnswer ? 'Quelle ligne ?' : 'La rame roule…'}</Text>
              <Text style={styles.hint}>
                {canAnswer && feedback?.bad ? feedback.text.replace(' La rame repart…', '') : 'Une seule proposition par station'}
              </Text>
            </>
          )}
          <View style={[styles.lines, { width, opacity: canAnswer ? 1 : 0.55 }]}>
            {ARRET_LINES.map((l) => {
              const off = wrong.has(l);
              return (
                <Pressable
                  key={l}
                  disabled={!canAnswer || off}
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
          <View style={sharedStyles.actions}>
            <Button
              label={current + 1 >= ARRET_STOPS ? 'Je ne sais pas' : 'Station suivante ▸'}
              onPress={() => answer(null)}
            />
            {archive && onBackToDaily && <Button label="Trajet du jour" onPress={onBackToDaily} />}
          </View>
        </>
      ) : (
        <>
          <View style={styles.answerRow}>
            <Text style={styles.answerText}>{game.won ? 'Bravo, c’était la' : 'C’était la'}</Text>
            <LineBadge line={trip.line} size={34} ring />
            <Text style={styles.answerText}>
              {game.won ? `· ${ordinal(stations)} station · ${points} pts` : '· pas trouvée'}
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
            <Button label={copied ? 'Lien copié !' : ranked ? 'Défier mes amis 🎯' : 'Partager mon résultat'} onPress={share} primary />
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
            ? `Trouvée à la ${ordinal(stations)} station : ${points} point${points > 1 ? 's' : ''}.`
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
        {ranked && <DuelLine game="arret" day={day} mine={{ found: game.won ? 1 : 0, extra: stations }} />}
        <Text style={infoStyles.small}>Le trajet :</Text>
        {trip.stops.map((id, i) => {
          const s = STATION_BY_ID.get(id);
          const g = game.guesses[i];
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
              <Text style={styles.stopMark}>
                {i >= game.guesses.length ? '' : g === trip.line ? '✅' : g === null ? '⏭️' : '❌'}
              </Text>
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
  potential: { fontFamily: fonts.display, fontSize: 22, color: colors.sun },
  potentialUnit: { fontSize: 13 },
  rideArea: { flex: 1, minHeight: 200, marginTop: ui.space.s },
  question: { fontFamily: fonts.display, fontSize: 20, color: colors.white, marginTop: ui.space.m, textAlign: 'center' },
  feedback: {
    fontFamily: fonts.heavy,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: ui.space.m,
    textAlign: 'center',
  },
  feedbackBad: { backgroundColor: colors.sun },
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
  stopMark: { width: 24, textAlign: 'right', fontSize: 14 },
});
