import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStreakReward, nextTracker, streakReward } from '../src/game/streakBonus';

test('récompense 7 jours puis chaque palier de 30', () => {
    assert.equal(streakReward(6), 0);
    assert.equal(streakReward(7), 5);
    assert.equal(streakReward(14), 0);
    assert.equal(streakReward(30), 15);
    assert.equal(streakReward(60), 15);
  });
test('prochain palier', () => {
    assert.deepEqual(nextStreakReward(3), { at: 7, coins: 5 });
    assert.deepEqual(nextStreakReward(7), { at: 30, coins: 15 });
    assert.deepEqual(nextStreakReward(30), { at: 60, coins: 15 });
  });
test('compte un jour une seule fois et casse la série après un trou', () => {
    const a = nextTracker({ last: '2026-11-17', streak: 6 }, '2026-11-18');
    assert.equal(a.tracker.streak, 7);
    assert.equal(a.reward, 5);
    const again = nextTracker(a.tracker, '2026-11-18');
    assert.equal(again.reward, 0);
    assert.equal(again.tracker, a.tracker);
    assert.equal(nextTracker(a.tracker, '2026-11-20').tracker.streak, 1);
    assert.equal(nextTracker(null, '2026-11-20').tracker.streak, 1);
  });

