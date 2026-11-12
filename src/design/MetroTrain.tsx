import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts, ui } from '../theme';
import { useReducedMotion } from './motion';

/**
 * Rame de métro de la charte (visuel 14) : 3 voitures blanches à bord bleu nuit, portes bleues doubles,
 * fenêtres bleu nuit, bande tomate en bas, phare jaune, plaque « TERMINUS · PARIS » sur la première voiture,
 * traînées blanches de vitesse. Elle traverse l'écran de droite à gauche, puis appelle onDone.
 * Sautée (onDone immédiat) si l'appareil demande de réduire les animations.
 */
export function MetroTrain({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [x] = useState(() => new Animated.Value(0));
  const carH = Math.min(150, height * 0.18);
  const carW = carH * 2.3;
  const trainW = carW * 3 + 12 * 2;
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (reduced) {
      done.current();
      return;
    }
    x.setValue(0);
    const anim = Animated.timing(x, {
      toValue: 1,
      duration: 1500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [reduced, x]);

  if (reduced) return null;
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [width + 40, -trainW - 160] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.train, { top: height / 2 - carH / 2, transform: [{ translateX }] }]}>
        {[0, 1, 2].map((car) => (
          <View
            key={car}
            style={[
              styles.car,
              { width: carW, height: carH, borderRadius: carH * 0.16 },
              car === 0 && { borderTopLeftRadius: carH * 0.42 },
            ]}
          >
            {car === 0 && (
              <>
                <View style={[styles.headlight, { width: carH * 0.12, height: carH * 0.12, borderRadius: carH * 0.06, top: carH * 0.56 }]} />
                <View style={styles.plaque}>
                  <Text style={[styles.plaqueText, { fontSize: carH * 0.085 }]}>TERMINUS · PARIS</Text>
                </View>
              </>
            )}
            <View style={[styles.windows, { top: carH * 0.24, paddingLeft: car === 0 ? carH * 0.38 : carH * 0.18 }]}>
              <View style={[styles.window, { width: carH * 0.28, height: carH * 0.3, borderRadius: carH * 0.06 }]} />
              <View style={[styles.door, { width: carH * 0.42, height: carH * 0.62 }]}>
                <View style={[styles.doorLeaf, { borderRadius: carH * 0.04 }]}>
                  <View style={[styles.doorWindow, { height: carH * 0.22 }]} />
                </View>
                <View style={[styles.doorLeaf, { borderRadius: carH * 0.04 }]}>
                  <View style={[styles.doorWindow, { height: carH * 0.22 }]} />
                </View>
              </View>
              <View style={[styles.window, { width: carH * 0.28, height: carH * 0.3, borderRadius: carH * 0.06 }]} />
              <View style={[styles.window, { width: carH * 0.28, height: carH * 0.3, borderRadius: carH * 0.06 }]} />
            </View>
            <View style={[styles.band, { height: carH * 0.07, bottom: carH * 0.1 }]} />
          </View>
        ))}
        {/* Traînées de vitesse, derrière la rame. */}
        <View style={[styles.trails, { height: carH }]}>
          {[0.2, 0.45, 0.7].map((t, i) => (
            <View key={t} style={[styles.trail, { top: carH * t, width: 70 + i * 30 }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  train: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  car: {
    backgroundColor: colors.white,
    borderWidth: ui.border + 1,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  headlight: { position: 'absolute', left: 10, backgroundColor: colors.sun },
  plaque: {
    position: 'absolute',
    top: 6,
    left: '30%',
    backgroundColor: colors.ink,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plaqueText: { fontFamily: fonts.heavy, color: colors.sun, letterSpacing: 1.2 },
  windows: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  window: { backgroundColor: colors.ink },
  door: { flexDirection: 'row', gap: 2 },
  doorLeaf: { flex: 1, backgroundColor: colors.blue, alignItems: 'center', paddingTop: 6 },
  doorWindow: { width: '60%', backgroundColor: colors.ink, borderRadius: 3 },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.tomato },
  trails: { justifyContent: 'flex-start', marginLeft: 6 },
  trail: { position: 'absolute', height: 5, borderRadius: 3, backgroundColor: colors.white },
});
