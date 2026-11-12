import { Platform } from 'react-native';

/**
 * Provenance des joueurs du site (liens suivis /tiktok, /insta, /liens… : voir public/liens/).
 * Les paramètres utm_* de l'adresse sont gardés au premier passage (« premier contact ») dans le
 * navigateur, puis joints aux statistiques PostHog, seulement si le joueur les a acceptées.
 * Dans les apps, la provenance est mesurée par l'App Store (ct=) et Google Play (referrer=).
 */
export interface Acquisition {
  source: string;
  medium: string;
  campaign: string;
}

const KEY = 'terminus:acquisition';
const clean = (v: string | null) => (v ?? '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40);

export function readAcquisition(): Acquisition | null {
  if (Platform.OS !== 'web') return null;
  try {
    const g = globalThis as { location?: { search?: string }; localStorage?: Storage };
    const params = new URLSearchParams(g.location?.search ?? '');
    const fromUrl: Acquisition = {
      source: clean(params.get('utm_source')),
      medium: clean(params.get('utm_medium')),
      campaign: clean(params.get('utm_campaign')),
    };
    const stored = g.localStorage?.getItem(KEY);
    if (stored) return JSON.parse(stored) as Acquisition;
    if (!fromUrl.source) return null;
    g.localStorage?.setItem(KEY, JSON.stringify(fromUrl));
    return fromUrl;
  } catch {
    return null;
  }
}
