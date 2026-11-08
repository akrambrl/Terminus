import { Platform } from 'react-native';
import type { LineId } from './game/types';

/** Marge haute supplémentaire sur le web, pour passer sous les boutons de l'app qui affiche la page. */
export const WEB_TOP_GAP = Platform.OS === 'web' ? 64 : 0;

export const colors = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  ink: '#16213A',
  muted: '#6B7280',
  border: '#D9D3C7',
  accent: '#0E7C66',
  accentSoft: '#D7EFE8',
  danger: '#C2410C',
  dangerSoft: '#FDE7DC',
  gold: '#B7892F',
};

/** Couleurs de lignes propres au jeu (inspirées du réseau, pas les teintes officielles). */
export const lineColors: Record<LineId, { bg: string; fg: string }> = {
  '1': { bg: '#F2C230', fg: '#16213A' },
  '2': { bg: '#2F5FB0', fg: '#FFFFFF' },
  '3': { bg: '#9C9A33', fg: '#FFFFFF' },
  '3bis': { bg: '#86C3E0', fg: '#16213A' },
  '4': { bg: '#B44A9A', fg: '#FFFFFF' },
  '5': { bg: '#F08C3C', fg: '#16213A' },
  '6': { bg: '#7DC49B', fg: '#16213A' },
  '7': { bg: '#EE9FB4', fg: '#16213A' },
  '7bis': { bg: '#7DC49B', fg: '#16213A' },
  '8': { bg: '#C9A3CF', fg: '#16213A' },
  '9': { bg: '#CDC93A', fg: '#16213A' },
  '10': { bg: '#D9AE3A', fg: '#16213A' },
  '11': { bg: '#8A6538', fg: '#FFFFFF' },
  '12': { bg: '#1E7A4A', fg: '#FFFFFF' },
  '13': { bg: '#8CC8DA', fg: '#16213A' },
  '14': { bg: '#5E2A84', fg: '#FFFFFF' },
};
