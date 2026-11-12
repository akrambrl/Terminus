import { dayNumber } from '../game/day';
import { generateDefi } from '../modes/defi/defi';
import { nameLetters, penduStation } from '../modes/pendu/pendu';

/** Heure du rappel du matin (heure du téléphone). */
export const MORNING_HOUR = 8;
export const MORNING_MINUTE = 0;

const TITLES = [
  '🚇 Les jeux du jour sont arrivés !',
  '☕ Ta dose de métro du matin',
  '🧩 Nouvelle grille, nouveau défi',
  '🚉 Terminus, tout le monde descend… et joue !',
  '🔤 Une nouvelle station à deviner',
  '🎯 Le défi du jour t’attend',
  '🗺️ Tu connais vraiment le métro ?',
];

/** Texte de la notification du matin pour un jour de jeu (AAAA-MM-JJ, heure de Paris). */
export function morningMessage(day: string): { title: string; body: string } {
  const n = dayNumber(day);
  const defi = generateDefi(day);
  const station = penduStation(day);
  const letters = nameLetters(station.name).length;
  const lines = station.lines.map((l) => l.replace('bis', ' bis')).join(', ');
  return {
    title: TITLES[((n % TITLES.length) + TITLES.length) % TITLES.length],
    body:
      `Grille n°${n}, Défi : ${defi.a.label} × ${defi.b.label}, ` +
      `Pendu : ${letters} lettres (ligne${station.lines.length > 1 ? 's' : ''} ${lines}). À toi de jouer !`,
  };
}
