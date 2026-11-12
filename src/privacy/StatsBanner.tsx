import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { alpha, colors, fonts, palette, ui } from '../theme';
import { getWebChoice, setWebChoice } from './consent';
import { PRIVACY_URL } from './links';

/**
 * Version web : bandeau de choix pour les statistiques d'audience.
 * Refuser est aussi simple qu'accepter ; rien n'est envoyé avant la réponse.
 */
export function StatsBanner({ refreshKey }: { refreshKey: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getWebChoice().then((c) => setShow(c === null));
  }, [refreshKey]);

  if (!show) return null;
  const choose = (granted: boolean) => {
    setWebChoice(granted);
    setShow(false);
  };

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>
        On aimerait mesurer la fréquentation du jeu (parties jouées, pays, appareil) pour l'améliorer. Aucune donnée
        personnelle.{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
          En savoir plus
        </Text>
      </Text>
      <View style={styles.buttons}>
        <Pressable style={[styles.button, styles.refuse]} onPress={() => choose(false)}>
          <Text style={[styles.buttonText, { color: colors.white }]}>Refuser</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => choose(true)}>
          <Text style={styles.buttonText}>Accepter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  text: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: alpha(colors.white, 0.9) },
  link: { color: palette.sun, textDecorationLine: 'underline' },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, backgroundColor: palette.sun, borderRadius: ui.radiusPill, minHeight: ui.touch, justifyContent: 'center', alignItems: 'center' },
  refuse: { backgroundColor: 'transparent', borderWidth: ui.border, borderColor: colors.white },
  buttonText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
});
