import { STATIONS } from '../data/stations';
import { normalize } from './normalize';
import type { Criterion, LineId, Station } from './types';

export const LINES: LineId[] = [
  '1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14',
];

const LEFT_BANK = new Set([5, 6, 7, 13, 14, 15]);

const lineLabel = (l: LineId) => `Ligne ${l.replace('bis', ' bis')}`;
const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);
const words = (s: Station) => normalize(s.name).split(' ');

const lineCriteria: Criterion[] = LINES.map((l) => ({
  id: `line-${l}`,
  kind: 'line',
  label: lineLabel(l),
  description: `La station est desservie par la ${lineLabel(l).toLowerCase()}.`,
  line: l,
  test: (s) => s.lines.includes(l),
}));

const transferCriteria: Criterion[] = [
  {
    id: 'single',
    kind: 'transfer',
    label: 'Une seule ligne',
    description: "Une seule ligne de métro s'arrête à la station.",
    test: (s) => s.lines.length === 1,
  },
  {
    id: 'transfer',
    kind: 'transfer',
    label: 'Correspondance',
    description: 'Au moins deux lignes de métro desservent la station.',
    test: (s) => s.lines.length >= 2,
  },
  {
    id: 'transfer3',
    kind: 'transfer',
    label: '3 lignes ou +',
    description: 'Au moins trois lignes de métro desservent la station.',
    test: (s) => s.lines.length >= 3,
  },
];

const placeCriteria: Criterion[] = [
  ...Array.from({ length: 20 }, (_, i) => i + 1).map<Criterion>((n) => ({
    id: `arr-${n}`,
    kind: 'place',
    label: `Paris ${ordinal(n)}`,
    description: `La station se trouve (au moins en partie) dans le ${ordinal(n)} arrondissement.`,
    test: (s) => s.arr.includes(n),
  })),
  {
    id: 'suburb',
    kind: 'place',
    label: 'Hors Paris',
    description: 'La station se trouve en dehors de Paris intra-muros.',
    test: (s) => s.arr.length === 0,
  },
  {
    id: 'left-bank',
    kind: 'place',
    label: 'Rive gauche',
    description: 'La station est dans Paris, rive gauche (5e, 6e, 7e, 13e, 14e ou 15e).',
    test: (s) => s.arr.length > 0 && s.arr.every((a) => LEFT_BANK.has(a)),
  },
  {
    id: 'right-bank',
    kind: 'place',
    label: 'Rive droite',
    description: 'La station est dans Paris, rive droite.',
    test: (s) => s.arr.length > 0 && s.arr.every((a) => !LEFT_BANK.has(a)),
  },
];

const nameCriteria: Criterion[] = [
  {
    id: 'porte',
    kind: 'name',
    label: 'Commence par Porte',
    description: 'Le nom commence par « Porte ».',
    test: (s) => words(s)[0] === 'porte',
  },
  {
    id: 'saint',
    kind: 'name',
    label: 'Saint ou Sainte',
    description: 'Le nom contient « Saint » ou « Sainte ».',
    test: (s) => words(s).some((w) => w === 'saint' || w === 'sainte'),
  },
  {
    id: 'double',
    kind: 'name',
    label: 'Nom en 2 parties',
    description:
      'Le nom associe deux lieux ou personnes séparés par un tiret, comme « Sèvres - Babylone » ou « Barbès - Rochechouart ». Les noms simplement composés comme « Pont-Neuf » ne comptent pas.',
    test: (s) => s.name.includes(' - '),
  },
  {
    id: 'one-word',
    kind: 'name',
    label: 'Un seul mot',
    description: "Le nom tient en un seul mot (ni espace, ni tiret, ni apostrophe).",
    test: (s) => /^[^\s'-]+$/.test(s.name),
  },
  {
    id: 'mairie',
    kind: 'name',
    label: 'Mairie ou Hôtel de Ville',
    description: 'Le nom contient « Mairie » ou « Hôtel de Ville ».',
    test: (s) => /mairie|hotel de ville/.test(normalize(s.name)),
  },
  ...['B', 'C', 'G', 'L', 'M', 'P', 'R', 'S'].map<Criterion>((letter) => ({
    id: `letter-${letter}`,
    kind: 'name',
    label: `Commence par ${letter}`,
    description: `Le nom de la station commence par la lettre ${letter}.`,
    test: (s) => normalize(s.name).startsWith(letter.toLowerCase()),
  })),
];

const terminusCriteria: Criterion[] = [
  {
    id: 'terminus',
    kind: 'terminus',
    label: 'Terminus',
    description: "La station est le terminus d'au moins une ligne.",
    test: (s) => s.terminus,
  },
];

export const ALL_CRITERIA: Criterion[] = [
  ...lineCriteria,
  ...transferCriteria,
  ...placeCriteria,
  ...nameCriteria,
  ...terminusCriteria,
];

/** Critères trop rares pour être intéressants (moins de 6 stations) sont écartés. */
export const USABLE_CRITERIA = ALL_CRITERIA.filter(
  (c) => STATIONS.filter(c.test).length >= 6,
);
