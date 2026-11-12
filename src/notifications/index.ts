/** Site web : pas de notifications (seulement dans les apps iPhone et Android). */
export const notificationsSupported = false;
export type NotifPref = 'on' | 'off' | null;
export async function getNotifPref(): Promise<NotifPref> {
  return null;
}
export async function enableMorningNotifications(): Promise<boolean> {
  return false;
}
export async function disableMorningNotifications(): Promise<void> {}
export async function refreshMorningNotifications(): Promise<void> {}
export async function skipTodayNotification(_day: string): Promise<void> {}
export async function declineMorningNotifications(): Promise<void> {}
