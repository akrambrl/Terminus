import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { currentDayKey, formatCountdown, msUntilNextParisDay } from '../game/day';
import { colors, fonts, ui } from '../theme';

/**
 * Fin de partie : prévient que le prochain jeu arrive à minuit (heure de Paris), avec un compte à rebours.
 * À minuit, appelle onNewDay pour passer tout seul aux jeux du nouveau jour.
 */
export function NextGame({
  day,
  label,
  color = colors.ink,
  onNewDay,
}: {
  /** Jour du jeu affiché (AAAA-MM-JJ). */
  day: string;
  /** « Prochain pendu », « Prochain défi », « Prochaine grille ». */
  label: string;
  color?: string;
  onNewDay?: () => void;
}) {
  const [ms, setMs] = useState(() => msUntilNextParisDay());
  useEffect(() => {
    const id = setInterval(() => {
      setMs(msUntilNextParisDay());
      // Minuit est passé à Paris : on passe aux jeux du nouveau jour.
      if (currentDayKey() !== day) onNewDay?.();
    }, 20000);
    return () => clearInterval(id);
  }, [day, onNewDay]);
  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`${label} dans ${formatCountdown(ms)}, à minuit heure de Paris`}>
      <Text style={[styles.main, { color }]}>
        {label} dans <Text style={styles.time}>{formatCountdown(ms)}</Text>
      </Text>
      <Text style={[styles.sub, { color }]}>Reviens demain : nouveau jeu à minuit (heure de Paris)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: ui.space.m },
  main: { fontFamily: fonts.heavy, fontSize: 15, textAlign: 'center' },
  time: { fontFamily: fonts.display },
  sub: { fontFamily: fonts.bold, fontSize: 12, textAlign: 'center', marginTop: 2, opacity: 0.85 },
});
