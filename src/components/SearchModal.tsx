import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchStations } from '../game/lookup';
import type { Criterion, Station } from '../game/types';
import { colors, fonts, WEB_TOP_GAP } from '../theme';

interface Props {
  visible: boolean;
  row?: Criterion;
  col?: Criterion;
  usedIds: Set<string>;
  errorsLeft: number;
  feedback: string | null;
  onSubmit: (station: Station) => void;
  onClose: () => void;
}

interface VisualViewportLike {
  height: number;
  offsetTop: number;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

/**
 * Sur le web (Safari iPhone surtout), le clavier réduit la zone visible et fait glisser la page :
 * on suit cette zone (visualViewport) pour y caler l'écran de recherche.
 */
function useVisibleArea(active: boolean): { top: number; height: number } | null {
  const [area, setArea] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const g = globalThis as unknown as {
      visualViewport?: VisualViewportLike;
      scrollTo?: (x: number, y: number) => void;
    };
    const vv = g.visualViewport;
    if (Platform.OS !== 'web' || !active || !vv) return;
    const update = () => {
      setArea({ top: vv.offsetTop, height: vv.height });
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      g.scrollTo?.(0, 0);
    };
  }, [active]);
  return area;
}

export function SearchModal({ visible, row, col, usedIds, errorsLeft, feedback, onSubmit, onClose }: Props) {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const area = useVisibleArea(visible);
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible, row, col]);

  const results = searchStations(query, 12);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Panneau plein écran, champ en haut : il reste visible au-dessus du clavier (iOS Safari compris). */}
      <KeyboardAvoidingView
        style={[
          styles.screen,
          { paddingTop: insets.top + 8 + WEB_TOP_GAP, paddingBottom: insets.bottom },
          area && { position: 'absolute', left: 0, right: 0, top: area.top, height: area.height, flex: undefined },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <View style={styles.topText}>
            <Text style={styles.title} numberOfLines={2}>
              {row?.label} <Text style={styles.times}>×</Text> {col?.label}
            </Text>
            <Text style={styles.subtitle}>
              {errorsLeft} erreur{errorsLeft > 1 ? 's' : ''} possible{errorsLeft > 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.cancel} accessibilityLabel="Fermer la recherche">
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
        {feedback && <Text style={styles.feedback}>{feedback}</Text>}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nom de la station…"
            placeholderTextColor={colors.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
            returnKeyType="done"
          />
          <FlatList
            data={results}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => {
              const used = usedIds.has(item.id);
              return (
                <Pressable
                  disabled={used}
                  onPress={() => onSubmit(item)}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed, used && styles.itemUsed]}
                >
                  <Text style={[styles.itemText, used && styles.itemTextUsed]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {used && <Text style={styles.usedLabel}>déjà utilisée</Text>}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              query.trim() ? (
                <Text style={styles.empty}>Aucune station ne correspond.</Text>
              ) : (
                <View style={styles.help}>
                  <Text style={styles.helpTitle}>Touche le champ ci-dessus et tape le nom d'une station.</Text>
                  <Text style={styles.helpIntro}>Elle doit remplir les deux critères :</Text>
                  {[row, col].map(
                    (c) =>
                      c && (
                        <View key={c.id} style={styles.helpItem}>
                          <Text style={styles.helpLabel}>{c.label}</Text>
                          <Text style={styles.helpText}>{c.description}</Text>
                        </View>
                      ),
                  )}
                </View>
              )
            }
          />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topText: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  times: { color: colors.gold },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  cancel: { paddingVertical: 8, paddingLeft: 8 },
  cancelText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.accent },
  feedback: {
    marginTop: 10,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: fonts.bold,
  },
  input: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  list: { flex: 1, marginTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPressed: { backgroundColor: colors.accentSoft },
  itemUsed: { opacity: 0.5 },
  itemText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, flexShrink: 1 },
  itemTextUsed: { textDecorationLine: 'line-through' },
  usedLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  help: { marginTop: 16, gap: 10 },
  helpTitle: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  helpIntro: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  helpItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  helpLabel: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  helpText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  empty: { fontFamily: fonts.body, textAlign: 'center', color: colors.muted, marginTop: 16 },
});
