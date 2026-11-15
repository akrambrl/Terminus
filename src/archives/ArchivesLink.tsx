import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts } from '../theme';

/** Lien discret sous un jeu du jour terminé : « Rejouer les jours passés ». */
export function ArchivesLink({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={styles.wrap}>
      <Text style={[styles.text, { color }]}>📅 Rejouer les jours passés</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginTop: 8, paddingVertical: 4 },
  text: { fontFamily: fonts.heavy, fontSize: 14, textDecorationLine: 'underline' },
});
