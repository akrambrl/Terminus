import { STATIONS } from '../data/stations';
import { normalize } from './normalize';
import type { Criterion, LineId, Station } from './types';

export const LINES: LineId[] = [
  '1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14',
];

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
    id: 'rer',
    kind: 'transfer',
    label: 'Correspondance RER',
    description: 'La station est en correspondance avec au moins une ligne de RER (A, B, C, D ou E).',
    test: (s) => s.rer.length > 0,
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

/** Distance à vol d'oiseau en kilomètres (formule de haversine). */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Monuments et rayon choisi pour que 25 à 45 stations conviennent à chaque fois.
 * `place` s'affiche dans la grille, `of` sert dans les phrases (« de la tour Eiffel »).
 */
const MONUMENTS: { id: string; place: string; of: string; lat: number; lon: number; km: number }[] = [
  { id: 'eiffel', place: 'Tour Eiffel', of: 'de la tour Eiffel', lat: 48.8584, lon: 2.2945, km: 2 },
  { id: 'notre-dame', place: 'Notre-Dame', of: 'de Notre-Dame', lat: 48.853, lon: 2.3499, km: 1.5 },
  { id: 'sacre-coeur', place: 'Sacré-Cœur', of: 'du Sacré-Cœur', lat: 48.8867, lon: 2.3431, km: 2 },
  { id: 'arc', place: 'Arc de Triomphe', of: "de l'Arc de Triomphe", lat: 48.8738, lon: 2.295, km: 2 },
  { id: 'louvre', place: 'Louvre', of: 'du Louvre', lat: 48.8606, lon: 2.3376, km: 1.5 },
  { id: 'pantheon', place: 'Panthéon', of: 'du Panthéon', lat: 48.8462, lon: 2.3464, km: 1.5 },
  { id: 'opera', place: 'Opéra Garnier', of: "de l'Opéra Garnier", lat: 48.872, lon: 2.3316, km: 1.5 },
  { id: 'montparnasse', place: 'Tour Montparnasse', of: 'de la tour Montparnasse', lat: 48.8421, lon: 2.3219, km: 2 },
  { id: 'pompidou', place: 'Centre Pompidou', of: 'du Centre Pompidou', lat: 48.8607, lon: 2.3522, km: 1.5 },
  { id: 'invalides', place: 'Invalides', of: 'des Invalides', lat: 48.8556, lon: 2.3126, km: 2 },
  { id: 'pere-lachaise', place: 'Père-Lachaise', of: 'du Père-Lachaise', lat: 48.8614, lon: 2.3933, km: 2 },
  { id: 'bnf', place: 'Bibliothèque F.-Mitterrand', of: 'de la Bibliothèque François-Mitterrand', lat: 48.8336, lon: 2.3758, km: 2 },
  { id: 'philharmonie', place: 'Philharmonie', of: 'de la Philharmonie (La Villette)', lat: 48.8913, lon: 2.3936, km: 3 },
  { id: 'parc-princes', place: 'Parc des Princes', of: 'du Parc des Princes', lat: 48.8414, lon: 2.253, km: 3 },
];

const formatKm = (km: number) => `${String(km).replace('.', ',')} km`;

const nearCriteria: Criterion[] = MONUMENTS.map((m) => ({
  id: `near-${m.id}`,
  kind: 'near',
  label: `À moins de ${formatKm(m.km)} ${m.of}`,
  description: `La station est à moins de ${formatKm(m.km)} ${m.of}, à vol d'oiseau.`,
  near: { km: m.km, place: m.place },
  test: (s) => distanceKm(m.lat, m.lon, s.lat, s.lon) < m.km,
}));

export const ALL_CRITERIA: Criterion[] = [
  ...lineCriteria,
  ...transferCriteria,
  ...placeCriteria,
  ...nearCriteria,
  ...nameCriteria,
];

/** Critères trop rares pour être intéressants (moins de 6 stations) sont écartés. */
export const USABLE_CRITERIA = ALL_CRITERIA.filter(
  (c) => STATIONS.filter(c.test).length >= 6,
);
