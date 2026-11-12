import { Share } from 'react-native';
import { WEB_URL } from '../store/links';

/** « terminusparis.fr », pour les textes de partage. */
export const SITE_LABEL = WEB_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Ligne de tickets pour le partage : 🎫 restant, ❌ composté. */
export function ticketLine(total: number, used: number): string {
  return '🎫'.repeat(Math.max(0, total - used)) + '❌'.repeat(Math.min(total, used));
}

/** Ouvre la fenêtre de partage ; sur un navigateur qui n'en a pas, copie le texte. */
export async function shareMessage(message: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    await Share.share({ message });
    return 'shared';
  } catch {
    const clipboard = (globalThis as { navigator?: { clipboard?: Clipboard } }).navigator?.clipboard;
    if (!clipboard) return 'failed';
    try {
      await clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}

/** Date « 12 novembre » à partir d'une clé AAAA-MM-JJ. */
export function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
