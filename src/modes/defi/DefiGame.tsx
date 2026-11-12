import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, fonts, palette } from '../../theme';
import { DEFI_MAX_ERRORS, defiSignature, generateDefi } from './defi';

export function DefiGame({ day, width, onDone }: { day: string; width: number; onDone: (done: boolean) => void }) {
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

  useEffect(() => {
    (async () => {
      const [saved, s] = await Promise.all([loadDefi(day), loadModeStats('defi')]);
      if (saved && saved.defi === defiSignature(defi)) {
        setFound(saved.found);
        setErrors(saved.errors);
        setFinished(saved.finished);
        setGaveUp(saved.gaveUp);
      }
      setStats(s);
      setLoaded(true);
    })();
  }, [day, defi]);

  const finish = async (finalFound: string[], finalErrors: number, abandoned: boolean) => {
    setFinished(true);
    setGaveUp(abandoned);
    onDone(true);
    await saveDefi(day, { defi: defiSignature(defi), found: finalFound, errors: finalErrors, finished: true, gaveUp: abandoned });
    setStats(await recordMode('defi', day, addDays(day, -1), finalFound.length === total));
    track('game_finished', { game: 'defi', found: finalFound.length, total, errors: finalErrors, gave_up: abandoned });
    onGameFinished(finalFound.length === total ? 9 : 0);
    setTimeout(() => setShowResult(true), 400);
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

  // Pendant la partie : les stations trouvées puis des cases vides. À la fin : toutes les réponses.
  const shown: (string | null)[] = finished
    ? [...found, ...defi.answers.filter((id) => !found.includes(id))]
    : [...found, ...Array(total - found.length).fill(null)];
  const tile = Math.min(110, Math.floor((width - 40) / 2));
  // Les cases rétrécissent pour que toutes les réponses tiennent sans défilement (jusqu'à 8),
  // sur 3 colonnes si l'écran est vraiment petit.
  const GAP = 6;
  const fit = (cols: number) => {
    const rows = Math.ceil(shown.length / cols);
    return listH ? Math.floor((listH - GAP * (rows - 1)) / rows) : 44;
  };
  const cols = fit(2) >= 30 ? 2 : 3;
  const chipH = Math.max(24, Math.min(48, fit(cols)));
  const chipW = cols === 2 ? '48%' : '31.5%';
  const tiny = chipH < 38;

  return (
    <>
      <View style={[sharedStyles.ticket, { width }]}>
        <View>
          <Text style={sharedStyles.ticketMain}>Défi n°{dayNumber(day)}</Text>
          <Text style={sharedStyles.ticketSub}>{formatDay(day)}</Text>
        </View>
        <Text style={styles.count}>
          {found.length}
          <Text style={styles.countTotal}>/{total}</Text>
        </Text>
      </View>

      <View style={[styles.criteria, { width }]}>
        <Pressable
          style={[styles.criterion, { width: tile, height: Math.min(tile, 92) }]}
          onPress={() => setInfo('a')}
          accessibilityLabel={`Critère : ${defi.a.label}`}
        >
          <CriterionLabel criterion={defi.a} size={Math.min(tile, 92)} />
        </Pressable>
        <Text style={styles.times}>×</Text>
        <Pressable
          style={[styles.criterion, { width: tile, height: Math.min(tile, 92) }]}
          onPress={() => setInfo('b')}
          accessibilityLabel={`Critère : ${defi.b.label}`}
        >
          <CriterionLabel criterion={defi.b} size={Math.min(tile, 92)} />
        </Pressable>
      </View>
      <Text style={styles.goal}>
        {finished ? 'Toutes les réponses' : `Trouve les ${total} stations qui remplissent les deux critères`}
      </Text>

      <View style={[styles.list, { width }]} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        {shown.map((id, i) => {
          const s = id ? STATION_BY_ID.get(id) : undefined;
          const mine = !!id && found.includes(id);
          return (
            <View
              key={id ?? `vide-${i}`}
              style={[
                styles.chip,
                { width: chipW, height: chipH, paddingVertical: tiny ? 2 : 6 },
                !s && styles.chipEmpty,
                s && !mine && styles.chipMissed,
                mine && styles.chipFound,
              ]}
            >
              {s ? (
                <>
                  <Text
                    style={[styles.chipName, tiny && { fontSize: 11 }, !mine && { color: colors.muted }]}
                    numberOfLines={tiny ? 1 : 2}
                  >
                    {s.name}
                  </Text>
                  {!tiny && (
                  <View style={styles.badges}>
                    {s.lines.slice(0, 5).map((l) => (
                      <LineBadge key={l} line={l as LineId} size={15} />
                    ))}
                  </View>
                  )}
                </>
              ) : (
                <Text style={styles.chipQ}>?</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={[sharedStyles.status, { width: width - 24 }]}>
        <View style={sharedStyles.statusRow}>
          <Text style={sharedStyles.statusLabel}>{finished ? 'Terminé' : 'Erreurs possibles'}</Text>
          <Text style={sharedStyles.statusValue}>{finished ? `${found.length}/${total}` : DEFI_MAX_ERRORS - errors}</Text>
        </View>
        <TicketTrack total={DEFI_MAX_ERRORS} used={errors} />
      </View>

      <View style={sharedStyles.actions}>
        {finished ? (
          <Button label="Voir le résultat" onPress={() => setShowResult(true)} primary />
        ) : (
          <>
            <Button label="J'abandonne" tone="danger" onPress={() => finish(found, errors, true)} />
            <Button
              label="Proposer une station"
              primary
              onPress={() => {
                setFeedback(null);
                setSearching(true);
              }}
            />
          </>
        )}
      </View>

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
        footer={<Button label={copied ? 'Résultat copié !' : 'Partager mon résultat'} onPress={share} primary />}
      >
        <Text style={sharedStyles.bigScore}>
          {found.length}/{total}
        </Text>
        <Text style={[infoStyles.p, { textAlign: 'center' }]}>
          {defi.a.label} × {defi.b.label}. Toutes les réponses sont affichées sous les critères. Nouveau défi demain !
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
  count: { fontFamily: fonts.display, fontSize: 24, color: '#FFFFFF' },
  countTotal: { fontSize: 16, color: palette.sun },
  criteria: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  criterion: { alignItems: 'stretch', justifyContent: 'center' },
  times: { fontFamily: fonts.display, fontSize: 26, color: palette.sun },
  goal: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 6 },
  list: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 3,
  },
  chipEmpty: { borderStyle: 'dashed', alignItems: 'center', backgroundColor: 'transparent' },
  chipFound: { borderColor: palette.mint, backgroundColor: '#E3F7F0' },
  chipMissed: { backgroundColor: colors.missed, borderColor: colors.missed },
  chipName: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  chipQ: { fontFamily: fonts.display, fontSize: 18, color: colors.border },
  badges: { flexDirection: 'row', gap: 2 },
});
