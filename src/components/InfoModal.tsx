import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, palette } from '../theme';

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
          <View style={styles.stripe}>
            {STRIPE.map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
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

const STRIPE = [palette.ultramarine, palette.tomato, palette.sun, palette.mint, palette.pink, palette.violet];

export const infoStyles = StyleSheet.create({
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink, marginBottom: 10 },
  strong: { fontFamily: fonts.heavy },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 6 },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,18,61,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    paddingTop: 28,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 8, flexDirection: 'row' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 12 },
  body: { flexGrow: 0 },
  close: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 15 },
});
