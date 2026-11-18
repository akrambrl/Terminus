import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { solidShadow } from '../design/ui';
import { useReducedMotion } from '../design/motion';
import { alpha, colors, fonts, textOn, ui } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Couleur de l'étiquette du titre (soleil par défaut). */
  accent?: string;
  /** Décor au-dessus du contenu (confettis, rayons…), dessiné derrière le texte. */
  decor?: ReactNode;
}

/**
 * Fenêtre centrée réutilisée pour l'aide, les résultats, les bonus et les critères (charte Terminus) :
 * arrivée avec un petit rebond, titre sur une étiquette de couleur inclinée, bouton « Fermer » en pilule.
 */
export function InfoModal({ visible, title, onClose, children, footer, accent = colors.sun, decor }: Props) {
  const reduced = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [visible, reduced, pop]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const rotate = pop.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '0deg'] });
  const tagIn = pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <Animated.View style={[styles.card, solidShadow(colors.ink, 8), { opacity: pop, transform: [{ scale }, { rotate }] }]}>
          {decor && (
            <View style={styles.decor} pointerEvents="none">
              {decor}
            </View>
          )}
          <Animated.View style={[styles.tag, { backgroundColor: accent, opacity: tagIn }, solidShadow(colors.ink, 4)]}>
            <Text style={[styles.title, { color: textOn(accent, 26) }]} accessibilityRole="header">
              {title}
            </Text>
          </Animated.View>
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 4 }}>
            {children}
          </ScrollView>
          {footer}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && { transform: [{ translateY: 2 }] }]}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Pluie de confettis aux couleurs du logo (fenêtres de bonus, de victoire).
 * Ne s'anime pas si l'appareil demande moins d'animations.
 */
export function Confetti({ count = 18 }: { count?: number }) {
  const reduced = useReducedMotion();
  const [fall] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    fall.setValue(0);
    Animated.timing(fall, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [reduced, fall]);
  if (reduced) return null;
  const palette = [colors.blue, colors.tomato, colors.sun, colors.mint, colors.pink, colors.violet];
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const left = `${(i * 53) % 100}%` as const;
        const drift = ((i * 37) % 60) - 30;
        const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30 - (i % 5) * 18, 180 + (i % 7) * 30] });
        const translateX = fall.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
        const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(i % 2 ? 1 : -1) * (200 + i * 15)}deg`] });
        const opacity = fall.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confetto,
              {
                left,
                backgroundColor: palette[i % palette.length],
                width: i % 3 ? 10 : 14,
                height: i % 3 ? 16 : 10,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

export const infoStyles = StyleSheet.create({
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink, marginBottom: 10 },
  strong: { fontFamily: fonts.heavy },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 6 },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: alpha(colors.ink, 0.7),
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: ui.border + 1,
    borderRadius: ui.radiusCard,
    padding: ui.space.xl,
    paddingTop: ui.space.xl + 6,
    overflow: 'visible',
  },
  decor: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', borderRadius: ui.radiusCard },
  tag: {
    alignSelf: 'flex-start',
    marginTop: -ui.space.xl - 30,
    marginLeft: -6,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: ui.border,
    borderColor: colors.ink,
    transform: [{ rotate: '-3deg' }],
    maxWidth: '100%',
  },
  title: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.5, lineHeight: 28 },
  // flexShrink : sur iPhone et Android, la zone qui défile doit rétrécir pour laisser la place aux boutons du bas
  // (sinon elle passe dessous). Le site le faisait déjà.
  body: { flexGrow: 0, flexShrink: 1 },
  close: {
    marginTop: 12,
    alignSelf: 'center',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 26,
    borderRadius: ui.radiusPill,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  closeText: { color: colors.ink, fontFamily: fonts.heavy, fontSize: 14 },
  confetto: { position: 'absolute', top: 0, borderRadius: 3 },
});
