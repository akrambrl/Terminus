/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../src/game/day';
import {
  baseLetter,
  isSolved,
  nameLetters,
  PENDU_MIN_LETTERS,
  PENDU_NO_REPEAT_DAYS,
  PENDU_STATIONS,
  penduStation,
} from '../src/modes/pendu/pendu';

test('les lettres accentuées comptent comme leur lettre de base', () => {
  assert.equal(baseLetter('é'), 'E');
  assert.equal(baseLetter('È'), 'E');
  assert.equal(baseLetter('ç'), 'C');
  assert.equal(baseLetter('ü'), 'U');
  assert.equal(baseLetter('a'), 'A');
  assert.equal(baseLetter('-'), null);
  assert.equal(baseLetter(' '), null);
  assert.equal(baseLetter("'"), null);
  assert.deepEqual(nameLetters('Gaîté'), ['G', 'A', 'I', 'T', 'E']);
  assert.ok(isSolved('Opéra', new Set(['O', 'P', 'E', 'R', 'A'])));
  assert.ok(!isSolved('Opéra', new Set(['O', 'P', 'R', 'A'])));
});

test('aucune station avec un chiffre ou de moins de 5 lettres', () => {
  for (const s of PENDU_STATIONS) {
    assert.ok(!/\d/.test(s.name), s.name);
    assert.ok(nameLetters(s.name).length >= PENDU_MIN_LETTERS, s.name);
  }
  assert.ok(PENDU_STATIONS.length > 3 * PENDU_NO_REPEAT_DAYS);
});

test('pas deux fois la même station en 60 jours (sur 3 ans, passages de cycle compris)', () => {
  const recent: string[] = [];
  for (let i = -30; i < 3 * 365; i++) {
    const day = addDays('2026-11-08', i);
    const id = penduStation(day).id;
    assert.ok(!recent.includes(id), `${day} : ${penduStation(day).name} déjà vue dans les ${PENDU_NO_REPEAT_DAYS} derniers jours`);
    recent.push(id);
    if (recent.length > PENDU_NO_REPEAT_DAYS - 1) recent.shift();
  }
});

test('découpage du nom en morceaux insécables', async () => {
  const { segments } = await import('../src/modes/pendu/segments');
  assert.deepEqual(segments('Alma - Marceau'), ['Alma-', 'Marceau']);
  assert.deepEqual(segments('Saint-Germain-des-Prés'), ['Saint-', 'Germain-', 'des-', 'Prés']);
  assert.deepEqual(segments("Porte d'Orléans"), ['Porte', "d'Orléans"]);
});
