import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, fonts, logoColors, palette } from '../theme';

const LETTERS = 'TERMINUS'.split('');
const GAP = 5;

/**
 * Cinématique d'ouverture : une ligne de métro se trace, une rame la parcourt,
 * et chaque arrêt devient une lettre de TERMINUS, comme une annonce de quai.
 * Un toucher la passe ; elle est sautée si l'appareil demande de réduire les animations.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const boardWidth = Math.min(width - 48, 380);
  const tile = (boardWidth - GAP * (LETTERS.length - 1)) / LETTERS.length;

  const line = useRef(new Animated.Value(0)).current;
  const train = useRef(new Animated.Value(0)).current;
  const caption = useRef(new Animated.Value(0)).current;
  const paris = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const tiles = useMemo(() => LETTERS.map(() => new Animated.Value(0)), []);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(exit, {
      toValue: 1,
      duration: 420,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => onDone());
  };

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce && !cancelled) {
          done.current = true;
          onDone();
        }
      })
      .catch(() => {});

    const timing = (v: Animated.Value, duration: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: false });

    const sequence = Animated.sequence([
      timing(caption, 300),
      Animated.parallel([
        timing(line, 900, Easing.inOut(Easing.cubic)),
        timing(train, 1300, Easing.inOut(Easing.quad)),
        Animated.stagger(
          95,
          tiles.map((t) =>
            Animated.spring(t, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
          ),
        ),
      ]),
      timing(paris, 350),
      Animated.delay(650),
    ]);
    sequence.start(({ finished }) => finished && finish());
    return () => {
      cancelled = true;
      sequence.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineWidth = line.interpolate({ inputRange: [0, 1], outputRange: [0, boardWidth] });
  const trainX = train.interpolate({ inputRange: [0, 1], outputRange: [-90, boardWidth + 30] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }],
        },
      ]}
    >
      <Pressable style={styles.press} onPress={finish} accessibilityLabel="Passer l'introduction">
        <Animated.View style={[styles.captionRow, { width: boardWidth, opacity: caption }]}>
          <View style={styles.captionDot} />
          <Text style={styles.caption}>Prochaine station</Text>
        </Animated.View>

        <View style={[styles.tiles, { width: boardWidth, height: tile * 1.15 }]}>
          {LETTERS.map((letter, i) => {
            const t = tiles[i];
            return (
              <Animated.View
                key={i}
                style={[
                  styles.tile,
                  {
                    width: tile,
                    height: tile * 1.15,
                    borderRadius: tile * 0.26,
                    backgroundColor: logoColors[i],
                    opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                    transform: [
                      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [tile * 1.4, 0] }) },
                      { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                      {
                        rotate: t.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', i % 2 ? '3deg' : '-3deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.letter,
                    { fontSize: tile * 0.66, color: logoColors[i] === palette.sun ? colors.ink : '#FFFFFF' },
                  ]}
                >
                  {letter}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* La ligne, ses arrêts et la rame qui la parcourt. */}
        <View style={[styles.track, { width: boardWidth }]}>
          <View style={styles.rail} />
          <Animated.View style={[styles.lineDrawn, { width: lineWidth }]} />
          {LETTERS.map((_, i) => {
            const at = (i + 0.5) / LETTERS.length;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.stop,
                  {
                    left: at * boardWidth - STOP / 2,
                    opacity: line.interpolate({
                      inputRange: [Math.max(0, at - 0.06), at],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            );
          })}
          <Animated.View style={[styles.train, { transform: [{ translateX: trainX }] }]}>
            <View style={styles.trainNose} />
            {[0, 1, 2].map((w) => (
              <View key={w} style={styles.window} />
            ))}
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: paris,
            transform: [{ translateY: paris.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.paris}>PARIS</Text>
          <Text style={styles.tagline}>Le jeu des stations de métro</Text>
        </Animated.View>

        <Text style={styles.skip}>Touchez pour passer</Text>
      </Pressable>
    </Animated.View>
  );
}

const STOP = 14;
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ink, zIndex: 100 },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  captionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.sun },
  caption: {
    fontFamily: fonts.heavy,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: palette.sun,
  },
  tiles: { flexDirection: 'row', gap: GAP },
  tile: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.display, includeFontPadding: false },
  track: { height: 34, justifyContent: 'center', overflow: 'hidden' },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lineDrawn: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: palette.ultramarine },
  stop: {
    position: 'absolute',
    width: STOP,
    height: STOP,
    borderRadius: STOP / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.ink,
  },
  train: {
    position: 'absolute',
    left: 0,
    width: 64,
    height: 24,
    borderRadius: 8,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    gap: 4,
  },
  trainNose: {
    position: 'absolute',
    right: 4,
    top: 6,
    width: 9,
    height: 8,
    borderRadius: 3,
    backgroundColor: palette.sun,
  },
  window: { width: 10, height: 8, borderRadius: 2, backgroundColor: palette.ultramarine },
  paris: { fontFamily: fonts.heavy, fontSize: 18, letterSpacing: 12, color: '#FFFFFF', paddingLeft: 12 },
  tagline: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  skip: {
    position: 'absolute',
    bottom: 40,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
