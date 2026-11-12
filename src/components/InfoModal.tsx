import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { solidShadow } from '../design/ui';
import { alpha, colors, fonts, ui } from '../theme';

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
        <View style={[styles.card, solidShadow()]}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 4 }}>
            {children}
          </ScrollView>
          {footer}
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    backgroundColor: alpha(colors.ink, 0.6),
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
    borderWidth: ui.border,
    borderRadius: ui.radiusCard,
    padding: ui.space.xl,
  },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5, lineHeight: 28, color: colors.ink, marginBottom: 12 },
  body: { flexGrow: 0 },
  close: {
    marginTop: 8,
    alignSelf: 'center',
    minHeight: ui.touch,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 15 },
});
