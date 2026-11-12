import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { track } from '../../analytics';
import { Button, Stat, sharedStyles } from '../../components/Button';
import { CriterionLabel } from '../../components/CriterionLabel';
import { InfoModal, infoStyles } from '../../components/InfoModal';
import { LineBadge } from '../../components/LineBadge';
import { SearchModal } from '../../components/SearchModal';
import { formatDay, shareMessage, SITE_LABEL, ticketLine } from '../../components/share';
import { TicketTrack } from '../../components/TicketTrack';
import { addDays, dayNumber } from '../../game/day';
import { STATION_BY_ID } from '../../game/lookup';
import {
  EMPTY_MODE_STATS,
  loadDefi,
  loadModeStats,
  recordMode,
  saveDefi,
  type ModeStats,
} from '../../game/storage';
import type { LineId, Station } from '../../game/types';
import { onGameFinished } from '../../store/review';
import { DayHeader } from '../../components/DayHeader';
import { submitScore } from '../../analytics/supabase';
import { NextGame } from '../../components/NextGame';
import { MetroTrain } from '../../design/MetroTrain';
import { usePop } from '../../design/motion';
import { Card, Plaque } from '../../design/ui';
import { colors, fonts, textOn, ui, type ScreenId } from '../../theme';
import { DEFI_MAX_ERRORS, defiSignature, generateDefi } from './defi';

export function DefiGame({
  day,
  width,
  onDone,
  onScreen,
  onNewDay,
  onRanking,
}: {
  /** Minuit est passé : l'app passe aux jeux du nouveau jour. */
  onNewDay?: () => void;
  /** Ouvre le classement du jour. */
  onRanking?: () => void;
  day: string;
  width: number;
  onDone: (done: boolean) => void;
  /** Fond à afficher : violet pendant le défi, menthe pour les réponses (charte). */
  onScreen: (screen: ScreenId) => void;
}) {
  const defi = useMemo(() => generateDefi(day), [day]);
  const total = defi.answers.length;
  const [found, setFound] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const [finished, setFinished] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [stats, setStats] = useState<ModeStats>(EMPTY_MODE_STATS);
  const [loaded, setLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<'a' | 'b' | null>(null);
  const [listH, setListH] = useState(0);
  /** La rame traverse l'écran avant les réponses. */
  const [train, setTrain] = useState(false);
  const popA = usePop(80, day);
  const popB = usePop(220, day);

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadDefi(day), loadModeStats('defi')]);
      if (saved && saved.defi === defiSignature(defi)) {
        setFound(saved.found);
        setErrors(saved.errors);
        setFinished(saved.finished);
        setGaveUp(saved.gaveUp);
        if (saved.finished) {
          onScreen('reponse');
          submitScore(day, 'defi', { found: saved.found, errors: saved.errors });
        }
      }
      setStats(s);
      setLoaded(true);
    })();
    return () => onScreen('defi');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, defi]);

  const finish = async (finalFound: string[], finalErrors: number, abandoned: boolean) => {
    setSearching(false);
    setTrain(true);
    setGaveUp(abandoned);
    onDone(true);
    submitScore(day, 'defi', { found: finalFound, errors: finalErrors });
    await saveDefi(day, { defi: defiSignature(defi), found: finalFound, errors: finalErrors, finished: true, gaveUp: abandoned });
    setStats(await recordMode('defi', day, addDays(day, -1), finalFound.length === total));
    track('game_finished', { game: 'defi', found: finalFound.length, total, errors: finalErrors, gave_up: abandoned });
    onGameFinished(finalFound.length === total ? 9 : 0);
  };

  /** Fin du passage de la rame : écran des réponses sur fond menthe, puis le résultat. */
  const afterTrain = () => {
    setTrain(false);
    setFinished(true);
    onScreen('reponse');
    setTimeout(() => setShowResult(true), 700);
  };

  const submit = (station: Station) => {
    if (finished) return;
    const duplicate = found.includes(station.id);
    const correct = !duplicate && defi.answers.includes(station.id);
    const nextFound = correct ? [...found, station.id] : found;
    const nextErrors = correct ? errors : errors + 1;
    if (found.length === 0 && errors === 0) track('game_started', { game: 'defi' });
    track('guess', { game: 'defi', correct, duplicate });
    setFound(nextFound);
    setErrors(nextErrors);
    if (correct) {
      setSearching(false);
      setFeedback(null);
    } else {
      const left = DEFI_MAX_ERRORS - nextErrors;
      const why = duplicate ? 'est déjà dans ta liste' : 'ne remplit pas les deux critères';
      setFeedback(left > 0 ? `« ${station.name} » ${why}. Encore ${left} erreur${left > 1 ? 's' : ''} possible${left > 1 ? 's' : ''}.` : `« ${station.name} » ${why}.`);
    }
    if (nextFound.length === total || nextErrors >= DEFI_MAX_ERRORS) {
      setSearching(false);
      finish(nextFound, nextErrors, false);
    } else {
      saveDefi(day, { defi: defiSignature(defi), found: nextFound, errors: nextErrors, finished: false, gaveUp: false });
    }
  };

  const share = async () => {
    const message = `Terminus Paris · Défi n°${dayNumber(day)} · ${found.length}/${total} · ${SITE_LABEL}\n${ticketLine(DEFI_MAX_ERRORS, errors)}`;
    track('result_shared', { game: 'defi', found: found.length, total, errors });
    if ((await shareMessage(message)) === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!loaded) return <View style={{ flex: 1 }} />;

  const caseW = Math.min(118, Math.floor((width - 56) / 2));
  const caseH = Math.min(caseW, 96);
  const whiteText = { color: colors.white };

  return (
    <>
      {finished ? (
        <>
          <Plaque label="Réponse" style={{ marginTop: 2 }} />
          <Text style={[styles.answerTitle, { color: textOn(colors.mint, 24) }]} numberOfLines={2}>
            {defi.a.label} × {defi.b.label}
          </Text>
          <Card style={[styles.answerCard, { width }]}>
            <View style={{ flex: 1 }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
              {[...found, ...defi.answers.filter((id) => !found.includes(id))].map((id) => {
                const s = STATION_BY_ID.get(id)!;
                const mine = found.includes(id);
                const rowH = listH ? Math.min(46, listH / total) : 40;
                return (
                  <View key={id} style={[styles.answerRow, { height: rowH }]}>
                    <View style={[styles.mark, mine ? styles.markMine : styles.markMissed]}>
                      <Text style={[styles.markText, { color: mine ? colors.ink : colors.muted }]}>{mine ? '✓' : '–'}</Text>
                    </View>
                    <Text
                      style={[styles.answerName, !mine && { color: colors.muted }, rowH < 34 && { fontSize: 13 }]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    <View style={styles.badges}>
                      {s.lines.slice(0, 5).map((l) => (
                        <LineBadge key={l} line={l as LineId} size={rowH < 34 ? 16 : 20} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
          <Text style={[styles.howMany, { color: textOn(colors.mint, 24) }]}>
            Tu en avais {found.length} sur {total}
          </Text>
          {/* Sur menthe, petit texte en bleu nuit (règle de contraste de la charte). */}
          <NextGame day={day} label="Prochain défi" color={colors.ink} onNewDay={onNewDay} />
          <View style={sharedStyles.actions}>
            <Button label="Voir mon résultat" onPress={() => setShowResult(true)} primary />
          </View>
        </>
      ) : (
        <>
          <DayHeader
            width={width}
            title={`Défi n°${dayNumber(day)}`}
            sub={formatDay(day)}
            right={
              <Text style={styles.count}>
                {found.length}
                <Text style={styles.countTotal}>/{total}</Text>
              </Text>
            }
          />
          <View style={[styles.criteria, { width }]}>
            <Animated.View style={[popA, { transform: [...popA.transform, { rotate: '-3deg' }] }]}>
              <Pressable
                style={[styles.criterion, { width: caseW, height: caseH }]}
                onPress={() => setInfo('a')}
                accessibilityRole="button"
                accessibilityLabel={`Critère : ${defi.a.label}`}
              >
                <CriterionLabel criterion={defi.a} size={caseW} height={caseH} />
              </Pressable>
            </Animated.View>
            <Text style={styles.times}>×</Text>
            <Animated.View style={[popB, { transform: [...popB.transform, { rotate: '3deg' }] }]}>
              <Pressable
                style={[styles.criterion, { width: caseW, height: caseH }]}
                onPress={() => setInfo('b')}
                accessibilityRole="button"
                accessibilityLabel={`Critère : ${defi.b.label}`}
              >
                <CriterionLabel criterion={defi.b} size={caseW} height={caseH} />
              </Pressable>
            </Animated.View>
          </View>
          <Text style={[styles.goal, whiteText]}>Trouve les {total} stations qui cochent les deux</Text>
          <View style={[styles.list, { width }]} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
            {(() => {
              // Toutes les cases tiennent sans défilement (jusqu'à 8), sur 3 colonnes si l'écran est petit.
              const GAP = ui.space.s;
              const fit = (cols: number) => {
                const rows = Math.ceil(total / cols);
                return listH ? Math.floor((listH - GAP * (rows - 1)) / rows) : 44;
              };
              const cols = fit(2) >= 34 ? 2 : 3;
              const chipH = Math.max(28, Math.min(52, fit(cols)));
              const chipW = (width - GAP * (cols - 1)) / cols;
              const tiny = chipH < 40;
              return [...found, ...Array(total - found.length).fill(null)].map((id: string | null, i) => {
                const s = id ? STATION_BY_ID.get(id) : undefined;
                return s ? (
                  <View key={id} style={[styles.chip, { width: chipW, height: chipH, borderRadius: ui.radiusFor(chipH) }]}>
                    <Text style={[styles.chipName, tiny && { fontSize: 12 }]} numberOfLines={tiny ? 1 : 2}>
                      {s.name}
                    </Text>
                    {!tiny && (
                      <View style={styles.badges}>
                        {s.lines.slice(0, 5).map((l) => (
                          <LineBadge key={l} line={l as LineId} size={15} />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  // Une case « ? » se touche pour proposer une station, comme le bouton du bas.
                  <Pressable
                    key={`vide-${i}`}
                    onPress={() => {
                      setFeedback(null);
                      setSearching(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Proposer une station"
                    style={({ pressed }) => [
                      styles.chip,
                      styles.mystery,
                      { width: chipW, height: chipH, borderRadius: ui.radiusFor(chipH) },
                      pressed && { backgroundColor: colors.accentSoft, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={[styles.chipQ, { fontSize: Math.min(26, chipH * 0.6) }]}>?</Text>
                  </Pressable>
                );
              });
            })()}
          </View>

          <View style={[sharedStyles.status, { width: width - 24 }]}>
            <View style={sharedStyles.statusRow}>
              <Text style={[sharedStyles.statusLabel, whiteText]}>Erreurs possibles</Text>
              <Text style={[sharedStyles.statusValue, whiteText]}>{DEFI_MAX_ERRORS - errors}</Text>
            </View>
            <TicketTrack total={DEFI_MAX_ERRORS} used={errors} />
          </View>

          <View style={sharedStyles.actions}>
            <Button label="J'abandonne" tone="danger" onPress={() => finish(found, errors, true)} />
            <Button
              label="Proposer une station"
              primary
              onPress={() => {
                setFeedback(null);
                setSearching(true);
              }}
            />
          </View>
        </>
      )}

      {train && <MetroTrain onDone={afterTrain} />}

      <SearchModal
        visible={searching}
        row={defi.a}
        col={defi.b}
        usedIds={new Set(found)}
        usedText="déjà trouvée"
        errorsLeft={DEFI_MAX_ERRORS - errors}
        feedback={feedback}
        onSubmit={submit}
        onClose={() => setSearching(false)}
      />

      <InfoModal visible={!!info} title={info ? defi[info].label : ''} onClose={() => setInfo(null)}>
        <Text style={infoStyles.p}>{info ? defi[info].description : ''}</Text>
      </InfoModal>

      <InfoModal
        visible={showResult}
        title={found.length === total ? 'Défi réussi !' : gaveUp ? 'Défi abandonné' : 'Fin du défi'}
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
        <Text style={sharedStyles.bigScore}>
          {found.length}/{total}
        </Text>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          {defi.a.label} × {defi.b.label}. Nouveau défi demain !
        </Text>
        <View style={sharedStyles.stats}>
          <Stat value={stats.played} label="Défis" />
          <Stat value={stats.complete} label="Complets" />
          <Stat value={stats.streak} label="Série" />
          <Stat value={stats.bestStreak} label="Record" />
        </View>
        <Text style={sharedStyles.unofficial}>Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</Text>
      </InfoModal>
    </>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: fonts.display, fontSize: 24, color: colors.white },
  countTotal: { fontSize: 16, color: colors.sun },
  criteria: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ui.space.m, marginTop: ui.space.xs },
  criterion: { alignItems: 'stretch', justifyContent: 'center' },
  times: { fontFamily: fonts.display, fontSize: 30, color: colors.sun },
  goal: { fontFamily: fonts.heavy, fontSize: 14, textAlign: 'center', marginTop: ui.space.m, marginBottom: ui.space.m },
  list: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'center',
    gap: ui.space.s,
    overflow: 'hidden',
  },
  chip: {
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderWidth: ui.border,
    borderColor: colors.ink,
    justifyContent: 'center',
    gap: 3,
  },
  mystery: { borderStyle: 'dashed', alignItems: 'center' },
  chipName: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  chipQ: { fontFamily: fonts.display, color: colors.blue },
  badges: { flexDirection: 'row', gap: 3 },
  answerTitle: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, textAlign: 'center', marginTop: ui.space.m, marginBottom: ui.space.m },
  answerCard: { flex: 1, minHeight: 0, paddingHorizontal: ui.space.l, paddingVertical: ui.space.s },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  markMine: { backgroundColor: colors.mint },
  markMissed: { backgroundColor: colors.missed },
  markText: { fontFamily: fonts.heavy, fontSize: 12 },
  answerName: { flex: 1, fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  howMany: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: ui.space.l },
});
