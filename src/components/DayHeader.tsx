import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, ui } from '../theme';

/**
 * Bandeau du jeu du jour en plaque de station : bleu nuit, bord blanc,
 * titre en capitales espacées et date en jaune soleil.
 */
export function DayHeader({ title, sub, right, width }: { title: string; sub: string; right?: ReactNode; width: number }) {
  return (
    <View style={[styles.plaque, { width }]}>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  plaque: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink,
    borderColor: colors.white,
    borderWidth: ui.border,
    borderRadius: ui.radiusFor(50),
    paddingHorizontal: ui.space.l,
    paddingVertical: ui.space.s,
    marginBottom: ui.space.m,
  },
  title: { fontFamily: fonts.heavy, fontSize: 15, letterSpacing: 15 * 0.14, color: colors.white },
  sub: { fontFamily: fonts.heavy, fontSize: 11, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
});
