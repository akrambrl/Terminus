import { Platform } from 'react-native';
import { border, color, lineColor, radius, shadow, space } from './design/tokens';
import type { CriterionKind, LineId } from './game/types';

/**
 * Thème de l'app : tout vient de la charte (terminus-kit/tokens.css -> src/design/tokens.ts).
 * Aucune couleur n'est écrite ici : seulement des choix d'usage et des mélanges calculés.
 */

/**
 * Marge haute supplémentaire quand la version web est affichée dans un cadre (aperçu dans l'app Claude),
 * pour passer sous ses boutons. Rien en appli native ni en web app installée.
 */
const inFrame = (() => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
})();
export const WEB_TOP_GAP = Platform.OS === 'web' && inFrame ? 64 : 0;

/** Mélange deux couleurs #RRGGBB (t = part de la seconde). */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Même couleur avec une opacité (pour les voiles et le trait des tuiles cachées). */
export function alpha(hex: string, a: number): string {
  const p = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgba(${p(0)}, ${p(1)}, ${p(2)}, ${a})`;
}

export const palette = {
  ultramarine: color.blue,
  tomato: color.tomato,
  sun: color.sun,
  mint: color.mint,
  pink: color.pink,
  violet: color.violet,
};

export const colors = {
  /** Fond des écrans de jeu clairs. */
  background: color.surface,
  /** Cartes, cases, champs. */
  surface: color.white,
  white: color.white,
  ink: color.ink,
  blue: color.blue,
  tomato: color.tomato,
  sun: color.sun,
  mint: color.mint,
  pink: color.pink,
  violet: color.violet,
  muted: color.inkMuted,
  border: color.lineEmpty,
  plus: color.plus,
  cream: color.cream,
  accent: color.blue,
  accentSoft: mix(color.blue, color.white, 0.86),
  /** Erreurs : traits et croix tomate ; le texte d'erreur reste bleu nuit (contraste). */
  danger: color.tomato,
  dangerSoft: mix(color.tomato, color.white, 0.84),
  gold: color.sun,
  missed: color.lineEmpty,
  mintSoft: mix(color.mint, color.white, 0.85),
  brick: {
    surface: color.brickOnSurface,
    ink: color.brickOnInk,
    blue: color.brickOnBlue,
    violet: color.brickOnViolet,
    mint: color.brickOnMint,
  },
};

/** Fond de chaque écran (charte : défi violet, réponses menthe, pendu bleu nuit). */
export const screens = {
  grille: { bg: color.surface, brick: color.brickOnSurface, dark: false },
  defi: { bg: color.violet, brick: color.brickOnViolet, dark: true },
  reponse: { bg: color.mint, brick: color.brickOnMint, dark: true },
  pendu: { bg: color.ink, brick: color.brickOnInk, dark: true },
} as const;
export type ScreenId = keyof typeof screens;

/**
 * Texte lisible sur un fond de la palette (règle de contraste de la charte) :
 * blanc sur bleu, violet et bleu nuit ; sur tomate, menthe et rose, blanc seulement en gros texte gras
 * (24 px et plus), sinon bleu nuit ; sur soleil, toujours bleu nuit.
 */
export function textOn(bg: string, fontSize = 14): string {
  if (bg === color.blue || bg === color.violet || bg === color.ink) return color.white;
  if (bg === color.tomato || bg === color.mint || bg === color.pink) return fontSize >= 24 ? color.white : color.ink;
  return color.ink;
}

/** Couleur de chaque famille de critères (les lignes ont leur case blanche « Ligne »). */
export const kindColors: Record<Exclude<CriterionKind, 'line'>, { bg: string }> = {
  place: { bg: color.blue },
  name: { bg: color.pink },
  transfer: { bg: color.tomato },
  near: { bg: color.mint },
};

/** Couleurs des tuiles du logo, dans l'ordre (T E R M I N U S). */
export const logoColors = [
  color.blue,
  color.tomato,
  color.sun,
  color.mint,
  color.pink,
  color.violet,
  color.tomato,
  color.blue,
];
/** Inclinaison des tuiles du logo (charte : −4°, +3°, −3°, +4°…). */
export const logoTilt = [-4, 3, -3, 4, -4, 3, -3, 4];

/** Polices du kit (assets/fonts, converties des woff2 de terminus-kit/polices). */
export const fonts = {
  display: 'BricolageGrotesque-ExtraBold',
  body: 'Figtree-Bold',
  bold: 'Figtree-Bold',
  heavy: 'Figtree-ExtraBold',
};

/** Pastilles de ligne (couleurs propres au jeu, définies dans la charte). */
export const lineColors: Record<LineId, { bg: string; fg: string }> = lineColor;

/*
 * Mise à l'échelle de la charte pour l'écran : ses valeurs sont prévues pour des visuels de 1080 px de large,
 * l'app s'affiche sur environ 400 px. Bordures et ombres à ~65 % et ~42 %, rayons proportionnels à la taille.
 */
const S = 0.42;
export const ui = {
  /** Bordure bleu nuit des cartes, cases critère, boutons. */
  border: Math.round(border.width * 0.65 * 2) / 2,
  /** Bordure fine (cases vides, pastilles). */
  borderThin: Math.max(1.5, Math.round(border.width * 0.45 * 2) / 2),
  /** Ombre pleine décalée vers le bas. */
  shadowY: Math.round(shadow.solid.y * S),
  shadowColor: color.ink,
  /** Rayon des cartes et des fenêtres. */
  radiusCard: Math.round(radius.card * S),
  radiusPill: radius.pill,
  /** Rayon d'une case ou d'une tuile de côté `size` (charte : environ 22 % du côté). */
  radiusFor: (size: number) => Math.round(size * 0.22),
  /** Rayon d'une pastille de ligne de côté `size`. */
  badgeRadius: (size: number) => size * radius.badge,
  space: { xs: Math.round(space[1] * 0.5), s: Math.round(space[1] * 0.75), m: space[1], l: Math.round(space[2] * 0.85), xl: Math.round(space[3] * 0.6) },
  /** Zone tactile minimale. */
  touch: 44,
};
