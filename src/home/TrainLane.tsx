import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../design/motion';
import { alpha, colors, fonts } from '../theme';

/** Une rame passe toutes les 3 secondes (traversée de 1,6 s, puis 1,4 s de voie libre). */
const CROSS_MS = 1600;
const PERIOD_MS = 3000;

/**
 * Voie de métro de l'accueil : une petite rame de la charte (voitures blanches à bord bleu nuit,
 * portes bleues, bande tomate, phare jaune) traverse l'écran de droite à gauche toutes les 3 secondes.
 * Si l'appareil demande moins d'animations, la rame reste à l'arrêt au milieu de la voie.
 */
export function TrainLane({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const [x] = useState(() => new Animated.Value(0));
  const carH = 38;
  const carW = carH * 2.3;
  const trainW = carW * 3 + 8 * 2;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: CROSS_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(PERIOD_MS - CROSS_MS),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, x]);

  const translateX = reduced
    ? (width - trainW) / 2
    : x.interpolate({ inputRange: [0, 1], outputRange: [width + 20, -trainW - 60] });

  return (
    <View style={[styles.lane, { width, height: carH + 22 }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Voie : traverses et deux rails */}
      <View style={styles.sleepers}>
        {Array.from({ length: Math.ceil(width / 18) }, (_, i) => (
          <View key={i} style={styles.sleeper} />
        ))}
      </View>
      <View style={[styles.rail, { bottom: 9 }]} />
      <View style={[styles.rail, { bottom: 3 }]} />

      <Animated.View style={[styles.train, { bottom: 10, transform: [{ translateX }] }]}>
        {[0, 1, 2].map((car) => (
          <View
            key={car}
            style={[
              styles.car,
              { width: carW, height: carH, borderRadius: carH * 0.18 },
              car === 0 && { borderTopLeftRadius: carH * 0.45 },
            ]}
          >
            {car === 0 && <View style={[styles.headlight, { top: carH * 0.55 }]} />}
            {car === 1 && (
              <View style={styles.plaque}>
                <Text style={styles.plaqueText}>TERMINUS</Text>
              </View>
            )}
            <View style={[styles.windows, { paddingLeft: car === 0 ? carH * 0.42 : carH * 0.2 }]}>
              <View style={styles.window} />
              <View style={styles.door}>
                <View style={styles.leaf} />
                <View style={styles.leaf} />
              </View>
              <View style={styles.window} />
            </View>
            <View style={styles.band} />
          </View>
        ))}
        {/* Traînées de vitesse derrière la rame */}
        <View style={styles.trails}>
          {[0.25, 0.55].map((t, i) => (
            <View key={t} style={[styles.trail, { top: carH * t, width: 40 + i * 20 }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lane: { overflow: 'hidden', alignSelf: 'center' },
  sleepers: { position: 'absolute', left: 0, right: 0, bottom: 1, height: 12, flexDirection: 'row', gap: 10 },
  sleeper: { width: 8, height: 12, borderRadius: 2, backgroundColor: alpha(colors.white, 0.12) },
  rail: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: alpha(colors.white, 0.35) },
  train: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  car: { backgroundColor: colors.white, borderWidth: 2.5, borderColor: colors.ink, overflow: 'hidden' },
  headlight: { position: 'absolute', left: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sun },
  plaque: { position: 'absolute', top: 3, alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 3, paddingHorizontal: 4 },
  plaqueText: { fontFamily: fonts.heavy, fontSize: 6, letterSpacing: 1, color: colors.sun },
  windows: { position: 'absolute', top: 11, left: 0, right: 0, flexDirection: 'row', gap: 6 },
  window: { width: 12, height: 11, borderRadius: 3, backgroundColor: colors.ink },
  door: { flexDirection: 'row', gap: 1.5 },
  leaf: { width: 9, height: 22, borderRadius: 2, backgroundColor: colors.blue },
  band: { position: 'absolute', left: 0, right: 0, bottom: 3, height: 3, backgroundColor: colors.tomato },
  trails: { justifyContent: 'flex-start' },
  trail: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: alpha(colors.white, 0.5) },
});
