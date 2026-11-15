import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed, generatePuzzle, GOLD_START } from '../src/game/generator';
import { goldStations } from '../src/game/gold';
import { addDays } from '../src/game/day';

test('les grilles en or ont une station valable dans les 9 cases', () => {
  for (let i = 0; i < 60; i++) {
    const g = goldStations(generatePuzzle(dailySeed(addDays(GOLD_START, i))));
    assert.equal(g.cells, 9);
    assert.ok(g.ids.size >= 1);
  }
});

test('les grilles déjà jouées ne changent pas', () => {
  const p = generatePuzzle(dailySeed('2026-11-15'));
  assert.equal(p.rows.map((r) => r.label).join(' / '), 'Ligne 9 / Ligne 1 / Nom court');
});
