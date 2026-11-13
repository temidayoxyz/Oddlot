import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionToDailyChallenges,
  createDailyChallengesState,
  createEmptyAppliedDeltas,
  ensureCurrentDailyChallenges,
  getLocalDateKey,
  selectChallengesForDate,
} from './dailyChallenges';
import { SessionCounters } from './types';

function makeSession(overrides: Partial<SessionCounters> = {}): SessionCounters {
  return {
    score: 0,
    xpEarned: 0,
    bubblesPopped: 0,
    smallPopped: 0,
    mediumPopped: 0,
    largePopped: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    bestMultiplier: 1,
    comboTimer: 0,
    comboMaxTime: 2.5,
    powerUpsCollected: 0,
    powerUpsActivated: 0,
    weathersExperienced: ['clear'],
    elapsedSeconds: 0,
    difficultyLevel: 1,
    stability: 5,
    maxStability: 5,
    goldenPopped: 0,
    chainPops: 0,
    armoredPopped: 0,
    precisionPops: 0,
    ...overrides,
  };
}

test('selectChallengesForDate returns 3 deterministic distinct challenges per date', () => {
  const a1 = selectChallengesForDate('2026-11-13');
  const a2 = selectChallengesForDate('2026-11-13');
  assert.equal(a1.length, 3);
  assert.deepEqual(
    a1.map((c) => c.id),
    a2.map((c) => c.id)
  );
  const uniqueIds = new Set(a1.map((c) => c.id));
  assert.equal(uniqueIds.size, 3);
});

test('ensureCurrentDailyChallenges rolls over when the local date changes', () => {
  const yesterday = createDailyChallengesState('2026-11-12');
  const todayDate = new Date(2026, 10, 13, 10, 0, 0);
  const rolled = ensureCurrentDailyChallenges(yesterday, todayDate);
  assert.equal(rolled.dateKey, getLocalDateKey(todayDate));
  for (const ch of rolled.challenges) {
    assert.equal(rolled.progressById[ch.id].progress, 0);
    assert.equal(rolled.progressById[ch.id].completed, false);
  }
});

test('applySessionToDailyChallenges tracks progress without double-counting or double-awarding XP', () => {
  const baseState = {
    dateKey: '2026-11-13',
    challenges: [
      {
        id: 'dc_pop_50_run',
        title: 'Sky Sprinter',
        description: 'Pop 50 bubbles in one session',
        metric: 'session_bubbles' as const,
        target: 50,
        xpReward: 90,
        scope: 'session' as const,
      },
      {
        id: 'dc_powerups_3',
        title: 'Tactical Surge',
        description: 'Use 3 power-ups today',
        metric: 'daily_powerups' as const,
        target: 3,
        xpReward: 85,
        scope: 'daily' as const,
      },
      {
        id: 'dc_combo_12',
        title: 'Steady Rhythm',
        description: 'Reach a 12x combo streak in one run',
        metric: 'session_combo' as const,
        target: 12,
        xpReward: 100,
        scope: 'session' as const,
      },
    ],
    progressById: {
      dc_pop_50_run: { id: 'dc_pop_50_run', progress: 0, completed: false },
      dc_powerups_3: { id: 'dc_powerups_3', progress: 0, completed: false },
      dc_combo_12: { id: 'dc_combo_12', progress: 0, completed: false },
    },
  };

  // Mid-run sync (e.g. pause)
  const s1 = makeSession({ bubblesPopped: 30, powerUpsActivated: 2, maxCombo: 8 });
  const r1 = applySessionToDailyChallenges(
    baseState,
    s1,
    createEmptyAppliedDeltas('run_1'),
    'run_1',
    1000
  );
  assert.equal(r1.nextState.progressById.dc_pop_50_run.progress, 30);
  assert.equal(r1.nextState.progressById.dc_powerups_3.progress, 2);
  assert.equal(r1.newlyCompleted.length, 0);
  assert.equal(r1.bonusXpGranted, 0);

  // Resume same run and finish
  const s2 = makeSession({ bubblesPopped: 55, powerUpsActivated: 3, maxCombo: 14 });
  const r2 = applySessionToDailyChallenges(r1.nextState, s2, r1.nextApplied, 'run_1', 2000);
  assert.equal(r2.nextState.progressById.dc_pop_50_run.completed, true);
  assert.equal(r2.nextState.progressById.dc_powerups_3.progress, 3);
  assert.equal(r2.nextState.progressById.dc_powerups_3.completed, true);
  assert.equal(r2.nextState.progressById.dc_combo_12.completed, true);
  assert.equal(r2.newlyCompleted.length, 3);
  assert.equal(r2.bonusXpGranted, 275);

  // Subsequent run must NOT re-award XP for already completed challenges
  const s3 = makeSession({ bubblesPopped: 60, powerUpsActivated: 4, maxCombo: 20 });
  const r3 = applySessionToDailyChallenges(
    r2.nextState,
    s3,
    createEmptyAppliedDeltas('run_2'),
    'run_2',
    3000
  );
  assert.equal(r3.newlyCompleted.length, 0);
  assert.equal(r3.bonusXpGranted, 0);
});
