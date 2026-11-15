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

  // Fenêtre : la place laissée par l'étiquette (≈ 40 px) et les banquettes (≈ 74 px).
  const winW = width - 40;
  const winH = Math.max(110, height - 40 - 74 - 14);

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
  const nameSize = Math.min(38, Math.max(17, (winW * 0.8) / Math.max(7, name.length * 0.56)));
  const spacing = Math.max(140, winW * 0.38);
  const count = Math.ceil(winW / spacing) + 2;
  const lightsX = lights.interpolate({ inputRange: [0, 1], outputRange: [0, -spacing] });
  const platX = platformX.interpolate({ inputRange: [-2, 2], outputRange: [-2 * winW, 2 * winW] });
  const seatW = (winW - 18) / 2;

  return (
    <View style={[styles.car, { width, height }]} accessibilityLabel={moving ? 'La rame roule' : `Station ${name}`}>
      {/* Étiquette au-dessus de la fenêtre (« Station 2 ») */}
      <View style={[styles.band, { opacity: shown === null ? 0 : 1 }]}>
        <Text style={styles.bandText} numberOfLines={1}>
          {shown === null ? ' ' : (label?.(shown) ?? '')}
        </Text>
      </View>

      {/* Fenêtre */}
      <View style={[styles.window, { width: winW, height: winH }]}>
        {/* Tunnel : piliers, câbles et lampes qui défilent */}
        <View style={[StyleSheet.absoluteFill, styles.tunnel]}>
          <View style={[styles.cable, { top: winH * 0.16 }]} />
          <View style={[styles.cable, { top: winH * 0.2 }]} />
          <View style={[styles.cable, { top: winH * 0.82 }]} />
          <Animated.View style={[styles.layer, { width: winW + spacing * 2, transform: [{ translateX: lightsX }] }]}>
            {Array.from({ length: count }, (_, i) => (
              <View key={`p${i}`} style={[styles.pillar, { left: i * spacing + spacing * 0.2, width: spacing * 0.1 }]} />
            ))}
            {Array.from({ length: count }, (_, i) => (
              <View key={`l${i}`} style={[styles.halo, { left: i * spacing + spacing * 0.42, top: winH * 0.29, width: spacing * 0.62 }]}>
                <View style={styles.light} />
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Quai : carrelage, néons, plaque de la station, bord du quai */}
        {shown !== null && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: platX }] }]}>
            <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
              <BrickWall screen="grille" id="quai" />
            </View>
            <View style={[styles.neon, { left: winW * 0.03, width: winW * 0.2 }]} />
            <View style={[styles.neon, { right: winW * 0.03, width: winW * 0.2 }]} />
            <View style={[styles.plate, { top: winH * 0.32, maxWidth: winW * 0.84 }]}>
              <Text style={[styles.plateText, { fontSize: nameSize, lineHeight: nameSize * 1.12 }]} numberOfLines={2}>
                {name}
              </Text>
            </View>
            <View style={[styles.floor, { height: winH * 0.22 }]}>
              <View style={styles.edge} />
              <View style={styles.dashes}>
                {Array.from({ length: Math.ceil(winW / 16) }, (_, i) => (
                  <View key={i} style={styles.dash} />
                ))}
              </View>
            </View>
          </Animated.View>
        )}
        {/* Reflet de la vitre */}
        <View style={[styles.glare, { left: winW * 0.38, width: winW * 0.16 }]} pointerEvents="none" />
      </View>

      {/* Banquettes : dossier et assise */}
      <View style={[styles.seats, { width: winW }]}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: seatW }}>
            <View style={styles.back}>
              <View style={styles.backLine} />
            </View>
            <View style={styles.cushion} />
          </View>
        ))}
      </View>

      {/* Barre de maintien jaune, avec sa poignée vers la fenêtre */}
      <View style={[styles.pole, { height: height - 22 }]} />
      <View style={[styles.handle, { top: 10 + 30 + winH * 0.88 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  car: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: colors.ink,
    alignItems: 'center',
    overflow: 'hidden',
    paddingTop: 10,
    boxShadow: `0px 6px 0px ${colors.ink}`,
  },
  band: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 14,
    marginBottom: 8,
    height: 22,
    justifyContent: 'center',
  },
  bandText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.white },
  window: {
    borderRadius: 26,
    borderWidth: 7,
    borderColor: colors.ink,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    marginLeft: 12,
  },
  tunnel: { backgroundColor: '#0E0C2C' },
  layer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  pillar: { position: 'absolute', top: 0, bottom: 0, backgroundColor: alpha('#3A3780', 0.35) },
  cable: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: alpha('#5C59C9', 0.55) },
  halo: {
    position: 'absolute',
    height: 18,
    borderRadius: 9,
    backgroundColor: alpha(colors.sun, 0.22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { width: '80%', height: 7, borderRadius: 4, backgroundColor: colors.sun },
  neon: {
    position: 'absolute',
    top: 10,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: mix(colors.border, colors.ink, 0.15),
  },
  plate: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    boxShadow: `0px 5px 0px ${mix(colors.border, colors.ink, 0.25)}`,
  },
  plateText: { fontFamily: fonts.display, color: colors.white, textAlign: 'center', letterSpacing: -0.3 },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: mix(colors.ink, colors.white, 0.76) },
  edge: { height: 6, backgroundColor: colors.sun },
  dashes: { flexDirection: 'row', gap: 6, marginTop: 4, overflow: 'hidden' },
  dash: { width: 10, height: 3, borderRadius: 2, backgroundColor: colors.sun },
  glare: {
    position: 'absolute',
    top: -60,
    height: '180%',
    backgroundColor: alpha(colors.white, 0.08),
    transform: [{ rotate: '20deg' }],
  },
  seats: { flexDirection: 'row', gap: 18, marginTop: 12, marginLeft: 12 },
  back: {
    height: 34,
    borderRadius: 14,
    backgroundColor: colors.blue,
    borderWidth: 3,
    borderColor: colors.ink,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backLine: { height: 2, borderRadius: 1, backgroundColor: mix(colors.blue, colors.ink, 0.45) },
  cushion: {
    height: 32,
    marginTop: -6,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: mix(colors.blue, colors.ink, 0.12),
    borderWidth: 3,
    borderColor: colors.ink,
  },
  pole: {
    position: 'absolute',
    top: 10,
    left: 9,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.sun,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  handle: {
    position: 'absolute',
    left: 14,
    width: 22,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.sun,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
