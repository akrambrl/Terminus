import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { track } from '../analytics';
import { alpha, colors, fonts, palette, ui } from '../theme';
import { ANDROID_PUBLISHED, APP_STORE_URL, IOS_PUBLISHED, PLAY_STORE_URL } from './links';

const HIDDEN_KEY = 'terminus:store-banner-hidden';

/** Système du visiteur web, pour ne montrer que le bon store. */
function webDevice(): 'ios' | 'android' | 'desktop' {
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Version web uniquement : invite à télécharger l'app, une fois qu'elle est sur les stores. */
export function StoreBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((v) => setHidden(v === '1'))
      .catch(() => setHidden(false));
  }, []);

  if (Platform.OS !== 'web' || hidden) return null;
  const device = webDevice();
  const links: { label: string; url: string; store: string }[] = [];
  if (IOS_PUBLISHED && device !== 'android') links.push({ label: 'App Store', url: APP_STORE_URL, store: 'ios' });
  if (ANDROID_PUBLISHED && device !== 'ios') links.push({ label: 'Google Play', url: PLAY_STORE_URL, store: 'android' });
  if (links.length === 0) return null;

  const close = () => {
    setHidden(true);
    AsyncStorage.setItem(HIDDEN_KEY, '1').catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>Terminus existe en app</Text>
        <Text style={styles.sub}>Plus rapide, en plein écran, avec ta série de grilles.</Text>
      </View>
      <View style={styles.buttons}>
        {links.map((l) => (
          <Pressable
            key={l.store}
            style={styles.button}
            onPress={() => {
              track('store_link_clicked', { store: l.store });
              Linking.openURL(l.url);
            }}
          >
            <Text style={styles.buttonText}>{l.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={close} accessibilityLabel="Masquer" style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 480,
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: ui.radiusCard,
    borderWidth: ui.border,
    borderColor: colors.white,
    padding: 14,
    gap: 10,
  },
  text: { gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  sub: { fontFamily: fonts.body, fontSize: 13, color: alpha(colors.white, 0.8) },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { backgroundColor: palette.sun, borderRadius: ui.radiusPill, minHeight: ui.touch, justifyContent: 'center', paddingHorizontal: 16, borderWidth: ui.border, borderColor: colors.ink },
  buttonText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  close: { marginLeft: 'auto', minWidth: ui.touch, minHeight: ui.touch, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: alpha(colors.white, 0.7), fontSize: 16 },
});
