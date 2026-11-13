import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateComboMultiplier,
  calculatePopReward,
  evaluateAchievements,
  getDifficultyParams,
  getLevelFromXp,
  xpRequiredForLevel,
} from './progression';
import { LifetimeStats } from './types';

test('XP and level curve scales monotonically', () => {
  assert.equal(xpRequiredForLevel(1), 0);
  const l2 = xpRequiredForLevel(2);
  const l3 = xpRequiredForLevel(3);
  assert.ok(l2 > 0);
  assert.ok(l3 > l2);

  const lv1 = getLevelFromXp(0);
  assert.equal(lv1.level, 1);
  assert.equal(lv1.progressRatio, 0);

  const lv2 = getLevelFromXp(l2);
  assert.equal(lv2.level, 2);
});

test('Combo multiplier increases across thresholds', () => {
  assert.equal(calculateComboMultiplier(1), 1);
  assert.equal(calculateComboMultiplier(3), 1.5);
  assert.equal(calculateComboMultiplier(7), 2);
  assert.equal(calculateComboMultiplier(12), 3);
  assert.equal(calculateComboMultiplier(45), 6);
  assert.equal(calculateComboMultiplier(80), 10);
});

test('Pop reward respects multiplier, precision, and boosts', () => {
  const base = calculatePopReward({
    type: 'standard',
    size: 'medium',
    multiplier: 1,
    scoreBoostActive: false,
    xpBoostActive: false,
    weatherXpBonus: 1,
    precisionBonus: false,
  });
  const boosted = calculatePopReward({
    type: 'standard',
    size: 'medium',
    multiplier: 2,
    scoreBoostActive: true,
    xpBoostActive: true,
    weatherXpBonus: 1.4,
    precisionBonus: true,
  });
  assert.equal(base.points, 25);
  assert.equal(boosted.points, Math.round(25 * 2 * 1.25 * 2));
  assert.ok(boosted.xp > base.xp * 2);
});

test('Difficulty ramp starts approachable and scales up', () => {
  const early = getDifficultyParams(0);
  const late = getDifficultyParams(180);
  assert.equal(early.level, 1);
  assert.equal(early.hazardChance, 0);
  assert.ok(late.level > early.level);
  assert.ok(late.spawnInterval < early.spawnInterval);
  assert.ok(late.speedScale > early.speedScale);
  assert.ok(late.hazardChance > 0);
});

test('Achievements unlock only once when thresholds are met', () => {
  const stats: LifetimeStats = {
    highScore: 6200,
    totalScore: 6200,
    totalXp: 300,
    totalBubblesPopped: 55,
    smallBubblesPopped: 20,
    mediumBubblesPopped: 25,
    largeBubblesPopped: 10,
    highestCombo: 18,
    bestMultiplier: 4,
    totalPlaySeconds: 120,
    gamesPlayed: 2,
    powerUpsCollected: 4,
    powerUpsActivated: 3,
    goldenBubblesPopped: 2,
    chainReactionsTriggered: 1,
    weathersSeen: ['clear', 'golden_hour'],
  };
  const unlocked = new Set<string>();
  const newly = evaluateAchievements(stats, unlocked);
  const ids = newly.map((a) => a.id);
  assert.ok(ids.includes('first_pop'));
  assert.ok(ids.includes('combo_15'));
  assert.ok(ids.includes('score_5k'));

  for (const a of newly) unlocked.add(a.id);
  const secondPass = evaluateAchievements(stats, unlocked);
  assert.equal(secondPass.length, 0);
});
