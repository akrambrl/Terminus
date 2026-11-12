import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { track } from '../../analytics';
import { Button, Stat, sharedStyles } from '../../components/Button';
import { InfoModal, infoStyles } from '../../components/InfoModal';
import { LineBadge } from '../../components/LineBadge';
import { SearchModal } from '../../components/SearchModal';
import { formatDay, shareMessage, SITE_LABEL, ticketLine } from '../../components/share';
import { TicketTrack } from '../../components/TicketTrack';
import { addDays, dayNumber } from '../../game/day';
import {
  EMPTY_MODE_STATS,
  loadModeStats,
  loadPendu,
  recordMode,
  savePendu,
  type ModeStats,
  type SavedPendu,
} from '../../game/storage';
import type { LineId, Station } from '../../game/types';
import { onGameFinished } from '../../store/review';
import { colors, fonts, palette } from '../../theme';
import { segments } from './segments';
import { AZERTY, baseLetter, isSolved, MAX_PENDU_ERRORS, nameLetters, penduStation } from './pendu';

export function PenduGame({
  day,
  width,
  active,
  onDone,
}: {
  day: string;
  width: number;
  /** Onglet affiché et aucune fenêtre ouverte : le clavier physique est écouté. */
  active: boolean;
  onDone: (done: boolean) => void;
}) {
  const station = useMemo(() => penduStation(day), [day]);
  const { height } = useWindowDimensions();
  const [game, setGame] = useState<SavedPendu>({
    station: station.id,
    letters: [],
    wrongNames: [],
    errors: 0,
    finished: false,
    won: false,
  });
  const [stats, setStats] = useState<ModeStats>(EMPTY_MODE_STATS);
  const [loaded, setLoaded] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadPendu(day), loadModeStats('pendu')]);
      if (saved && saved.station === station.id) setGame(saved);
      setStats(s);
      setLoaded(true);
    })();
  }, [day, station]);

  const letters = useMemo(() => new Set(nameLetters(station.name)), [station]);
  const guessed = useMemo(() => new Set(game.letters), [game.letters]);

  const update = useCallback(
    async (next: SavedPendu) => {
      setGame(next);
      await savePendu(day, next);
      if (!next.finished) return;
      onDone(true);
      setStats(await recordMode('pendu', day, addDays(day, -1), next.won));
      track('game_finished', { game: 'pendu', won: next.won, errors: next.errors, letters: next.letters.length });
      onGameFinished(next.won ? 9 : 0);
      setTimeout(() => setShowResult(true), 500);
    },
    [day, onDone],
  );

  const firstMove = () => {
    if (game.letters.length === 0 && game.wrongNames.length === 0) track('game_started', { game: 'pendu' });
  };

  const tryLetter = useCallback(
    (letter: string) => {
      if (game.finished || game.letters.includes(letter)) return;
      firstMove();
      const correct = letters.has(letter);
      const nextLetters = [...game.letters, letter];
      const errors = game.errors + (correct ? 0 : 1);
      const won = correct && isSolved(station.name, new Set(nextLetters));
      track('guess', { game: 'pendu', kind: 'letter', correct });
      update({ ...game, letters: nextLetters, errors, won, finished: won || errors >= MAX_PENDU_ERRORS });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, letters, station, update],
  );

  const tryName = (s: Station) => {
    if (game.finished) return;
    firstMove();
    const correct = s.id === station.id;
    track('guess', { game: 'pendu', kind: 'name', correct });
    if (correct) {
      setGuessing(false);
      setFeedback(null);
      update({ ...game, won: true, finished: true });
      return;
    }
    const errors = game.errors + 1;
    const left = MAX_PENDU_ERRORS - errors;
    setFeedback(
      left > 0
        ? `Ce n'est pas « ${s.name} ». Encore ${left} erreur${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}.`
        : `Ce n'est pas « ${s.name} ».`,
    );
    if (left <= 0) setGuessing(false);
    update({ ...game, wrongNames: [...game.wrongNames, s.id], errors, finished: left <= 0 });
  };

  // Clavier physique (ordinateur) : une touche lettre = une proposition.
  const handlerRef = useRef(tryLetter);
  useEffect(() => {
    handlerRef.current = tryLetter;
  }, [tryLetter]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !active || guessing || showResult) return;
    const g = globalThis as unknown as {
      addEventListener?: (t: string, cb: (e: KeyboardEvent) => void) => void;
      removeEventListener?: (t: string, cb: (e: KeyboardEvent) => void) => void;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const l = baseLetter(e.key);
      if (l) handlerRef.current(l);
    };
    g.addEventListener?.('keydown', onKey);
    return () => g.removeEventListener?.('keydown', onKey);
  }, [active, guessing, showResult]);

  const share = async () => {
    const result = game.won
      ? `trouvé ${game.errors === 0 ? 'sans erreur' : `avec ${game.errors} erreur${game.errors > 1 ? 's' : ''}`}`
      : 'pas trouvé';
    const message = `Terminus Paris · Pendu n°${dayNumber(day)} · ${result} · ${SITE_LABEL}\n${ticketLine(MAX_PENDU_ERRORS, game.errors)}`;
    track('result_shared', { game: 'pendu', won: game.won, errors: game.errors });
    if ((await shareMessage(message)) === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!loaded) return <View style={{ flex: 1 }} />;

  // Tuiles du nom : taille calculée pour que le morceau le plus long tienne sur une ligne.
  const parts = segments(station.name);
  const longest = Math.max(...parts.map((p) => p.length));
  const tile = Math.max(18, Math.min(38, Math.floor((width - 8) / longest) - 4));
  const compact = height < 760;
  const keyGap = 5;
  const keyW = Math.floor((width - keyGap * 9) / 10);
  const keyH = compact ? 38 : 46;

  return (
    <>
      <View style={[sharedStyles.ticket, { width }]}>
        <View>
          <Text style={sharedStyles.ticketMain}>Pendu n°{dayNumber(day)}</Text>
          <Text style={sharedStyles.ticketSub}>{formatDay(day)}</Text>
        </View>
        <View style={styles.hint}>
          <Text style={styles.hintLabel}>Lignes</Text>
          <View style={styles.hintBadges}>
            {station.lines.map((l) => (
              <LineBadge key={l} line={l as LineId} size={22} />
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.board, { width }]}>
        {game.finished && (
          <Text style={styles.verdict}>
            {game.won ? 'Bravo, c’est bien la station !' : 'Perdu ! La station était :'}
          </Text>
        )}
        <View style={styles.words}>
          {parts.map((part, pi) => (
            <View key={pi} style={styles.word}>
              {[...part].map((ch, ci) => {
                const l = baseLetter(ch);
                if (!l) {
                  // Espace, tiret, apostrophe, point : visibles d'office.
                  return (
                    <Text key={ci} style={[styles.punct, { fontSize: tile * 0.7, width: tile * 0.45 }]}>
                      {ch}
                    </Text>
                  );
                }
                const shown = guessed.has(l) || game.finished;
                const missed = game.finished && !guessed.has(l) && !game.won;
                return (
                  <View
                    key={ci}
                    style={[
                      styles.tile,
                      { width: tile, height: tile * 1.15, borderRadius: tile * 0.22 },
                      shown && styles.tileShown,
                      missed && styles.tileMissed,
                    ]}
                  >
                    <Text style={[styles.tileText, { fontSize: tile * 0.6 }, missed && { color: colors.danger }]}>
                      {shown ? ch.toUpperCase() : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={[sharedStyles.status, { width: width - 8, marginTop: 4 }]}>
        <View style={sharedStyles.statusRow}>
          <Text style={sharedStyles.statusLabel}>{game.finished ? 'Terminé' : 'Erreurs possibles'}</Text>
          <Text style={sharedStyles.statusValue}>{game.finished ? (game.won ? 'Trouvé' : 'Raté') : MAX_PENDU_ERRORS - game.errors}</Text>
        </View>
        <TicketTrack total={MAX_PENDU_ERRORS} used={game.errors} maxWidth={width - 8} />
      </View>

      {!game.finished && (
        <View style={[styles.keyboard, { width, marginTop: compact ? 8 : 12 }]}>
          {AZERTY.map((row) => (
            <View key={row} style={[styles.keyRow, { gap: keyGap }]}>
              {[...row].map((k) => {
                const used = guessed.has(k);
                const good = used && letters.has(k);
                return (
                  <Pressable
                    key={k}
                    disabled={used}
                    onPress={() => tryLetter(k)}
                    accessibilityLabel={`Lettre ${k}`}
                    style={({ pressed }) => [
                      styles.key,
                      { width: keyW, height: keyH },
                      used && (good ? styles.keyGood : styles.keyBad),
                      pressed && { transform: [{ translateY: 1 }] },
                    ]}
                  >
                    <Text style={[styles.keyText, used && { color: good ? '#FFFFFF' : colors.muted }]}>{k}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View style={[sharedStyles.actions, { marginTop: compact ? 8 : 12 }]}>
        {game.finished ? (
          <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
        ) : (
          <Button
            label="Proposer le nom"
            onPress={() => {
              setFeedback(null);
              setGuessing(true);
            }}
          />
        )}
      </View>

      <SearchModal
        visible={guessing}
        title="Quelle est cette station ?"
        hint={`Si ce n'est pas la bonne, tu perds un ticket. Indice : ${station.lines.length > 1 ? 'lignes' : 'ligne'} ${station.lines.join(', ').replace(/bis/g, ' bis')}.`}
        usedIds={new Set(game.wrongNames)}
        usedText="déjà proposée"
        errorsLeft={MAX_PENDU_ERRORS - game.errors}
        feedback={feedback}
        onSubmit={tryName}
        onClose={() => setGuessing(false)}
      />

      <InfoModal
        visible={showResult}
        title={game.won ? 'Station trouvée !' : 'Pas cette fois…'}
        onClose={() => setShowResult(false)}
        footer={<Button label={copied ? 'Résultat copié !' : 'Partager mon résultat'} onPress={share} primary />}
      >
        <Text style={[sharedStyles.bigScore, { fontSize: 30 }]}>{station.name}</Text>
        <View style={styles.resultLines}>
          {station.lines.map((l) => (
            <LineBadge key={l} line={l as LineId} size={26} />
          ))}
          {station.rer.length > 0 && <Text style={sharedStyles.rer}>RER {station.rer.join(' ')}</Text>}
        </View>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          {game.won
            ? game.errors === 0
              ? 'Sans aucune erreur, chapeau !'
              : `Trouvée avec ${game.errors} erreur${game.errors > 1 ? 's' : ''}.`
            : 'Une nouvelle station à deviner demain !'}
        </Text>
        <View style={sharedStyles.stats}>
          <Stat value={stats.played} label="Parties" />
          <Stat value={stats.complete} label="Trouvées" />
          <Stat value={stats.streak} label="Série" />
          <Stat value={stats.bestStreak} label="Record" />
        </View>
        <Text style={sharedStyles.unofficial}>Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</Text>
      </InfoModal>
    </>
  );
}

const styles = StyleSheet.create({
  hint: { alignItems: 'flex-end', gap: 3 },
  hintLabel: { fontFamily: fonts.bold, fontSize: 11, color: palette.sun, textTransform: 'uppercase', letterSpacing: 1 },
  hintBadges: { flexDirection: 'row', gap: 3 },
  board: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 8, columnGap: 10 },
  word: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tile: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileShown: { backgroundColor: palette.sun },
  tileMissed: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  tileText: { fontFamily: fonts.display, color: colors.ink },
  punct: { fontFamily: fonts.display, color: colors.ink, textAlign: 'center' },
  verdict: { fontFamily: fonts.heavy, fontSize: 14, color: colors.muted, marginBottom: 10 },
  keyboard: { gap: 6, alignItems: 'center' },
  keyRow: { flexDirection: 'row', justifyContent: 'center' },
  key: {
    borderRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGood: { backgroundColor: palette.mint, borderColor: palette.mint },
  keyBad: { backgroundColor: colors.missed, borderColor: colors.missed },
  keyText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  resultLines: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginVertical: 8 },
});
