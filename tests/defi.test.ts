/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STATIONS } from '../src/data/stations';
import { addDays } from '../src/game/day';
import { DEFI_MAX_ANSWERS, DEFI_MIN_ANSWERS, generateDefi } from '../src/modes/defi/defi';

test('chaque défi des 2 prochaines années a entre 3 et 8 réponses valides', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 730; i++) {
    const day = addDays('2026-11-08', i);
    const d = generateDefi(day);
    const real = STATIONS.filter((s) => d.a.test(s) && d.b.test(s)).map((s) => s.id);
    assert.deepEqual(d.answers, real, day);
    assert.ok(real.length >= DEFI_MIN_ANSWERS && real.length <= DEFI_MAX_ANSWERS, `${day} : ${real.length}`);
    assert.notEqual(d.a.kind, d.b.kind, day);
    seen.add(`${d.a.id}|${d.b.id}`);
  }
  // Variété : au moins 300 défis différents sur 730 jours.
  assert.ok(seen.size >= 300, `seulement ${seen.size} défis différents`);
});
