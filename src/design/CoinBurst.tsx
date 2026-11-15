import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Coin } from '../components/CoinPill';
import { colors, fonts } from '../theme';
import { useReducedMotion } from './motion';

/** Rayons de soleil en éventail (charte : soleil sur fond clair). */
function Rays({ size }: { size: number }) {
  const r = size / 2;
  const n = 16;
  const d = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    return `M${r},${r} L${r + r * Math.cos(a0)},${r + r * Math.sin(a0)} L${r + r * Math.cos(a1)},${r + r * Math.sin(a1)} Z`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={colors.sun} opacity={0.35} />
    </Svg>
  );
}

/** Grosse pièce qui rebondit devant des rayons qui tournent, avec le gain (« +3 »). */
export function CoinBurst({ amount }: { amount: number }) {
  const reduced = useReducedMotion();
  const [spin] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    bounce.setValue(0);
    Animated.spring(bounce, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true, delay: 150 } as Animated.SpringAnimationConfig).start();
    return () => loop.stop();
  }, [reduced, spin, bounce]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = reduced ? 1 : bounce.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <View style={styles.wrap} accessibilityLabel={`Plus ${amount} pièces`}>
      <Animated.View style={[styles.rays, { transform: [{ rotate }] }]}>
        <Rays size={190} />
      </Animated.View>
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <Coin size={76} />
        <Text style={styles.amount}>+{amount}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  rays: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amount: { fontFamily: fonts.display, fontSize: 60, color: colors.ink, letterSpacing: -1 },
});
