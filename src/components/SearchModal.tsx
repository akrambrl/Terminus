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
import { colors } from '../theme';

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {row?.label} <Text style={styles.times}>×</Text> {col?.label}
          </Text>
          <Text style={styles.subtitle}>
            {guessesLeft} essai{guessesLeft > 1 ? 's' : ''} restant{guessesLeft > 1 ? 's' : ''}
          </Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,33,58,0.45)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  times: { color: colors.gold },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
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
  list: { marginTop: 8, minHeight: 120 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
