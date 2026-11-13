import {
  AchievementDef,
  BubbleSize,
  BubbleType,
  LifetimeStats,
  PowerUpId,
  WeatherId,
} from './types';

export interface WeatherConfig {
  id: WeatherId;
  label: string;
  subtitle: string;
  durationSeconds: number;
  windBase: number;
  windVariance: number;
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyHorizon: [number, number, number];
  cloudTint: [number, number, number, number];
  xpBonus: number;
  speedMultiplier: number;
  rainDensity: number;
  starAlpha: number;
  auroraAlpha: number;
  sunAlpha: number;
  sunColor: string;
}

export const WEATHER_SEQUENCE: WeatherId[] = [
  'clear',
  'golden_hour',
  'overcast',
  'rain',
  'storm',
  'night',
  'aurora',
];

export const WEATHER_CONFIGS: Record<WeatherId, WeatherConfig> = {
  clear: {
    id: 'clear',
    label: 'Clear Sky',
    subtitle: 'Calm breeze & bright thermals',
    durationSeconds: 32,
    windBase: 8,
    windVariance: 10,
    skyTop: [24, 96, 184],
    skyMid: [66, 154, 226],
    skyHorizon: [164, 219, 248],
    cloudTint: [255, 255, 255, 0.72],
    xpBonus: 1.0,
    speedMultiplier: 1.0,
    rainDensity: 0,
    starAlpha: 0,
    auroraAlpha: 0,
    sunAlpha: 0.85,
    sunColor: 'rgba(255, 245, 200, 0.9)',
  },
  golden_hour: {
    id: 'golden_hour',
    label: 'Golden Hour',
    subtitle: 'Warm updrafts · More Golden bubbles',
    durationSeconds: 30,
    windBase: -12,
    windVariance: 12,
    skyTop: [45, 58, 122],
    skyMid: [184, 98, 122],
    skyHorizon: [248, 178, 108],
    cloudTint: [255, 224, 198, 0.68],
    xpBonus: 1.15,
    speedMultiplier: 1.04,
    rainDensity: 0,
    starAlpha: 0.15,
    auroraAlpha: 0,
    sunAlpha: 0.95,
    sunColor: 'rgba(255, 196, 118, 0.92)',
  },
  overcast: {
    id: 'overcast',
    label: 'Overcast Drift',
    subtitle: 'Shifting crosswinds',
    durationSeconds: 28,
    windBase: 26,
    windVariance: 18,
    skyTop: [54, 72, 98],
    skyMid: [96, 118, 144],
    skyHorizon: [158, 178, 196],
    cloudTint: [215, 226, 238, 0.78],
    xpBonus: 1.1,
    speedMultiplier: 1.08,
    rainDensity: 0,
    starAlpha: 0,
    auroraAlpha: 0,
    sunAlpha: 0.25,
    sunColor: 'rgba(220, 232, 245, 0.6)',
  },
  rain: {
    id: 'rain',
    label: 'Sunshower Rain',
    subtitle: 'Rising currents · Frost bubbles appear',
    durationSeconds: 30,
    windBase: -22,
    windVariance: 16,
    skyTop: [28, 54, 86],
    skyMid: [54, 96, 134],
    skyHorizon: [112, 162, 188],
    cloudTint: [176, 198, 218, 0.75],
    xpBonus: 1.2,
    speedMultiplier: 1.12,
    rainDensity: 0.65,
    starAlpha: 0,
    auroraAlpha: 0,
    sunAlpha: 0.2,
    sunColor: 'rgba(210, 235, 255, 0.5)',
  },
  storm: {
    id: 'storm',
    label: 'Thunderstorm',
    subtitle: 'Strong gusts · Chain & Storm hazards',
    durationSeconds: 28,
    windBase: 36,
    windVariance: 28,
    skyTop: [16, 22, 46],
    skyMid: [34, 46, 82],
    skyHorizon: [68, 86, 126],
    cloudTint: [118, 132, 162, 0.8],
    xpBonus: 1.35,
    speedMultiplier: 1.18,
    rainDensity: 1.0,
    starAlpha: 0,
    auroraAlpha: 0,
    sunAlpha: 0,
    sunColor: 'rgba(180, 200, 255, 0.3)',
  },
  night: {
    id: 'night',
    label: 'Starlit Night',
    subtitle: 'Clear starlight · High-contrast glow',
    durationSeconds: 30,
    windBase: 6,
    windVariance: 8,
    skyTop: [7, 11, 28],
    skyMid: [16, 28, 64],
    skyHorizon: [36, 62, 112],
    cloudTint: [145, 168, 216, 0.38],
    xpBonus: 1.25,
    speedMultiplier: 1.12,
    rainDensity: 0,
    starAlpha: 0.95,
    auroraAlpha: 0,
    sunAlpha: 0.7,
    sunColor: 'rgba(232, 242, 255, 0.85)',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora Dawn',
    subtitle: 'Radiant ribbons · +40% XP bonus',
    durationSeconds: 28,
    windBase: -10,
    windVariance: 10,
    skyTop: [10, 20, 44],
    skyMid: [22, 54, 88],
    skyHorizon: [58, 118, 146],
    cloudTint: [168, 218, 228, 0.45],
    xpBonus: 1.4,
    speedMultiplier: 1.15,
    rainDensity: 0,
    starAlpha: 0.75,
    auroraAlpha: 0.9,
    sunAlpha: 0.35,
    sunColor: 'rgba(164, 248, 226, 0.7)',
  },
};

export interface PowerUpMeta {
  id: PowerUpId;
  keyHint: string;
  name: string;
  shortName: string;
  description: string;
  duration: number; // 0 = instant
  cooldown: number;
  maxCharges: number;
  accentColor: string;
}

export const POWERUP_ORDER: PowerUpId[] = [
  'burst',
  'freeze',
  'magnet',
  'score_boost',
  'slow_mo',
  'lightning',
  'shield',
  'xp_boost',
];

export const POWERUP_META: Record<PowerUpId, PowerUpMeta> = {
  burst: {
    id: 'burst',
    keyHint: '1',
    name: 'Bubble Burst',
    shortName: 'Burst',
    description: 'Detonates a pressure wave popping nearby bubbles.',
    duration: 0,
    cooldown: 4,
    maxCharges: 3,
    accentColor: '#38bdf8',
  },
  freeze: {
    id: 'freeze',
    keyHint: '2',
    name: 'Time Freeze',
    shortName: 'Freeze',
    description: 'Halts all bubbles mid-air for 5.5s.',
    duration: 5.5,
    cooldown: 8,
    maxCharges: 3,
    accentColor: '#7dd3fc',
  },
  magnet: {
    id: 'magnet',
    keyHint: '3',
    name: 'Bubble Magnet',
    shortName: 'Magnet',
    description: 'Pulls safe bubbles into a tight center cluster for 6s.',
    duration: 6,
    cooldown: 7,
    maxCharges: 3,
    accentColor: '#c084fc',
  },
  score_boost: {
    id: 'score_boost',
    keyHint: '4',
    name: 'Score Boost',
    shortName: '2x Score',
    description: 'Doubles all points earned for 10s.',
    duration: 10,
    cooldown: 6,
    maxCharges: 3,
    accentColor: '#fbbf24',
  },
  slow_mo: {
    id: 'slow_mo',
    keyHint: '5',
    name: 'Slow Motion',
    shortName: 'Slow-Mo',
    description: 'Slows bubble drift by 60% for 8s.',
    duration: 8,
    cooldown: 6,
    maxCharges: 3,
    accentColor: '#34d399',
  },
  lightning: {
    id: 'lightning',
    keyHint: '6',
    name: 'Lightning Strike',
    shortName: 'Lightning',
    description: 'Clears the entire sky with chain lightning.',
    duration: 0,
    cooldown: 10,
    maxCharges: 2,
    accentColor: '#a78bfa',
  },
  shield: {
    id: 'shield',
    keyHint: '7',
    name: 'Sky Shield',
    shortName: 'Shield',
    description: 'Blocks missed-bubble penalties and storm shocks for 12s.',
    duration: 12,
    cooldown: 8,
    maxCharges: 3,
    accentColor: '#60a5fa',
  },
  xp_boost: {
    id: 'xp_boost',
    keyHint: '8',
    name: 'XP Surge',
    shortName: '2x XP',
    description: 'Doubles all XP earned for 12s.',
    duration: 12,
    cooldown: 6,
    maxCharges: 3,
    accentColor: '#f472b6',
  },
};

export interface LevelInfo {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressRatio: number;
  title: string;
}

const RANK_TITLES = [
  'Cloud Apprentice',
  'Breeze Chaser',
  'Mist Poppers',
  'Thermal Glider',
  'Prism Hunter',
  'Nimbus Ace',
  'Gale Tactician',
  'Tempest Breaker',
  'Aurora Keeper',
  'Sky Sovereign',
];

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  // Smooth progressive curve: L2=150, L3=360, L4=640, L5=1000...
  return Math.round(75 * (level - 1) * level * 0.8 + 75 * (level - 1));
}

export function getLevelFromXp(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (safeXp >= xpRequiredForLevel(level + 1) && level < 99) {
    level++;
  }
  const baseXp = xpRequiredForLevel(level);
  const nextXp = xpRequiredForLevel(level + 1);
  const span = Math.max(1, nextXp - baseXp);
  const progressRatio = Math.min(1, Math.max(0, (safeXp - baseXp) / span));
  const titleIndex = Math.min(RANK_TITLES.length - 1, Math.floor((level - 1) / 2));

  return {
    level,
    currentLevelXp: safeXp - baseXp,
    nextLevelXp: span,
    progressRatio,
    title: RANK_TITLES[titleIndex],
  };
}

export function calculateComboMultiplier(combo: number): number {
  if (combo <= 1) return 1;
  if (combo < 5) return 1.5;
  if (combo < 10) return 2;
  if (combo < 18) return 3;
  if (combo < 28) return 4;
  if (combo < 40) return 5;
  if (combo < 55) return 6;
  if (combo < 75) return 8;
  return 10;
}

export function getComboWindowSeconds(difficultyLevel: number): number {
  // Generous early combo window (2.6s), tightening smoothly to 1.55s at high difficulty
  return Math.max(1.55, 2.6 - (difficultyLevel - 1) * 0.085);
}

export function getBaseBubblePoints(type: BubbleType, size: BubbleSize): number {
  const sizeBase = size === 'small' ? 35 : size === 'medium' ? 25 : 40;
  switch (type) {
    case 'standard':
      return sizeBase;
    case 'swift':
      return 60;
    case 'golden':
      return 150;
    case 'armored':
      return 90;
    case 'chain':
      return 75;
    case 'frost':
      return 65;
    case 'heart':
      return 80;
    case 'powerup':
      return 70;
    case 'storm_hazard':
      return 0;
  }
}

export function getBaseBubbleXp(type: BubbleType, size: BubbleSize): number {
  const sizeXp = size === 'small' ? 7 : size === 'medium' ? 5 : 8;
  switch (type) {
    case 'standard':
      return sizeXp;
    case 'swift':
      return 12;
    case 'golden':
      return 28;
    case 'armored':
      return 18;
    case 'chain':
      return 14;
    case 'frost':
      return 12;
    case 'heart':
      return 15;
    case 'powerup':
      return 14;
    case 'storm_hazard':
      return 0;
  }
}

export function calculatePopReward(params: {
  type: BubbleType;
  size: BubbleSize;
  multiplier: number;
  scoreBoostActive: boolean;
  xpBoostActive: boolean;
  weatherXpBonus: number;
  precisionBonus: boolean;
}): { points: number; xp: number } {
  const basePoints = getBaseBubblePoints(params.type, params.size);
  const baseXp = getBaseBubbleXp(params.type, params.size);

  const precisionMult = params.precisionBonus ? 1.25 : 1;
  const scoreBoostMult = params.scoreBoostActive ? 2 : 1;
  const xpBoostMult = params.xpBoostActive ? 2 : 1;

  const points = Math.round(basePoints * params.multiplier * precisionMult * scoreBoostMult);
  const xp = Math.max(
    1,
    Math.round(baseXp * (1 + (params.multiplier - 1) * 0.25) * params.weatherXpBonus * xpBoostMult)
  );

  return { points, xp };
}

export interface DifficultyParams {
  level: number;
  spawnInterval: number;
  speedScale: number;
  maxBubbles: number;
  hazardChance: number;
  armoredChance: number;
  swiftChance: number;
  specialChance: number;
}

export function getDifficultyParams(elapsedSeconds: number): DifficultyParams {
  // Level rises roughly every 18 seconds, capped smoothly
  const level = Math.min(20, 1 + Math.floor(elapsedSeconds / 18));
  const t = Math.min(1, elapsedSeconds / 240);

  return {
    level,
    spawnInterval: Math.max(0.32, 1.18 - t * 0.82),
    speedScale: 1 + t * 0.85,
    maxBubbles: Math.round(14 + t * 22),
    hazardChance: elapsedSeconds < 20 ? 0 : Math.min(0.14, 0.04 + t * 0.1),
    armoredChance: elapsedSeconds < 12 ? 0 : Math.min(0.16, 0.04 + t * 0.12),
    swiftChance: elapsedSeconds < 6 ? 0.05 : Math.min(0.22, 0.08 + t * 0.14),
    specialChance: Math.min(0.2, 0.1 + t * 0.1),
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [
  {
    id: 'first_pop',
    title: 'First Light',
    description: 'Pop 25 bubbles across any sky.',
    xpReward: 60,
    target: 25,
    metric: 'totalBubblesPopped',
  },
  {
    id: 'bubble_centurion',
    title: 'Sky Sweeper',
    description: 'Pop 250 lifetime bubbles.',
    xpReward: 150,
    target: 250,
    metric: 'totalBubblesPopped',
  },
  {
    id: 'bubble_master',
    title: 'Atmospheric Legend',
    description: 'Pop 1,000 lifetime bubbles.',
    xpReward: 400,
    target: 1000,
    metric: 'totalBubblesPopped',
  },
  {
    id: 'combo_15',
    title: 'Chain Rhythm',
    description: 'Reach a 15-bubble consecutive combo streak.',
    xpReward: 120,
    target: 15,
    metric: 'highestCombo',
  },
  {
    id: 'combo_40',
    title: 'Unbroken Stream',
    description: 'Reach a 40-bubble consecutive combo streak.',
    xpReward: 300,
    target: 40,
    metric: 'highestCombo',
  },
  {
    id: 'multiplier_5x',
    title: 'Prism Resonance',
    description: 'Achieve a 5x score multiplier in a run.',
    xpReward: 180,
    target: 5,
    metric: 'bestMultiplier',
  },
  {
    id: 'score_5k',
    title: 'Cloudburst',
    description: 'Score 5,000 points in a single run.',
    xpReward: 140,
    target: 5000,
    metric: 'highScore',
  },
  {
    id: 'score_25k',
    title: 'Stratosphere High',
    description: 'Score 25,000 points in a single run.',
    xpReward: 380,
    target: 25000,
    metric: 'highScore',
  },
  {
    id: 'power_user',
    title: 'Sky Tactician',
    description: 'Activate 10 power-ups across your runs.',
    xpReward: 150,
    target: 10,
    metric: 'powerUpsActivated',
  },
  {
    id: 'gold_collector',
    title: 'Sunbeam Seeker',
    description: 'Pop 15 Golden bubbles.',
    xpReward: 200,
    target: 15,
    metric: 'goldenBubblesPopped',
  },
  {
    id: 'weather_watcher',
    title: 'All-Weather Pilot',
    description: 'Experience 5 distinct sky weather phases.',
    xpReward: 220,
    target: 5,
    metric: 'weathersSeenCount',
  },
  {
    id: 'level_5',
    title: 'Prism Hunter',
    description: 'Reach Player Level 5.',
    xpReward: 250,
    target: 5,
    metric: 'level',
  },
];

export function getAchievementMetricValue(
  metric: AchievementDef['metric'],
  stats: LifetimeStats
): number {
  switch (metric) {
    case 'totalBubblesPopped':
      return stats.totalBubblesPopped;
    case 'highScore':
      return stats.highScore;
    case 'highestCombo':
      return stats.highestCombo;
    case 'bestMultiplier':
      return stats.bestMultiplier;
    case 'powerUpsActivated':
      return stats.powerUpsActivated;
    case 'gamesPlayed':
      return stats.gamesPlayed;
    case 'goldenBubblesPopped':
      return stats.goldenBubblesPopped;
    case 'weathersSeenCount':
      return stats.weathersSeen.length;
    case 'level':
      return getLevelFromXp(stats.totalXp).level;
  }
}

export function evaluateAchievements(
  stats: LifetimeStats,
  alreadyUnlockedIds: Set<string>
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (alreadyUnlockedIds.has(def.id)) continue;
    const value = getAchievementMetricValue(def.metric, stats);
    if (value >= def.target) {
      newlyUnlocked.push(def);
    }
  }
  return newlyUnlocked;
}
