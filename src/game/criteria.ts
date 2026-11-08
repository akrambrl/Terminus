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

const LINE_GROUPS: { id: string; label: string; description: string; lines: LineId[] }[] = [
  {
    id: 'auto',
    label: 'Ligne automatique',
    description: 'La station est desservie par une ligne sans conducteur : 1, 4 ou 14.',
    lines: ['1', '4', '14'],
  },
  {
    id: 'bis',
    label: 'Ligne bis',
    description: 'La station est desservie par la ligne 3 bis ou la ligne 7 bis.',
    lines: ['3bis', '7bis'],
  },
  {
    id: '3-3bis',
    label: 'Ligne 3 ou 3 bis',
    description: 'La station est desservie par la ligne 3 ou la ligne 3 bis.',
    lines: ['3', '3bis'],
  },
  {
    id: '7-7bis',
    label: 'Ligne 7 ou 7 bis',
    description: 'La station est desservie par la ligne 7 ou la ligne 7 bis.',
    lines: ['7', '7bis'],
  },
];

const lineGroupCriteria: Criterion[] = LINE_GROUPS.map((g) => ({
  id: `lines-${g.id}`,
  kind: 'line',
  label: g.label,
  description: g.description,
  lines: g.lines,
  test: (s) => s.lines.some((l) => (g.lines as string[]).includes(l)),
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
    label: '2 lignes ou +',
    description: 'Au moins deux lignes de métro desservent la station.',
    test: (s) => s.lines.length >= 2,
  },
  {
    id: 'rer',
    kind: 'transfer',
    label: 'Avec RER',
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
  // Lettres choisies pour donner entre 14 et 64 stations (ni trop rares, ni trop fréquentes).
  ...['F', 'G', 'H', 'J', 'Q', 'V', 'Y'].map<Criterion>((letter) => ({
    id: `contains-${letter}`,
    kind: 'name',
    label: `Contient un ${letter}`,
    description: `Le nom de la station contient la lettre ${letter}, n'importe où (accents ignorés).`,
    test: (s) => normalize(s.name).includes(letter.toLowerCase()),
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
  { id: 'bnf', place: 'BnF Mitterrand', of: 'de la Bibliothèque François-Mitterrand', lat: 48.8336, lon: 2.3758, km: 2 },
  { id: 'philharmonie', place: 'Philharmonie', of: 'de la Philharmonie (La Villette)', lat: 48.8913, lon: 2.3936, km: 3 },
  { id: 'parc-princes', place: 'Parc des Princes', of: 'du Parc des Princes', lat: 48.8414, lon: 2.253, km: 3 },
];

const formatKm = (km: number) => `${String(km).replace('.', ',')} km`;

/**
 * Cours de la Seine, d'Ivry à Saint-Denis, tracé point par point à partir des ponts (précision ~100 m).
 * [latitude, longitude]
 */
const SEINE: [number, number][] = [
  [48.79, 2.415], [48.8165, 2.403], [48.824, 2.394], [48.8275, 2.387], [48.8325, 2.381],
  [48.8385, 2.3765], [48.8445, 2.3655], [48.8505, 2.359], [48.853, 2.349], [48.8575, 2.3415],
  [48.8585, 2.3375], [48.8605, 2.33], [48.864, 2.3195], [48.864, 2.3135], [48.864, 2.302],
  [48.8595, 2.2925], [48.855, 2.2875], [48.8505, 2.2805], [48.8465, 2.2755], [48.8395, 2.27],
  [48.8365, 2.267], [48.829, 2.26], [48.8255, 2.249], [48.8245, 2.23], [48.833, 2.2215],
  [48.8425, 2.2205], [48.856, 2.2215], [48.87, 2.227], [48.8765, 2.2395], [48.8855, 2.2525],
  [48.899, 2.2745], [48.9055, 2.29], [48.9095, 2.2965], [48.915, 2.32], [48.925, 2.338],
  [48.933, 2.345], [48.942, 2.35],
];

/** Distance (km) entre une station et le tracé de la Seine. */
function distanceToSeineKm(lat: number, lon: number): number {
  const kx = 111.32 * Math.cos((48.86 * Math.PI) / 180);
  const ky = 110.57;
  const px = lon * kx;
  const py = lat * ky;
  let best = Infinity;
  for (let i = 0; i < SEINE.length - 1; i++) {
    const [ax, ay] = [SEINE[i][1] * kx, SEINE[i][0] * ky];
    const [bx, by] = [SEINE[i + 1][1] * kx, SEINE[i + 1][0] * ky];
    const [vx, vy] = [bx - ax, by - ay];
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    best = Math.min(best, Math.hypot(px - ax - t * vx, py - ay - t * vy));
  }
  return best;
}

const nearCriteria: Criterion[] = [
  {
    id: 'near-seine',
    kind: 'near',
    label: 'À moins de 1 km de la Seine',
    description: "La station est à moins de 1 km de la Seine, à vol d'oiseau.",
    near: { km: 1, place: 'Seine' },
    test: (s) => distanceToSeineKm(s.lat, s.lon) < 1,
  },
  ...MONUMENTS.map<Criterion>((m) => ({
  id: `near-${m.id}`,
  kind: 'near',
  label: `À moins de ${formatKm(m.km)} ${m.of}`,
  description: `La station est à moins de ${formatKm(m.km)} ${m.of}, à vol d'oiseau.`,
  near: { km: m.km, place: m.place },
  test: (s) => distanceKm(m.lat, m.lon, s.lat, s.lon) < m.km,
  })),
];

export const ALL_CRITERIA: Criterion[] = [
  ...lineCriteria,
  ...lineGroupCriteria,
  ...transferCriteria,
  ...placeCriteria,
  ...nearCriteria,
  ...nameCriteria,
];

/** Critères trop rares pour être intéressants (moins de 6 stations) sont écartés. */
export const USABLE_CRITERIA = ALL_CRITERIA.filter(
  (c) => STATIONS.filter(c.test).length >= 6,
);
