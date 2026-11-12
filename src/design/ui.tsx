import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { colors, fonts, screens, textOn, ui, type ScreenId } from '../theme';

/*
 * Composants de base de la charte (terminus-kit/DIRECTION-ARTISTIQUE.md) :
 * mur de briques, plaque de station, bouton en pilule, carte à ombre pleine.
 */

/** Mur de briques arrondies en quinconce (charte : 124 × 30, rayon 12, pas 132 × 72, à l'échelle de l'écran). */
const BRICK = { w: 124 * 0.42, h: 30 * 0.42, r: 12 * 0.42, stepX: 132 * 0.42, stepY: 72 * 0.42 };

export function BrickWall({ screen, id }: { screen: ScreenId; id?: string }) {
  const { bg, brick } = screens[screen];
  const pid = `briques-${id ?? screen}`;
  const half = BRICK.stepY / 2;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={pid} width={BRICK.stepX} height={BRICK.stepY} patternUnits="userSpaceOnUse">
            <Rect x={0} y={(half - BRICK.h) / 2} width={BRICK.w} height={BRICK.h} rx={BRICK.r} fill={brick} />
            <Rect x={-BRICK.stepX / 2} y={half + (half - BRICK.h) / 2} width={BRICK.w} height={BRICK.h} rx={BRICK.r} fill={brick} />
            <Rect x={BRICK.stepX / 2} y={half + (half - BRICK.h) / 2} width={BRICK.w} height={BRICK.h} rx={BRICK.r} fill={brick} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${pid})`} />
      </Svg>
    </View>
  );
}

/** Plaque de station : bleu nuit, bord blanc, capitales espacées (« DÉFI DU JOUR », « RÉPONSE »). */
export function Plaque({ label, size = 12, style }: { label: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.plaque, style]}>
      <Text style={[styles.plaqueText, { fontSize: size, letterSpacing: size * 0.14 }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** Ombre pleine décalée vers le bas, jamais floue (charte). */
export function solidShadow(color: string = ui.shadowColor, y: number = ui.shadowY): ViewStyle {
  // boxShadow (iOS, Android et web) : décalage vertical, aucun flou.
  return { boxShadow: `0px ${y}px 0px ${color}` };
}

type Tone = 'primary' | 'secondary' | 'danger' | 'sun';

/**
 * Bouton en pilule, bordure bleu nuit, ombre pleine dessous ; à l'appui il descend et l'ombre disparaît.
 * Hauteur minimale de 44 px (zone tactile).
 */
export function PillButton({
  label,
  onPress,
  tone = 'secondary',
  icon,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const bg = tone === 'primary' ? colors.accent : tone === 'sun' ? colors.gold : colors.surface;
  const fg = tone === 'danger' ? colors.ink : textOn(bg, 15);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg },
        tone === 'danger' && { borderColor: colors.danger },
        pressed ? { transform: [{ translateY: ui.shadowY }] } : solidShadow(tone === 'danger' ? colors.danger : ui.shadowColor),
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
      {icon}
    </Pressable>
  );
}

/** Carte : fond blanc, bordure bleu nuit, coins arrondis, ombre pleine. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, solidShadow(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  plaque: {
    alignSelf: 'center',
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: ui.border,
    borderRadius: ui.radiusFor(30),
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  plaqueText: { fontFamily: fonts.heavy, color: colors.white },
  pill: {
    minHeight: ui.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 22,
    borderRadius: ui.radiusPill,
    borderWidth: ui.border,
    borderColor: colors.ink,
  },
  pillText: { fontFamily: fonts.heavy, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: ui.border,
    borderRadius: ui.radiusCard,
  },
});
