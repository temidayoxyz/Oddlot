import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateComboMultiplier,
  calculateMeteorDestroyReward,
  evaluateMeteorAchievements,
  getLevelFromXp,
  getWaveParams,
  xpRequiredForLevel,
} from './progression';
import { DEFAULT_LIFETIME_STATS } from './storage';

test('XP curve scales monotonically across levels', () => {
  let prev = -1;
  for (let lvl = 1; lvl <= 12; lvl++) {
    const req = xpRequiredForLevel(lvl);
    assert.ok(req > prev, `Level ${lvl} threshold should exceed previous`);
    prev = req;
  }
  const info = getLevelFromXp(xpRequiredForLevel(4) + 25);
  assert.equal(info.level, 4);
  assert.ok(info.progressRatio > 0 && info.progressRatio < 1);
});

test('Wave scaling introduces tougher meteors and faster intervals over time', () => {
  const w1 = getWaveParams(1);
  const w5 = getWaveParams(5);
  assert.equal(w1.weights.heavy, 0);
  assert.equal(w1.weights.explosive, 0);
  assert.ok(w5.weights.heavy > 0);
  assert.ok(w5.weights.explosive > 0);
  assert.ok(w5.spawnInterval < w1.spawnInterval);
  assert.ok(w5.speedMultiplier > w1.speedMultiplier);
});

test('Combo multiplier and early-intercept bonus increase rewards', () => {
  assert.equal(calculateComboMultiplier(1), 1);
  assert.equal(calculateComboMultiplier(7), 3);
  assert.equal(calculateComboMultiplier(35), 10);

  const closeHit = calculateMeteorDestroyReward({
    basePoints: 100,
    baseXp: 10,
    multiplier: 3,
    distanceFromPlanet: 2.5,
    planetRadius: 1.75,
  });
  const earlyHit = calculateMeteorDestroyReward({
    basePoints: 100,
    baseXp: 10,
    multiplier: 3,
    distanceFromPlanet: 6.2,
    planetRadius: 1.75,
  });

  assert.equal(closeHit.earlyIntercept, false);
  assert.equal(earlyHit.earlyIntercept, true);
  assert.ok(earlyHit.points > closeHit.points);
});

test('Achievements unlock once and only when thresholds are satisfied', () => {
  const unlocked = new Set<string>();
  const stats = {
    ...DEFAULT_LIFETIME_STATS,
    totalMeteorsDestroyed: 30,
    highestWave: 5,
  };
  const firstPass = evaluateMeteorAchievements(stats, unlocked);
  assert.ok(firstPass.some((a) => a.id === 'first_intercept'));
  assert.ok(firstPass.some((a) => a.id === 'wave_survivor_5'));
  for (const a of firstPass) unlocked.add(a.id);

  const secondPass = evaluateMeteorAchievements(stats, unlocked);
  assert.equal(secondPass.length, 0);
});
