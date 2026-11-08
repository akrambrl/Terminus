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
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { colors, fonts, logoColors, palette } from '../theme';
import { Monument, type MonumentId } from './Monuments';

const LETTERS = 'TERMINUS'.split('');

const POSTERS: { id: MonumentId; name: string; color: string }[] = [
  { id: 'eiffel', name: 'Tour Eiffel', color: palette.tomato },
  { id: 'arc', name: 'Arc de Triomphe', color: palette.ultramarine },
  { id: 'sacre-coeur', name: 'Sacré-Cœur', color: palette.mint },
  { id: 'notre-dame', name: 'Notre-Dame', color: palette.violet },
];

const TILE_W = 26;
const TILE_H = 13;

/** Mur du quai en carrelage blanc biseauté, posé en quinconce. */
function TiledWall({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="tiles" width={TILE_W} height={TILE_H * 2} patternUnits="userSpaceOnUse">
          <Rect width={TILE_W} height={TILE_H * 2} fill="#D5DBF0" />
          <Rect x={1} y={1} width={TILE_W - 2} height={TILE_H - 2} rx={3} fill="#FBFCFF" />
          <Rect x={-TILE_W / 2 + 1} y={TILE_H + 1} width={TILE_W - 2} height={TILE_H - 2} rx={3} fill="#FBFCFF" />
          <Rect x={TILE_W / 2 + 1} y={TILE_H + 1} width={TILE_W - 2} height={TILE_H - 2} rx={3} fill="#FBFCFF" />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#tiles)" />
    </Svg>
  );
}

/**
 * Cinématique d'ouverture : un quai de métro. Le mur d'en face, carrelé, porte la plaque
 * TERMINUS et des affiches de monuments ; une rame entre en gare, s'arrête puis repart.
 * Un toucher la passe ; elle est sautée si l'appareil demande de réduire les animations.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();

  // Géométrie de la scène.
  const wallBottom = height * 0.74;
  const trackH = height * 0.07;
  const trainH = Math.min(height * 0.2, 170);
  const trainW = width * 1.7;
  const trainTop = wallBottom + trackH * 0.55 - trainH;
  const plaqueW = Math.min(width - 40, 380);
  const letter = (plaqueW - 28 - 4 * 7) / 8;
  const posterGap = 10;
  const posterW = Math.min((width - 32 - posterGap * 3) / 4, 96);

  const scene = useRef(new Animated.Value(0)).current;
  const posters = useMemo(() => POSTERS.map(() => new Animated.Value(0)), []);
  const letters = useMemo(() => LETTERS.map(() => new Animated.Value(0)), []);
  const train = useRef(new Animated.Value(0)).current; // 0 hors champ à droite, 1 à quai, 2 parti à gauche
  const exit = useRef(new Animated.Value(0)).current;
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

    const spring = (v: Animated.Value) =>
      Animated.spring(v, { toValue: 1, friction: 6, tension: 110, useNativeDriver: false });

    const sequence = Animated.sequence([
      Animated.timing(scene, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.parallel([
        Animated.stagger(110, posters.map(spring)),
        Animated.sequence([Animated.delay(150), Animated.stagger(80, letters.map(spring))]),
        Animated.sequence([
          Animated.delay(600),
          // La rame entre en gare en freinant…
          Animated.timing(train, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.delay(500),
          // … puis repart en accélérant.
          Animated.timing(train, {
            toValue: 2,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
        ]),
      ]),
      Animated.delay(150),
    ]);
    sequence.start(({ finished }) => finished && finish());
    return () => {
      cancelled = true;
      sequence.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trainX = train.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [width + 20, width * 0.08, -trainW - 40],
  });

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
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityLabel="Passer l'introduction">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: scene }]}>
          {/* Mur du quai d'en face. */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: wallBottom, overflow: 'hidden' }}>
            <TiledWall width={width} height={wallBottom} />
            <View style={[styles.frieze, { top: wallBottom * 0.12 }]} />
          </View>

          {/* Plaque de station. */}
          <View style={[styles.plaque, { width: plaqueW, top: wallBottom * 0.17, left: (width - plaqueW) / 2 }]}>
            <View style={styles.letters}>
              {LETTERS.map((l, i) => {
                const t = letters[i];
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.letterTile,
                      {
                        width: letter,
                        height: letter * 1.12,
                        borderRadius: letter * 0.24,
                        backgroundColor: logoColors[i],
                        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
                        transform: [
                          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-letter, 0] }) },
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
                      style={{
                        fontFamily: fonts.display,
                        fontSize: letter * 0.66,
                        color: logoColors[i] === palette.sun ? colors.ink : '#FFFFFF',
                        includeFontPadding: false,
                      }}
                    >
                      {l}
                    </Text>
                  </Animated.View>
                );
              })}
            </View>
            <Text style={styles.plaqueSub}>PARIS</Text>
          </View>

          {/* Affiches de monuments sur le mur. */}
          <View style={[styles.posters, { top: wallBottom * 0.42, gap: posterGap }]}>
            {POSTERS.map((p, i) => {
              const t = posters[i];
              return (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.poster,
                    {
                      width: posterW,
                      backgroundColor: p.color,
                      opacity: t,
                      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                    },
                  ]}
                >
                  <Monument id={p.id} size={posterW * 0.62} bg={p.color} />
                  <Text style={styles.posterName} numberOfLines={2}>
                    {p.name}
                  </Text>
                </Animated.View>
              );
            })}
          </View>

          {/* Voie et quai. */}
          <View style={[styles.track, { top: wallBottom, height: trackH }]}>
            <View style={[styles.rail, { top: trackH * 0.35 }]} />
            <View style={[styles.rail, { top: trackH * 0.7 }]} />
          </View>
          <View style={[styles.platform, { top: wallBottom + trackH }]}>
            <View style={styles.platformEdge} />
            <Text style={styles.skip}>Touchez pour passer</Text>
          </View>

          {/* La rame. */}
          <Animated.View
            style={[
              styles.train,
              { top: trainTop, width: trainW, height: trainH, transform: [{ translateX: trainX }] },
            ]}
          >
            <View style={[styles.cab, { width: trainH * 0.55, borderTopLeftRadius: trainH * 0.45 }]}>
              <View style={[styles.cabWindow, { height: trainH * 0.28 }]} />
              <View style={styles.headlight} />
            </View>
            <View style={styles.body}>
              <View style={styles.headsign}>
                <Text style={styles.headsignText}>TERMINUS · PARIS</Text>
              </View>
              <View style={styles.windows}>
                {Array.from({ length: 9 }, (_, i) =>
                  i % 3 === 1 ? (
                    <View key={i} style={[styles.door, { height: trainH * 0.62 }]}>
                      <View style={styles.doorGap} />
                    </View>
                  ) : (
                    <View key={i} style={[styles.window, { height: trainH * 0.3 }]} />
                  ),
                )}
              </View>
              <View style={styles.stripe} />
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.ink, zIndex: 100 },
  frieze: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: palette.ultramarine, opacity: 0.85 },
  plaque: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  letters: { flexDirection: 'row', gap: 4 },
  letterTile: { alignItems: 'center', justifyContent: 'center' },
  plaqueSub: {
    fontFamily: fonts.heavy,
    fontSize: 13,
    letterSpacing: 10,
    color: palette.sun,
    marginTop: 8,
    paddingLeft: 10,
  },
  posters: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  poster: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  posterName: { fontFamily: fonts.heavy, fontSize: 10, color: '#FFFFFF', textAlign: 'center', marginTop: 4 },
  track: { position: 'absolute', left: 0, right: 0, backgroundColor: '#1D1A3F' },
  rail: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#8D90B5' },
  platform: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#5B5F82', alignItems: 'center' },
  platformEdge: { alignSelf: 'stretch', height: 10, backgroundColor: palette.sun },
  skip: { marginTop: 22, fontFamily: fonts.bold, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  train: { position: 'absolute', left: 0, flexDirection: 'row' },
  cab: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  cabWindow: { width: '70%', backgroundColor: '#1D1A3F', borderTopLeftRadius: 18, borderBottomLeftRadius: 4 },
  headlight: {
    position: 'absolute',
    left: 8,
    bottom: 14,
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.sun,
  },
  body: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingTop: 8,
    overflow: 'hidden',
  },
  headsign: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D1A3F',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  headsignText: { fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 2, color: palette.sun },
  windows: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, marginTop: 8 },
  window: { flex: 1, backgroundColor: '#2A2752', borderRadius: 6 },
  door: {
    width: 44,
    backgroundColor: palette.ultramarine,
    borderRadius: 4,
    alignItems: 'center',
  },
  doorGap: { width: 2, height: '100%', backgroundColor: 'rgba(255,255,255,0.6)' },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 12, height: 6, backgroundColor: palette.tomato },
});
