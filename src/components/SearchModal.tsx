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
import { colors, WEB_TOP_GAP } from '../theme';

interface Props {
  visible: boolean;
  row?: Criterion;
  col?: Criterion;
  usedIds: Set<string>;
  guessesLeft: number;
  feedback: string | null;
  onSubmit: (station: Station) => void;
  onClose: () => void;
}

export function SearchModal({ visible, row, col, usedIds, guessesLeft, feedback, onSubmit, onClose }: Props) {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible, row, col]);

  const results = searchStations(query, 12);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Panneau plein écran, champ en haut : il reste visible au-dessus du clavier (iOS Safari compris). */}
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top + 8 + WEB_TOP_GAP, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <View style={styles.topText}>
            <Text style={styles.title} numberOfLines={2}>
              {row?.label} <Text style={styles.times}>×</Text> {col?.label}
            </Text>
            <Text style={styles.subtitle}>
              {guessesLeft} essai{guessesLeft > 1 ? 's' : ''} restant{guessesLeft > 1 ? 's' : ''}
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
              query.trim() ? <Text style={styles.empty}>Aucune station ne correspond.</Text> : undefined
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
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  times: { color: colors.gold },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  cancel: { paddingVertical: 8, paddingLeft: 8 },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.accent },
  feedback: {
    marginTop: 10,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
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
  itemText: { fontSize: 16, color: colors.ink, flexShrink: 1 },
  itemTextUsed: { textDecorationLine: 'line-through' },
  usedLabel: { fontSize: 12, color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 16 },
});
