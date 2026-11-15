import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineBadge } from '../../components/LineBadge';
import { Logo } from '../../components/Logo';
import { BrickWall, Plaque } from '../../design/ui';
import { currentDayKey, dayNumber } from '../../game/day';
import { STATION_BY_ID } from '../../game/lookup';
import { colors, fonts } from '../../theme';
import { arretTrip } from './arret';
import { MetroRide } from './MetroRide';

type Phase = 'ready' | 'ride' | 'question' | 'answer' | 'end';

/**
 * Page de capture pour les réseaux (terminusparis.fr/?capture=arret) : le trajet du jour en plein écran
 * 9:16, sans boutons, à filmer avec l'enregistrement d'écran du téléphone.
 * Déroulé : les stations une à une, « Quelle ligne ? » avec un compte à rebours 3-2-1, (la réponse),
 * puis l'écran de fin avec le logo.
 * Paramètres : &stops=3 (stations montrées, 1 à 5), &reveal=1 (montre la réponse), &date=AAAA-MM-JJ (en local).
 */
export function ArretCapture({ stops: wanted, reveal }: { stops: number; reveal: boolean }) {
  const { width: vw, height: vh } = useWindowDimensions();
  const day = currentDayKey();
  const trip = useMemo(() => arretTrip(day), [day]);
  const names = trip.stops.map((id) => STATION_BY_ID.get(id)?.name ?? '?');
  const last = Math.max(0, Math.min(4, wanted - 1));
  const [phase, setPhase] = useState<Phase>('ready');
  const [stop, setStop] = useState(0);
  const [count, setCount] = useState(3);

  // Téléphone (écran plus allongé que 9:16) : tout l'écran. Ordinateur : cadre 9:16 au centre.
  const phone = vw / vh <= 9 / 16;
  const h = phone ? vh : Math.min(vh, (vw * 16) / 9);
  const w = phone ? vw : Math.min(vw, (h * 9) / 16);
  const rideW = w - 40;
  const rideH = Math.min(h * 0.6, rideW * 1.12);

  // Compte à rebours, puis la réponse (si demandée) et l'écran de fin.
  useEffect(() => {
    if (phase !== 'question') return;
    if (count > 0) {
      const t = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase(reveal ? 'answer' : 'end'), 300);
    return () => clearTimeout(t);
  }, [phase, count, reveal]);
  useEffect(() => {
    if (phase !== 'answer') return;
    const t = setTimeout(() => setPhase('end'), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <View style={styles.page}>
      <View style={[styles.frame, { width: w, height: h }]}>
        <BrickWall screen="arret" id="capture" />
        {phase === 'end' ? (
          <View style={styles.end}>
            <Logo tile={Math.min(40, w / 11)} plaque />
            <Text style={[styles.endText, { fontSize: w / 17 }]}>Joue chaque jour sur</Text>
            <Plaque label="terminusparis.fr" size={Math.max(14, w / 24)} />
          </View>
        ) : (
          <>
            <View style={styles.top}>
              <Plaque label={`Prochain arrêt · n°${dayNumber(day)}`} size={Math.max(11, w / 34)} />
              <Text style={[styles.title, { fontSize: w / 17 }]}>Tu es sur quelle ligne ? 🚇</Text>
            </View>
            <View style={{ width: rideW, height: rideH }}>
              {phase !== 'ready' && (
                <MetroRide
                  names={names}
                  stop={stop}
                  width={rideW}
                  height={rideH}
                  label={(i) => `Station ${i + 1}`}
                  onArrived={(i) => {
                    if (i < last) setTimeout(() => setStop(i + 1), 1300);
                    else setTimeout(() => setPhase('question'), 900);
                  }}
                />
              )}
              {phase === 'question' && count > 0 && (
                <View style={[styles.count, { width: w / 6, height: w / 6, borderRadius: w / 12 }]}>
                  <Text style={[styles.countText, { fontSize: w / 10 }]}>{count}</Text>
                </View>
              )}
              {(phase === 'question' || phase === 'answer') && (
                <View style={styles.box}>
                  {phase === 'answer' ? (
                    <View style={styles.answerRow}>
                      <Text style={[styles.boxTitle, { fontSize: w / 15 }]}>C’était la ligne</Text>
                      <LineBadge line={trip.line} size={w / 8} ring />
                    </View>
                  ) : (
                    <Text style={[styles.boxTitle, { fontSize: w / 13 }]}>Quelle ligne ? 🤔</Text>
                  )}
                  <Text style={[styles.boxSub, { fontSize: w / 26 }]}>
                    {phase === 'answer' ? 'T’avais trouvé ?' : 'Réponds en commentaire'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
        {phase === 'ready' && (
          <Pressable style={styles.start} onPress={() => setPhase('ride')} accessibilityRole="button">
            <Text style={styles.startText}>Lance l’enregistrement d’écran,{'\n'}puis touche ici pour démarrer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  top: { alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontFamily: fonts.heavy, color: colors.white, textAlign: 'center' },
  count: {
    position: 'absolute',
    top: 20,
    right: 6,
    backgroundColor: colors.sun,
    borderWidth: 4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fonts.display, color: colors.ink },
  box: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: 3,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  boxTitle: { fontFamily: fonts.display, color: colors.sun, textAlign: 'center' },
  boxSub: { fontFamily: fonts.heavy, color: colors.white, textAlign: 'center' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  end: { alignItems: 'center', gap: 18 },
  endText: { fontFamily: fonts.display, color: colors.white, textAlign: 'center', marginTop: 24 },
  start: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21,18,61,0.82)',
  },
  startText: { fontFamily: fonts.heavy, fontSize: 18, color: colors.white, textAlign: 'center', lineHeight: 26 },
});
