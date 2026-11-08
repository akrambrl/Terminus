export type LineId =
  | '1' | '2' | '3' | '3bis' | '4' | '5' | '6' | '7' | '7bis'
  | '8' | '9' | '10' | '11' | '12' | '13' | '14';

export interface Station {
  id: string;
  name: string;
  lines: string[];
  /** Arrondissements de Paris (vide si la station est en banlieue). */
  arr: number[];
  /** Communes hors Paris. */
  communes: string[];
  terminus: boolean;
}

export type CriterionKind = 'line' | 'transfer' | 'place' | 'name' | 'terminus';

export interface Criterion {
  id: string;
  kind: CriterionKind;
  /** Texte affiché dans l'en-tête de la grille. */
  label: string;
  /** Explication plus complète (aide, résultats). */
  description: string;
  line?: LineId;
  test: (s: Station) => boolean;
}

export interface Puzzle {
  seed: string;
  rows: Criterion[];
  cols: Criterion[];
  /** answers[r][c] = identifiants des stations valides pour la case. */
  answers: string[][][];
}
