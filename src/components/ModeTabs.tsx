import { Pressable, StyleSheet, Text, View } from 'react-native';
import { solidShadow } from '../design/ui';
import { colors, fonts, textOn, ui } from '../theme';

export type GameTab = 'grille' | 'defi' | 'pendu';

/** Couleur de chaque jeu (charte : défi violet, pendu bleu nuit, grille bleu outremer). */
export const TAB_COLORS: Record<GameTab, string> = {
  grille: colors.blue,
  defi: colors.violet,
  pendu: colors.ink,
};

const TABS: { id: GameTab; label: string }[] = [
  { id: 'grille', label: 'Grille' },
  { id: 'defi', label: 'Défi' },
  { id: 'pendu', label: 'Pendu' },
];

/** Onglets des trois jeux du jour (pilules de 44 px), avec une coche quand le jeu a été joué aujourd'hui. */
export function ModeTabs({
  value,
  done,
  onChange,
  width,
  dark,
}: {
  value: GameTab;
  done: Record<GameTab, boolean>;
  onChange: (tab: GameTab) => void;
  width: number;
  /** Écran sombre ou coloré : bordures blanches pour rester visibles. */
  dark?: boolean;
}) {
  const edge = dark ? colors.white : colors.ink;
  return (
    <View style={[styles.row, { width }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = t.id === value;
        const bg = active ? TAB_COLORS[t.id] : colors.surface;
        const fg = textOn(bg, 15);
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${t.label}${done[t.id] ? ', déjà joué aujourd’hui' : ''}`}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: bg, borderColor: active ? edge : colors.ink },
              !pressed && solidShadow(dark ? colors.ink : colors.ink, active ? ui.shadowY : 2),
              pressed && { transform: [{ translateY: 2 }] },
            ]}
          >
            <Text style={[styles.label, { color: fg }]}>{t.label}</Text>
            {done[t.id] && (
              <View style={[styles.check, { backgroundColor: active ? colors.white : colors.mint }]}>
                <Text style={[styles.checkText, { color: active ? TAB_COLORS[t.id] : colors.ink }]}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: ui.space.m, marginBottom: ui.space.m + 2 },
  tab: {
    flex: 1,
    minHeight: ui.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: ui.radiusPill,
    borderWidth: ui.border,
  },
  label: { fontFamily: fonts.heavy, fontSize: 15 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontFamily: fonts.heavy, fontSize: 11 },
});
