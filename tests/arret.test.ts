import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../src/game/day';
import { ARRET_LAUNCH, ARRET_STOPS, arretPoints, arretTrip, followsLine, possibleLines } from '../src/modes/arret/arret';

test('le trajet du jour se suit sur sa ligne et n’a qu’une réponse à la fin', () => {
  for (let i = 0; i < 120; i++) {
    const t = arretTrip(addDays(ARRET_LAUNCH, i));
    assert.equal(t.stops.length, ARRET_STOPS);
    assert.ok(followsLine(t.line, t.stops));
    assert.deepEqual(possibleLines(t.stops), [t.line]);
    // À chaque station, la vraie ligne fait partie des lignes possibles.
    for (let k = 1; k <= ARRET_STOPS; k++) assert.ok(possibleLines(t.stops.slice(0, k)).includes(t.line));
  }
});

test('pas la même ligne deux jours de suite', () => {
  for (let i = 1; i < 200; i++) {
    assert.notEqual(arretTrip(addDays(ARRET_LAUNCH, i)).line, arretTrip(addDays(ARRET_LAUNCH, i - 1)).line);
  }
});

test('points', () => {
  assert.equal(arretPoints(true, 1), 5);
  assert.equal(arretPoints(true, 5), 1);
  assert.equal(arretPoints(false, 5), 0);
});
