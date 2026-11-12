import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts, palette } from '../theme';

export type GameTab = 'grille' | 'defi' | 'pendu';

const TABS: { id: GameTab; label: string; color: string }[] = [
  { id: 'grille', label: 'Grille', color: palette.ultramarine },
  { id: 'defi', label: 'Défi', color: palette.tomato },
  { id: 'pendu', label: 'Pendu', color: palette.mint },
];

/** Onglets des trois jeux du jour, avec une coche quand le jeu a été joué aujourd'hui. */
export function ModeTabs({
  value,
  done,
  onChange,
  width,
}: {
  value: GameTab;
  done: Record<GameTab, boolean>;
  onChange: (tab: GameTab) => void;
  width: number;
}) {
  // Petits écrans : onglets plus fins pour laisser la place à la grille.
  const compact = useWindowDimensions().height < 720;
  return (
    <View style={[styles.row, { width }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = t.id === value;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${t.label}${done[t.id] ? ', déjà joué aujourd’hui' : ''}`}
            style={[styles.tab, compact && styles.tabCompact, active && { backgroundColor: t.color, borderColor: colors.ink }]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
            {done[t.id] && (
              <View style={[styles.check, active && styles.checkActive]}>
                <Text style={[styles.checkText, active && { color: t.color }]}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabCompact: { paddingVertical: 4 },
  label: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  labelActive: { color: '#FFFFFF' },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: '#FFFFFF' },
  checkText: { fontFamily: fonts.heavy, fontSize: 11, color: '#FFFFFF' },
});
