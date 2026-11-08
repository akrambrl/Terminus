import { Platform } from 'react-native';
import type { CriterionKind, LineId } from './game/types';

/** Marge haute supplémentaire sur le web, pour passer sous les boutons de l'app qui affiche la page. */
export const WEB_TOP_GAP = Platform.OS === 'web' ? 64 : 0;

/*
 * Identité « Correspondances » : fond bleuté comme un carrelage de quai, encre bleu nuit,
 * et une palette vive où chaque famille de critères a sa couleur, comme les lignes d'un plan.
 */
export const palette = {
  ultramarine: '#2B3FD6',
  tomato: '#FF5A36',
  sun: '#FFC229',
  mint: '#14B88A',
  pink: '#F2458C',
  violet: '#7B4AE2',
};

export const colors = {
  background: '#EEF1FF',
  surface: '#FFFFFF',
  ink: '#15123D',
  muted: '#5F6386',
  border: '#D3D8F2',
  accent: palette.ultramarine,
  accentSoft: '#DEE3FF',
  danger: '#D93A1E',
  dangerSoft: '#FFE4DC',
  gold: palette.sun,
  missed: '#E1E5F7',
};

/** Couleur de chaque famille de critères (les lignes gardent leur propre couleur). */
export const kindColors: Record<Exclude<CriterionKind, 'line'>, { bg: string; fg: string }> = {
  place: { bg: palette.ultramarine, fg: '#FFFFFF' },
  name: { bg: palette.pink, fg: '#FFFFFF' },
  transfer: { bg: palette.tomato, fg: '#FFFFFF' },
  near: { bg: palette.mint, fg: '#FFFFFF' },
};

/** Couleurs des tuiles du logo, dans l'ordre. */
export const logoColors = [
  palette.ultramarine,
  palette.tomato,
  palette.sun,
  palette.mint,
  palette.pink,
  palette.violet,
  palette.tomato,
  palette.ultramarine,
];

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'Figtree_500Medium',
  bold: 'Figtree_700Bold',
  heavy: 'Figtree_800ExtraBold',
};

/** Couleurs de lignes propres au jeu (inspirées du réseau, pas les teintes officielles). */
export const lineColors: Record<LineId, { bg: string; fg: string }> = {
  '1': { bg: '#F2C230', fg: '#15123D' },
  '2': { bg: '#2F5FB0', fg: '#FFFFFF' },
  '3': { bg: '#9C9A33', fg: '#FFFFFF' },
  '3bis': { bg: '#86C3E0', fg: '#15123D' },
  '4': { bg: '#B44A9A', fg: '#FFFFFF' },
  '5': { bg: '#F08C3C', fg: '#15123D' },
  '6': { bg: '#7DC49B', fg: '#15123D' },
  '7': { bg: '#EE9FB4', fg: '#15123D' },
  '7bis': { bg: '#7DC49B', fg: '#15123D' },
  '8': { bg: '#C9A3CF', fg: '#15123D' },
  '9': { bg: '#CDC93A', fg: '#15123D' },
  '10': { bg: '#D9AE3A', fg: '#15123D' },
  '11': { bg: '#8A6538', fg: '#FFFFFF' },
  '12': { bg: '#1E7A4A', fg: '#FFFFFF' },
  '13': { bg: '#8CC8DA', fg: '#15123D' },
  '14': { bg: '#5E2A84', fg: '#FFFFFF' },
};
