import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { track } from '../analytics';
import { Button } from '../components/Button';
import { InfoModal, infoStyles } from '../components/InfoModal';
import { colors, fonts } from '../theme';
import { APP_STORE_URL, IOS_PUBLISHED } from './links';

/**
 * Site ouvert sur iPhone : après une partie, une fenêtre propose l'app de l'App Store.
 * Au plus 3 fois, avec au moins 5 jours entre deux propositions ; jamais sur ordinateur ni dans l'app.
 */
const KEY = 'terminus:app-promo';
const MAX_SHOWS = 3;
const DAYS_BETWEEN = 5;

function isIphoneWeb(): boolean {
  if (Platform.OS !== 'web') return false;
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? '';
  return /iPhone|iPod/i.test(ua);
}

/** Faut-il proposer l'app maintenant ? */
export async function shouldShowAppPromo(): Promise<boolean> {
  if (!IOS_PUBLISHED || !isIphoneWeb()) return false;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as { count: number; last: number }) : { count: 0, last: 0 };
    return s.count < MAX_SHOWS && Date.now() - s.last > DAYS_BETWEEN * 86400000;
  } catch {
    return false;
  }
}

export async function markAppPromoShown(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as { count: number; last: number }) : { count: 0, last: 0 };
    await AsyncStorage.setItem(KEY, JSON.stringify({ count: s.count + 1, last: Date.now() }));
  } catch {
    // ignoré
  }
}

const POINTS = [
  'Un rappel chaque matin quand les 4 jeux sont prêts',
  'En plein écran, sans la barre du navigateur',
  'Toujours gratuit',
];

export function AppPromo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <InfoModal
      visible={visible}
      title="Terminus en app !"
      accent={colors.mint}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          <Button
            label="Télécharger sur l'App Store"
            primary
            onPress={() => {
              track('store_link_clicked', { store: 'ios', from: 'popup' });
              Linking.openURL(APP_STORE_URL);
              onClose();
            }}
          />
        </View>
      }
    >
      <Text style={[infoStyles.p, styles.lead]}>Le jeu est disponible sur iPhone.</Text>
      {POINTS.map((p) => (
        <View key={p} style={styles.point}>
          <View style={styles.dot} />
          <Text style={styles.pointText}>{p}</Text>
        </View>
      ))}
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.heavy, fontSize: 17, textAlign: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.mint, borderWidth: 2, borderColor: colors.ink },
  pointText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  footer: { marginTop: 8 },
});
