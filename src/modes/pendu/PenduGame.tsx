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
import { DayHeader } from '../../components/DayHeader';
import { submitScore } from '../../analytics/supabase';
import { NextGame } from '../../components/NextGame';
import { MetroTrain } from '../../design/MetroTrain';
import { solidShadow } from '../../design/ui';
import { alpha, colors, fonts, logoColors, mix, textOn, ui } from '../../theme';
import { segments } from './segments';
import { AZERTY, baseLetter, isSolved, MAX_PENDU_ERRORS, nameLetters, penduStation } from './pendu';

/** Tuile cachée : bleu nuit un peu éclairci, avec un trait clair (charte). */
const HIDDEN_BG = mix(colors.ink, colors.white, 0.1);

export function PenduGame({
  day,
  width,
  active,
  onDone,
  onNewDay,
  onRanking,
}: {
  /** Minuit est passé : l'app passe aux jeux du nouveau jour. */
  onNewDay?: () => void;
  /** Ouvre le classement du jour. */
  onRanking?: () => void;
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
  /** La rame traverse l'écran avant la révélation du nom. */
  const [train, setTrain] = useState(false);
  const [boardH, setBoardH] = useState(0);

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadPendu(day), loadModeStats('pendu')]);
      if (saved && saved.station === station.id) {
        setGame(saved);
        if (saved.finished) submitScore(day, 'pendu', { won: saved.won, errors: saved.errors });
      }
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
      submitScore(day, 'pendu', { won: next.won, errors: next.errors });
      setStats(await recordMode('pendu', day, addDays(day, -1), next.won));
      track('game_finished', { game: 'pendu', won: next.won, errors: next.errors, letters: next.letters.length });
      onGameFinished(next.won ? 9 : 0);
      setGuessing(false);
      setTrain(true);
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
  // Taille des tuiles : la plus grande qui tient en largeur (morceau le plus long sur une ligne)
  // et en hauteur (toutes les lignes dans la zone disponible, sans déborder).
  const fits = (t: number) => {
    const unit = (p: string) => [...p].reduce((w, ch) => w + (baseLetter(ch) ? t + 4 : t * 0.45 + 4), 0);
    let lines = 1;
    let used = 0;
    for (const p of parts) {
      const w = unit(p);
      if (w > width) return false;
      if (used && used + 12 + w > width) {
        lines++;
        used = w;
      } else used += (used ? 12 : 0) + w;
    }
    const h = lines * t * 1.15 + (lines - 1) * 10 + (game.finished ? 32 + 52 : 0);
    return !boardH || h <= boardH - 8;
  };
  let tile = 38;
  while (tile > 14 && !fits(tile)) tile--;
  const compact = height < 760;
  /** Très petits écrans : on masque le titre et on réduit les tickets pour laisser la place au nom. */
  const tight = height < 700;
  const keyGap = 5;
  const keyW = Math.floor((width - keyGap * 9) / 10);
  // Zone tactile de 44 px minimum (charte d'accessibilité).
  const keyH = compact ? ui.touch : ui.touch + 4;
  const revealed = game.finished && !train;
  let letterIndex = 0;

  return (
    <>
      <DayHeader width={width} title={`Le Pendu n°${dayNumber(day)}`} sub={formatDay(day)} />
      {!tight && <Text style={styles.title}>Devine la station</Text>}
      <View style={styles.hint}>
        <Text style={styles.hintLabel}>Indice</Text>
        {station.lines.map((l) => (
          <LineBadge key={l} line={l as LineId} size={24} ring />
        ))}
      </View>

      <View style={[styles.board, { width }]} onLayout={(e) => setBoardH(e.nativeEvent.layout.height)}>
        {revealed && (
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
                    <Text key={ci} style={[styles.punct, { fontSize: tile * 0.7, width: tile * 0.45 }]} accessibilityElementsHidden>
                      {ch}
                    </Text>
                  );
                }
                const shown = guessed.has(l) || revealed;
                const missed = revealed && !guessed.has(l) && !game.won;
                // Tuile révélée : couleurs du logo en alternance, légère rotation, lettre sans accent.
                const i = letterIndex++;
                const bg = logoColors[i % logoColors.length];
                const font = tile * 0.6;
                return (
                  <View
                    key={ci}
                    style={[
                      styles.tile,
                      { width: tile, height: tile * 1.15, borderRadius: ui.radiusFor(tile) },
                      shown
                        ? { backgroundColor: missed ? colors.surface : bg, borderColor: missed ? colors.tomato : bg, transform: [{ rotate: i % 2 ? '3deg' : '-3deg' }] }
                        : styles.tileHidden,
                    ]}
                  >
                    {shown ? (
                      <Text style={[styles.tileText, { fontSize: font, color: missed ? colors.ink : textOn(bg, font) }]}>{l}</Text>
                    ) : (
                      <View style={[styles.tileDash, { width: tile * 0.5 }]} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {revealed && <NextGame day={day} label="Prochain pendu" color={colors.white} onNewDay={onNewDay} />}
      </View>

      <View style={[sharedStyles.status, { width: width - 8, marginTop: 4 }]}>
        <View style={sharedStyles.statusRow}>
          <Text style={[sharedStyles.statusLabel, styles.light]}>{revealed ? 'Terminé' : 'Erreurs possibles'}</Text>
          <Text style={[sharedStyles.statusValue, styles.light]}>{revealed ? (game.won ? 'Trouvé' : 'Raté') : MAX_PENDU_ERRORS - game.errors}</Text>
        </View>
        <TicketTrack total={MAX_PENDU_ERRORS} used={game.errors} maxWidth={width - 8} compact={tight} />
      </View>

      {!revealed && (
        <View style={[styles.keyboard, { width, marginTop: compact ? 8 : 12 }]}>
          {AZERTY.map((row) => (
            <View key={row} style={[styles.keyRow, { gap: keyGap }]}>
              {[...row].map((k) => {
                const used = guessed.has(k);
                const good = used && letters.has(k);
                return (
                  <Pressable
                    key={k}
                    disabled={used || game.finished}
                    onPress={() => tryLetter(k)}
                    accessibilityRole="button"
                    accessibilityLabel={`Lettre ${k}`}
                    accessibilityState={{ disabled: used }}
                    style={({ pressed }) => [
                      styles.key,
                      { width: keyW, height: keyH, borderRadius: ui.radiusFor(keyH) * 0.8 },
                      !used && !pressed && solidShadow(colors.plus, 3),
                      used && (good ? styles.keyGood : styles.keyBad),
                      pressed && { transform: [{ translateY: 3 }] },
                    ]}
                  >
                    <Text style={[styles.keyText, used && !good && { color: alpha(colors.white, 0.5) }]}>{k}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View style={[sharedStyles.actions, { marginTop: compact ? 8 : 12 }]}>
        {revealed ? (
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

      {train && (
        <MetroTrain
          onDone={() => {
            setTrain(false);
            setTimeout(() => setShowResult(true), 700);
          }}
        />
      )}

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
        footer={
          <View style={{ gap: 10 }}>
            <Button label={copied ? 'Résultat copié !' : 'Partager mon résultat'} onPress={share} primary />
            {onRanking && (
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
            : 'Une nouvelle station à deviner demain, à minuit !'}
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
  light: { color: colors.white },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, color: colors.white, textAlign: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ui.space.xs + 2, marginTop: ui.space.s },
  hintLabel: { fontFamily: fonts.heavy, fontSize: 13, color: colors.white, marginRight: 2 },
  board: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10, columnGap: 12 },
  word: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tile: { borderWidth: ui.borderThin, alignItems: 'center', justifyContent: 'center' },
  tileHidden: { backgroundColor: HIDDEN_BG, borderColor: alpha(colors.white, 0.22) },
  tileDash: { height: 3, borderRadius: 2, backgroundColor: alpha(colors.white, 0.55), marginTop: '45%' },
  tileText: { fontFamily: fonts.heavy },
  punct: { fontFamily: fonts.display, color: colors.white, textAlign: 'center' },
  verdict: { fontFamily: fonts.heavy, fontSize: 15, color: colors.sun, marginBottom: 12 },
  keyboard: { gap: 6, alignItems: 'center' },
  keyRow: { flexDirection: 'row', justifyContent: 'center' },
  key: {
    backgroundColor: colors.surface,
    borderWidth: ui.borderThin,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGood: { backgroundColor: colors.mint, borderColor: colors.mint },
  keyBad: { backgroundColor: 'transparent', borderColor: alpha(colors.white, 0.25) },
  keyText: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
  resultLines: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginVertical: 8 },
});
