import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineBadge } from '../../components/LineBadge';
import { Logo } from '../../components/Logo';
import { BrickWall, Plaque } from '../../design/ui';
import { currentDayKey, dayNumber } from '../../game/day';
import { STATION_BY_ID } from '../../game/lookup';
import { colors, fonts } from '../../theme';
import { arretTrip } from './arret';
import { MetroRide } from './MetroRide';

/**
 * Page de capture pour les réseaux (terminusparis.fr/?capture=arret) : le trajet du jour en plein écran
 * 9:16, sans boutons, à filmer avec l'enregistrement d'écran du téléphone.
 * Paramètres : &stops=3 (stations montrées, 1 à 5), &reveal=1 (affiche la réponse à la fin), &date=AAAA-MM-JJ (en local).
 */
export function ArretCapture({ stops: wanted, reveal }: { stops: number; reveal: boolean }) {
  const { width: vw, height: vh } = useWindowDimensions();
  const day = currentDayKey();
  const trip = useMemo(() => arretTrip(day), [day]);
  const names = trip.stops.map((id) => STATION_BY_ID.get(id)?.name ?? '?');
  const last = Math.max(0, Math.min(4, wanted - 1));
  const [started, setStarted] = useState(false);
  const [stop, setStop] = useState(0);
  const [ended, setEnded] = useState(false);

  // Téléphone (écran plus allongé que 9:16) : tout l'écran. Ordinateur : cadre 9:16 au centre.
  const phone = vw / vh <= 9 / 16;
  const h = phone ? vh : Math.min(vh, (vw * 16) / 9);
  const w = phone ? vw : Math.min(vw, (h * 9) / 16);

  return (
    <View style={styles.page}>
      <View style={[styles.frame, { width: w, height: h }]}>
        <BrickWall screen="arret" id="capture" />
        <View style={styles.top}>
          <Logo tile={Math.min(34, w / 12)} plaque />
          <Plaque label={`Prochain arrêt n°${dayNumber(day)}`} size={Math.max(12, w / 30)} style={{ marginTop: 14 }} />
        </View>
        <View style={{ flex: 1, width: w - 32, marginVertical: 14 }}>
          {started && (
            <MetroRide
              names={names}
              stop={stop}
              width={w - 32}
              height={h * 0.6}
              label={(i) => `Station ${i + 1}`}
              onArrived={(i) => {
                if (i < last) setTimeout(() => setStop(i + 1), 1300);
                else setTimeout(() => setEnded(true), 900);
              }}
            />
          )}
        </View>
        <View style={styles.bottom}>
          {ended && reveal ? (
            <View style={styles.revealRow}>
              <Text style={[styles.big, { fontSize: w / 15 }]}>C’était la ligne</Text>
              <LineBadge line={trip.line} size={w / 8} ring />
              <Text style={[styles.big, { fontSize: w / 15 }]}>!</Text>
            </View>
          ) : (
            <Text style={[styles.big, { fontSize: w / 13 }]}>{ended ? 'Quelle ligne ? 🤔' : 'Devine la ligne…'}</Text>
          )}
          <Text style={[styles.cta, { fontSize: w / 26 }]}>
            {ended && !reveal ? 'Réponds en commentaire · joue sur terminusparis.fr' : 'terminusparis.fr'}
          </Text>
        </View>
        {!started && (
          <Pressable style={styles.start} onPress={() => setStarted(true)} accessibilityRole="button">
            <Text style={styles.startText}>Lance l’enregistrement d’écran,{'\n'}puis touche ici pour démarrer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { overflow: 'hidden', alignItems: 'center', backgroundColor: colors.blue },
  top: { alignItems: 'center', marginTop: '7%' },
  bottom: { alignItems: 'center', marginBottom: '9%', paddingHorizontal: 16, gap: 8 },
  big: { fontFamily: fonts.display, color: colors.white, textAlign: 'center' },
  cta: { fontFamily: fonts.heavy, color: colors.sun, textAlign: 'center' },
  revealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  start: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21,18,61,0.82)',
  },
  startText: { fontFamily: fonts.heavy, fontSize: 18, color: colors.white, textAlign: 'center', lineHeight: 26 },
});
