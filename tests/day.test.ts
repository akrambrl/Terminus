/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dayNumber, parisDayKey } from '../src/game/day';
import { dailySeed, generatePuzzle, puzzleSignature } from '../src/game/generator';
import { defiSignature, generateDefi } from '../src/modes/defi/defi';
import { penduStation } from '../src/modes/pendu/pendu';

test('le jour change à minuit heure de Paris (hiver, UTC+1)', () => {
  assert.equal(parisDayKey(new Date('2026-12-01T22:59:59Z')), '2026-12-01');
  assert.equal(parisDayKey(new Date('2026-12-01T23:00:00Z')), '2026-12-02');
});

test('le jour change à minuit heure de Paris (été, UTC+2)', () => {
  assert.equal(parisDayKey(new Date('2027-07-14T21:59:59Z')), '2027-07-14');
  assert.equal(parisDayKey(new Date('2027-07-14T22:00:00Z')), '2027-07-15');
});

test("passages à l'heure d'été et d'hiver", () => {
  // 28 mars 2027 : passage à l'heure d'été à 1 h UTC.
  assert.equal(parisDayKey(new Date('2027-03-27T22:59:00Z')), '2027-03-27');
  assert.equal(parisDayKey(new Date('2027-03-27T23:00:00Z')), '2027-03-28');
  assert.equal(parisDayKey(new Date('2027-03-28T21:59:00Z')), '2027-03-28');
  assert.equal(parisDayKey(new Date('2027-03-28T22:00:00Z')), '2027-03-29');
  // 31 octobre 2027 : retour à l'heure d'hiver.
  assert.equal(parisDayKey(new Date('2027-10-30T21:59:00Z')), '2027-10-30');
  assert.equal(parisDayKey(new Date('2027-10-30T22:00:00Z')), '2027-10-31');
  assert.equal(parisDayKey(new Date('2027-10-31T22:59:00Z')), '2027-10-31');
  assert.equal(parisDayKey(new Date('2027-10-31T23:00:00Z')), '2027-11-01');
});

test('même jour pour un joueur à New York ou à Tokyo au même instant', () => {
  // 23 h 30 à Paris le 1er décembre = 17 h 30 à New York, 7 h 30 le 2 à Tokyo : on joue au 1er décembre.
  assert.equal(parisDayKey(new Date('2026-12-01T22:30:00Z')), '2026-12-01');
});

test('addDays et dayNumber', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-03-01', -1), '2027-02-28');
  assert.equal(dayNumber('2026-11-08'), 1);
  assert.equal(dayNumber(addDays('2026-11-08', 365)), 366);
});

test('contenu du jour déterministe pour une date donnée', () => {
  const day = '2026-12-01';
  assert.equal(puzzleSignature(generatePuzzle(dailySeed(day))), puzzleSignature(generatePuzzle(dailySeed(day))));
  assert.equal(defiSignature(generateDefi(day)), defiSignature(generateDefi(day)));
  assert.equal(penduStation(day).id, penduStation(day).id);
  // Et il change d'un jour à l'autre.
  assert.notEqual(penduStation(day).id, penduStation(addDays(day, 1)).id);
});

test('compte à rebours jusqu’à minuit heure de Paris', async () => {
  const { msUntilNextParisDay, formatCountdown } = await import('../src/game/day');
  // 17 h 39 à Paris (hiver, UTC+1) -> 6 h 21 min.
  assert.equal(formatCountdown(msUntilNextParisDay(new Date('2026-11-12T16:39:00Z'))), '6 h 21 min');
  // 23 h 30 à Paris en été (UTC+2) -> 30 min.
  assert.equal(formatCountdown(msUntilNextParisDay(new Date('2027-07-14T21:30:00Z'))), '30 min');
  // Veille du passage à l'heure d'été : minuit à Paris = 23 h UTC.
  assert.equal(msUntilNextParisDay(new Date('2027-03-27T22:00:00Z')), 3600000);
  // Veille du retour à l'heure d'hiver : minuit à Paris = 22 h UTC.
  assert.equal(msUntilNextParisDay(new Date('2027-10-30T21:00:00Z')), 3600000);
});

test('points de rareté de la grille', async () => {
  const { stationPoints, gridPoints, bestGridPoints } = await import('../src/game/points');
  const { dailySeed, generatePuzzle } = await import('../src/game/generator');
  const { STATIONS } = await import('../src/data/stations');
  const id = (name: string) => STATIONS.find((s) => s.name === name)!.id;
  assert.equal(stationPoints(id('Châtelet')), 10);
  assert.ok(stationPoints(id('Pelleport')) >= 90);
  for (const s of STATIONS) assert.ok(stationPoints(s.id) >= 10 && stationPoints(s.id) <= 100, s.name);
  assert.equal(gridPoints([[id('Châtelet'), null, null], [null, null, null], [null, null, null]]), 10);
  // Le meilleur total possible est atteignable et au moins égal à 9 × 10.
  const p = generatePuzzle(dailySeed('2026-12-01'));
  const best = bestGridPoints(p.answers);
  assert.ok(best >= 90 && best <= 900, String(best));
});

test('texte de la notification du matin', async () => {
  const { morningMessage } = await import('../src/notifications/content');
  const m = morningMessage('2026-11-13');
  assert.ok(m.title.length > 5);
  assert.match(m.body, /Grille n°6/);
  assert.match(m.body, /Défi : Ligne 13 × Contient un V/);
  assert.match(m.body, /Pendu : 13 lettres \(ligne 13\)/);
});
