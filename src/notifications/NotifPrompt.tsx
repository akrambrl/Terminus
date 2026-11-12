import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, fonts, ui } from '../theme';
import { declineMorningNotifications, enableMorningNotifications, getNotifPref, notificationsSupported } from './index';
import { MORNING_HOUR } from './content';

/**
 * Proposition du rappel du matin, affichée dans l'écran de résultat (jamais au lancement, et une seule fois) :
 * le joueur vient de finir une partie, c'est le bon moment pour lui proposer de revenir demain.
 */
export function NotifPrompt() {
  const [state, setState] = useState<'hidden' | 'ask' | 'on' | 'refused'>('hidden');
  useEffect(() => {
    if (!notificationsSupported) return;
    let alive = true;
    getNotifPref().then((p) => alive && p === null && setState('ask'));
    return () => {
      alive = false;
    };
  }, []);
  if (state === 'hidden') return null;
  return (
    <View style={styles.card}>
      {state === 'ask' && (
        <>
          <Text style={styles.title}>🔔 Un rappel chaque matin ?</Text>
          <Text style={styles.text}>
            À {MORNING_HOUR} h, on te prévient quand la nouvelle grille, le défi et le pendu du jour sont prêts.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Oui, chaque matin"
              primary
              onPress={async () => setState((await enableMorningNotifications()) ? 'on' : 'refused')}
            />
            <Button
              label="Non merci"
              onPress={() => {
                declineMorningNotifications();
                setState('hidden');
              }}
            />
          </View>
        </>
      )}
      {state === 'on' && <Text style={styles.text}>C’est noté : rendez-vous demain à {MORNING_HOUR} h ! 🚇</Text>}
      {state === 'refused' && (
        <Text style={styles.text}>
          Les notifications sont bloquées sur ce téléphone. Tu peux les autoriser dans les réglages, puis activer le
          rappel depuis le bouton ?.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: ui.space.l,
    padding: ui.space.l,
    gap: ui.space.s,
    borderRadius: ui.radiusFor(90),
    backgroundColor: colors.accentSoft,
    borderWidth: ui.borderThin,
    borderColor: colors.ink,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  text: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.s, marginTop: 4 },
});
