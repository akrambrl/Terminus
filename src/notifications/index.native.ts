import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { parisDayKey } from '../game/day';
import { MORNING_HOUR, MORNING_MINUTE, morningMessage } from './content';

/**
 * Rappel du matin (notifications locales, sans serveur) : chaque jour à 8 h, l'app annonce les jeux
 * du jour (Grille, Défi, Pendu). Les 14 prochains matins sont programmés à l'avance, avec le vrai
 * contenu de chaque jour, et reprogrammés à chaque ouverture de l'app.
 */
export const notificationsSupported = true;
export type NotifPref = 'on' | 'off' | null;

const PREF_KEY = 'terminus:notif-matin';
const CHANNEL = 'matin';
const KIND = 'matin';
const DAYS_AHEAD = 14;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotifPref(): Promise<NotifPref> {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

async function setPref(v: 'on' | 'off') {
  try {
    await AsyncStorage.setItem(PREF_KEY, v);
  } catch {
    // ignoré
  }
}

async function cancelMorning(day?: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.content.data?.kind === KIND && (!day || n.content.data?.day === day))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function schedule() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Jeux du jour',
      description: 'Un rappel chaque matin quand la grille, le défi et le pendu du jour sont prêts.',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await cancelMorning();
  const now = new Date();
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, MORNING_HOUR, MORNING_MINUTE, 0);
    if (at.getTime() <= now.getTime() + 60000) continue;
    const day = parisDayKey(at);
    const { title, body } = morningMessage(day);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { kind: KIND, day } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

/** Le joueur accepte le rappel : demande l'autorisation du téléphone, puis programme les matins. */
export async function enableMorningNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      // Android 13 et plus : la demande d'autorisation n'apparaît qu'une fois un canal créé.
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Jeux du jour',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    await setPref(granted ? 'on' : 'off');
    if (granted) await schedule();
    return granted;
  } catch {
    return false;
  }
}

/** Le joueur refuse la proposition : on ne la repose pas. */
export async function declineMorningNotifications(): Promise<void> {
  await setPref('off');
}

export async function disableMorningNotifications(): Promise<void> {
  await setPref('off');
  try {
    await cancelMorning();
  } catch {
    // ignoré
  }
}

/** À chaque ouverture : reprogramme les 14 prochains matins (si le rappel est activé et autorisé). */
export async function refreshMorningNotifications(): Promise<void> {
  try {
    if ((await getNotifPref()) !== 'on') return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await schedule();
  } catch {
    // Jamais bloquant.
  }
}

/** Les trois jeux du jour sont terminés : inutile de rappeler ce jour-là (partie jouée après minuit). */
export async function skipTodayNotification(day: string): Promise<void> {
  try {
    await cancelMorning(day);
  } catch {
    // ignoré
  }
}
