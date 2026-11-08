import { STATIONS } from '../data/stations';
import { normalize } from './normalize';
import type { Station } from './types';

export const STATION_BY_ID = new Map<string, Station>(STATIONS.map((s) => [s.id, s]));

const SEARCH_INDEX = STATIONS.map((s) => ({ station: s, key: normalize(s.name) }));

/** Recherche tolérante aux accents : chaque mot tapé doit commencer un mot du nom. */
export function searchStations(query: string, limit = 8): Station[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(' ');
  return SEARCH_INDEX.filter(({ key }) => {
    const words = key.split(' ');
    return terms.every((t) => words.some((w) => w.startsWith(t)));
  })
    .sort((a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q)) || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map(({ station }) => station);
}
