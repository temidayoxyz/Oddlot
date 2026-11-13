import {
  DailyChallengeDef,
  DailyChallengeProgress,
  DailyChallengesState,
  SessionCounters,
} from './types';

export const DAILY_CHALLENGE_POOL: DailyChallengeDef[] = [
  {
    id: 'dc_pop_50_run',
    title: 'Sky Sprinter',
    description: 'Pop 50 bubbles in one session',
    metric: 'session_bubbles',
    target: 50,
    xpReward: 90,
    scope: 'session',
  },
  {
    id: 'dc_powerups_3',
    title: 'Tactical Surge',
    description: 'Use 3 power-ups today',
    metric: 'daily_powerups',
    target: 3,
    xpReward: 85,
    scope: 'daily',
  },
  {
    id: 'dc_combo_12',
    title: 'Steady Rhythm',
    description: 'Reach a 12x combo streak in one run',
    metric: 'session_combo',
    target: 12,
    xpReward: 100,
    scope: 'session',
  },
  {
    id: 'dc_score_2500',
    title: 'High Pressure',
    description: 'Score 2,500 points in one run',
    metric: 'session_score',
    target: 2500,
    xpReward: 110,
    scope: 'session',
  },
  {
    id: 'dc_small_20',
    title: 'Sharp Aim',
    description: 'Pop 20 small bubbles today',
    metric: 'daily_small',
    target: 20,
    xpReward: 95,
    scope: 'daily',
  },
  {
    id: 'dc_golden_3',
    title: 'Gold Rush',
    description: 'Pop 3 Golden bubbles today',
    metric: 'daily_golden',
    target: 3,
    xpReward: 120,
    scope: 'daily',
  },
  {
    id: 'dc_chains_2',
    title: 'Arc Conductor',
    description: 'Trigger 2 chain reactions today',
    metric: 'daily_chains',
    target: 2,
    xpReward: 105,
    scope: 'daily',
  },
  {
    id: 'dc_survive_60',
    title: 'Cloud Walker',
    description: 'Survive 60 seconds in one run',
    metric: 'session_seconds',
    target: 60,
    xpReward: 95,
    scope: 'session',
  },
];

export interface AppliedSessionDeltas {
  runId: string;
  powerUpsActivated: number;
  goldenPopped: number;
  smallPopped: number;
  chainPops: number;
}

export function createEmptyAppliedDeltas(runId = ''): AppliedSessionDeltas {
  return {
    runId,
    powerUpsActivated: 0,
    goldenPopped: 0,
    smallPopped: 0,
    chainPops: 0,
  };
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimeUntilDailyReset(now: Date = new Date()): string {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectChallengesForDate(dateKey: string): DailyChallengeDef[] {
  const pool = [...DAILY_CHALLENGE_POOL];
  let seed = hashDateKey(dateKey);

  // Deterministic Fisher-Yates shuffle for the given date
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  return pool.slice(0, 3);
}

export function createDailyChallengesState(dateKey: string): DailyChallengesState {
  const challenges = selectChallengesForDate(dateKey);
  const progressById: Record<string, DailyChallengeProgress> = {};
  for (const ch of challenges) {
    progressById[ch.id] = {
      id: ch.id,
      progress: 0,
      completed: false,
    };
  }
  return {
    dateKey,
    challenges,
    progressById,
  };
}

export function ensureCurrentDailyChallenges(
  existing: DailyChallengesState | null,
  now: Date = new Date()
): DailyChallengesState {
  const todayKey = getLocalDateKey(now);
  if (
    existing &&
    existing.dateKey === todayKey &&
    Array.isArray(existing.challenges) &&
    existing.challenges.length === 3
  ) {
    return existing;
  }
  return createDailyChallengesState(todayKey);
}

export function applySessionToDailyChallenges(
  state: DailyChallengesState,
  session: SessionCounters,
  prevApplied: AppliedSessionDeltas,
  runId: string,
  nowMs: number = Date.now()
): {
  nextState: DailyChallengesState;
  nextApplied: AppliedSessionDeltas;
  newlyCompleted: DailyChallengeDef[];
  bonusXpGranted: number;
} {
  const baseApplied =
    prevApplied.runId === runId ? prevApplied : createEmptyAppliedDeltas(runId);

  const deltaPowerUps = Math.max(0, session.powerUpsActivated - baseApplied.powerUpsActivated);
  const deltaGolden = Math.max(0, session.goldenPopped - baseApplied.goldenPopped);
  const deltaSmall = Math.max(0, session.smallPopped - baseApplied.smallPopped);
  const deltaChains = Math.max(0, session.chainPops - baseApplied.chainPops);

  const nextProgressById: Record<string, DailyChallengeProgress> = {};
  const newlyCompleted: DailyChallengeDef[] = [];
  let bonusXpGranted = 0;

  for (const def of state.challenges) {
    const prev = state.progressById[def.id] ?? {
      id: def.id,
      progress: 0,
      completed: false,
    };

    let updatedVal = prev.progress;
    switch (def.metric) {
      case 'session_bubbles':
        updatedVal = Math.max(prev.progress, session.bubblesPopped);
        break;
      case 'session_score':
        updatedVal = Math.max(prev.progress, Math.floor(session.score));
        break;
      case 'session_combo':
        updatedVal = Math.max(prev.progress, session.maxCombo);
        break;
      case 'session_seconds':
        updatedVal = Math.max(prev.progress, Math.floor(session.elapsedSeconds));
        break;
      case 'daily_powerups':
        updatedVal = prev.progress + deltaPowerUps;
        break;
      case 'daily_golden':
        updatedVal = prev.progress + deltaGolden;
        break;
      case 'daily_small':
        updatedVal = prev.progress + deltaSmall;
        break;
      case 'daily_chains':
        updatedVal = prev.progress + deltaChains;
        break;
    }

    const clamped = Math.min(def.target, updatedVal);
    const nowCompleted = prev.completed || clamped >= def.target;

    if (!prev.completed && nowCompleted) {
      newlyCompleted.push(def);
      bonusXpGranted += def.xpReward;
    }

    nextProgressById[def.id] = {
      id: def.id,
      progress: nowCompleted ? def.target : clamped,
      completed: nowCompleted,
      completedAt: prev.completed ? prev.completedAt : nowCompleted ? nowMs : undefined,
    };
  }

  return {
    nextState: {
      dateKey: state.dateKey,
      challenges: state.challenges,
      progressById: nextProgressById,
    },
    nextApplied: {
      runId,
      powerUpsActivated: Math.max(baseApplied.powerUpsActivated, session.powerUpsActivated),
      goldenPopped: Math.max(baseApplied.goldenPopped, session.goldenPopped),
      smallPopped: Math.max(baseApplied.smallPopped, session.smallPopped),
      chainPops: Math.max(baseApplied.chainPops, session.chainPops),
    },
    newlyCompleted,
    bonusXpGranted,
  };
}
