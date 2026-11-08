import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Fenêtre centrée réutilisée pour l'aide, les résultats et les critères. */
export function InfoModal({ visible, title, onClose, children, footer }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 4 }}>
            {children}
          </ScrollView>
          {footer}
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const infoStyles = StyleSheet.create({
  p: { fontSize: 15, lineHeight: 21, color: colors.ink, marginBottom: 10 },
  strong: { fontWeight: '700' },
  small: { fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 6 },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,33,58,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  body: { flexGrow: 0 },
  close: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
});
