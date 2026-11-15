import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BrickWall } from '../../design/ui';
import { useReducedMotion } from '../../design/motion';
import { alpha, colors, fonts, mix } from '../../theme';

/**
 * Vue depuis l'intérieur d'une rame (charte Terminus, aucun élément officiel) : par la fenêtre, le tunnel
 * défile, puis la rame ralentit et s'arrête à quai devant la plaque de la station.
 *
 * `stop` est l'indice de la station à atteindre : quand il augmente, la rame repart et va jusqu'à
 * la suivante, puis appelle `onArrived`. `replay` (compteur) rejoue le trajet depuis la 1re station.
 */
export function MetroRide({
  names,
  stop,
  replay = 0,
  width,
  height,
  label,
  onArrived,
  fast,
}: {
  names: string[];
  stop: number;
  replay?: number;
  width: number;
  height: number;
  /** Texte du bandeau au-dessus de la fenêtre à l'arrêt (« Station 2 sur 5 »). */
  label?: (index: number) => string;
  onArrived?: (index: number) => void;
  /** Trajet plus rapide (révision du trajet). */
  fast?: boolean;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);
  const [moving, setMoving] = useState(true);
  const [platformX] = useState(() => new Animated.Value(1.4));
  const [lights] = useState(() => new Animated.Value(0));
  const arrived = useRef(onArrived);
  useEffect(() => {
    arrived.current = onArrived;
  }, [onArrived]);
  /** Station où se trouve la rame (null : dans le tunnel avant la 1re). */
  const at = useRef<number | null>(null);
  const run = useRef(0);

  const winW = width - 28;
  const winH = Math.max(120, height * 0.62);

  // Lumières du tunnel : défilent en boucle tant que la rame roule.
  useEffect(() => {
    if (!moving || reduced) return;
    lights.setValue(0);
    const loop = Animated.loop(
      Animated.timing(lights, { toValue: 1, duration: 260, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [moving, reduced, lights]);

  const play = useCallback(
    (to: number, from: number | null) => {
      const id = ++run.current;
      const t = fast ? 0.6 : 1;
      const timing = (value: number, duration: number, easing: (x: number) => number) =>
        new Promise<void>((resolve) =>
          Animated.timing(platformX, { toValue: value, duration: duration * t, easing, useNativeDriver: true }).start(() =>
            resolve(),
          ),
        );
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms * t));
      (async () => {
        for (let i = from === null ? 0 : from + 1; i <= to; i++) {
          if (run.current !== id) return;
          setMoving(true);
          if (at.current !== null && !reduced) await timing(-1.5, 1300, Easing.in(Easing.cubic)); // départ
          if (run.current !== id) return;
          setShown(i);
          if (!reduced) {
            platformX.setValue(1.5);
            await wait(900); // tunnel
            if (run.current !== id) return;
            await timing(0, 2000, Easing.out(Easing.cubic)); // arrivée à quai
          } else {
            platformX.setValue(0);
          }
          if (run.current !== id) return;
          at.current = i;
          setMoving(false);
          if (i < to) await wait(700);
        }
        if (run.current === id) arrived.current?.(to);
      })();
    },
    [fast, platformX, reduced],
  );

  // Nouvelle station demandée : la rame avance jusqu'à elle.
  useEffect(() => {
    if (at.current === stop) return;
    play(stop, at.current);
  }, [stop, play]);

  // Revoir le trajet depuis le début.
  useEffect(() => {
    if (!replay) return;
    at.current = null;
    play(stop, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  useEffect(
    () => () => {
      run.current++;
    },
    [],
  );

  const name = shown !== null ? names[shown] : '';
  const nameSize = Math.min(34, Math.max(17, (winW * 0.78) / Math.max(8, name.length * 0.56)));
  const spacing = 150;
  const lightsX = lights.interpolate({ inputRange: [0, 1], outputRange: [0, -spacing] });
  const platX = platformX.interpolate({ inputRange: [-2, 2], outputRange: [-2 * winW, 2 * winW] });

  return (
    <View style={[styles.car, { width, height }]} accessibilityLabel={moving ? 'La rame roule' : `Station ${name}`}>
      {/* Bandeau au-dessus de la fenêtre */}
      <View style={styles.band}>
        <Text style={styles.bandText} numberOfLines={1}>
          {moving || shown === null ? '🚇  En route…' : (label?.(shown) ?? '')}
        </Text>
      </View>

      {/* Fenêtre */}
      <View style={[styles.window, { width: winW, height: winH }]}>
        {/* Tunnel */}
        <View style={[StyleSheet.absoluteFill, styles.tunnel]}>
          <View style={[styles.cable, { top: winH * 0.22 }]} />
          <View style={[styles.cable, { top: winH * 0.26 }]} />
          <Animated.View style={[styles.lights, { top: winH * 0.12, width: winW + spacing * 2, transform: [{ translateX: lightsX }] }]}>
            {Array.from({ length: Math.ceil(winW / spacing) + 2 }, (_, i) => (
              <View key={i} style={[styles.light, { left: i * spacing }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.streaks, { top: winH * 0.55, width: winW + spacing * 2, transform: [{ translateX: lightsX }] }]}>
            {Array.from({ length: Math.ceil(winW / spacing) + 2 }, (_, i) => (
              <View key={i} style={[styles.streak, { left: i * spacing + 40 }]} />
            ))}
          </Animated.View>
        </View>

        {/* Quai : carrelage, plaque de la station, bord du quai */}
        {shown !== null && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: platX }] }]}>
            <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
              <BrickWall screen="grille" id="quai" />
            </View>
            <View style={[styles.lamp, { left: winW * 0.08 }]} />
            <View style={[styles.lamp, { right: winW * 0.08 }]} />
            <View style={[styles.plate, { top: winH * 0.26, maxWidth: winW * 0.86 }]}>
              <Text style={[styles.plateText, { fontSize: nameSize, lineHeight: nameSize * 1.12 }]} numberOfLines={2}>
                {name}
              </Text>
            </View>
            <View style={[styles.floor, { height: winH * 0.2 }]}>
              <View style={styles.edge} />
            </View>
          </Animated.View>
        )}
        {/* Reflet de la vitre */}
        <View style={styles.glare} pointerEvents="none" />
      </View>

      {/* Barre de maintien et banquettes */}
      <View style={[styles.pole, { left: 6, height: height - 10 }]} />
      <View style={styles.seats}>
        <View style={styles.seat} />
        <View style={styles.seat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  car: {
    backgroundColor: colors.cream,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    overflow: 'hidden',
    paddingTop: 10,
  },
  band: {
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 8,
    minWidth: '55%',
    alignItems: 'center',
  },
  bandText: { fontFamily: fonts.heavy, fontSize: 13, letterSpacing: 1, color: colors.sun },
  window: {
    borderRadius: 22,
    borderWidth: 6,
    borderColor: colors.ink,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  tunnel: { backgroundColor: mix(colors.ink, '#000000', 0.35) },
  cable: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: alpha(colors.white, 0.14) },
  lights: { position: 'absolute', left: 0, height: 10 },
  light: { position: 'absolute', width: 34, height: 8, borderRadius: 4, backgroundColor: colors.sun, opacity: 0.85 },
  streaks: { position: 'absolute', left: 0, height: 4 },
  streak: { position: 'absolute', width: 90, height: 3, borderRadius: 2, backgroundColor: alpha(colors.white, 0.18) },
  lamp: { position: 'absolute', top: 10, width: 70, height: 8, borderRadius: 4, backgroundColor: colors.white, opacity: 0.9 },
  plate: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: 4,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  plateText: { fontFamily: fonts.display, color: colors.white, textAlign: 'center', letterSpacing: -0.3 },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: mix(colors.ink, colors.white, 0.72) },
  edge: { height: 8, backgroundColor: colors.sun },
  glare: {
    position: 'absolute',
    top: -40,
    left: '18%',
    width: 46,
    height: '160%',
    backgroundColor: alpha(colors.white, 0.07),
    transform: [{ rotate: '18deg' }],
  },
  pole: { position: 'absolute', top: 5, width: 9, borderRadius: 5, backgroundColor: colors.sun, borderWidth: 2, borderColor: colors.ink },
  seats: { position: 'absolute', bottom: -14, flexDirection: 'row', gap: 14 },
  seat: { width: 120, height: 46, borderRadius: 16, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.ink },
});
