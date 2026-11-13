import {
  AchievementDef,
  CosmicEnvironmentId,
  LifetimeStats,
  MeteorType,
  PowerUpId,
  SessionState,
} from './types';

export interface LevelProgress {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressRatio: number;
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(120 * (level - 1) + 45 * Math.pow(level - 1, 1.55));
}

const RANK_TITLES = [
  'Orbital Cadet',
  'Horizon Watcher',
  'Shield Technician',
  'Comet Interceptor',
  'Atmosphere Guardian',
  'Solar Tactician',
  'Starlight Defender',
  'Planetary Sentinel',
  'Cosmic Vanguard',
  'Earth Warden',
];

export function getLevelFromXp(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= safeXp && level < 99) {
    level++;
  }
  const currentThreshold = xpRequiredForLevel(level);
  const nextThreshold = xpRequiredForLevel(level + 1);
  const span = Math.max(1, nextThreshold - currentThreshold);
  const currentLevelXp = safeXp - currentThreshold;
  const titleIdx = Math.min(RANK_TITLES.length - 1, Math.floor((level - 1) / 2));

  return {
    level,
    title: RANK_TITLES[titleIdx],
    currentLevelXp,
    nextLevelXp: span,
    progressRatio: Math.min(1, Math.max(0, currentLevelXp / span)),
  };
}

export interface PowerUpMeta {
  id: PowerUpId;
  name: string;
  shortName: string;
  hotkey: string;
  description: string;
  unlockLevel: number;
  durationSeconds: number;
  cooldownSeconds: number;
  startingCharges: number;
  maxCharges: number;
  accentColor: string;
}

export const POWERUP_ORDER: PowerUpId[] = [
  'shield',
  'laser',
  'time_dilation',
  'cosmic_blast',
  'gravity_field',
  'meteor_magnet',
  'repair_pulse',
  'solar_flare',
];

export const POWERUP_META: Record<PowerUpId, PowerUpMeta> = {
  shield: {
    id: 'shield',
    name: 'Planetary Shield',
    shortName: 'Shield',
    hotkey: '1',
    description: 'Surrounds Earth in a spherical energy barrier that blocks impacts.',
    unlockLevel: 1,
    durationSeconds: 10,
    cooldownSeconds: 16,
    startingCharges: 2,
    maxCharges: 3,
    accentColor: '#38BDF8',
  },
  laser: {
    id: 'laser',
    name: 'Orbital Laser',
    shortName: 'Laser',
    hotkey: '2',
    description: 'Automatically targets and strikes incoming meteors from orbit.',
    unlockLevel: 1,
    durationSeconds: 8,
    cooldownSeconds: 18,
    startingCharges: 1,
    maxCharges: 3,
    accentColor: '#F43F5E',
  },
  time_dilation: {
    id: 'time_dilation',
    name: 'Time Dilation',
    shortName: 'Slow',
    hotkey: '3',
    description: 'Warps local spacetime, slowing all incoming meteors to 32%.',
    unlockLevel: 1,
    durationSeconds: 8,
    cooldownSeconds: 16,
    startingCharges: 1,
    maxCharges: 3,
    accentColor: '#A78BFA',
  },
  cosmic_blast: {
    id: 'cosmic_blast',
    name: 'Cosmic Blast',
    shortName: 'Blast',
    hotkey: '4',
    description: 'Detonates an area shockwave at the densest meteor cluster.',
    unlockLevel: 1,
    durationSeconds: 0,
    cooldownSeconds: 12,
    startingCharges: 2,
    maxCharges: 4,
    accentColor: '#FB923C',
  },
  gravity_field: {
    id: 'gravity_field',
    name: 'Gravity Field',
    shortName: 'Gravity',
    hotkey: '5',
    description: 'Pulls incoming meteors toward a central orbital singularity.',
    unlockLevel: 2,
    durationSeconds: 7,
    cooldownSeconds: 18,
    startingCharges: 1,
    maxCharges: 3,
    accentColor: '#818CF8',
  },
  meteor_magnet: {
    id: 'meteor_magnet',
    name: 'Meteor Magnet',
    shortName: 'Magnet',
    hotkey: '6',
    description: 'Draws cosmic energy & auto-harvests rare cosmic meteors for bonus XP.',
    unlockLevel: 2,
    durationSeconds: 9,
    cooldownSeconds: 18,
    startingCharges: 1,
    maxCharges: 3,
    accentColor: '#2DD4BF',
  },
  repair_pulse: {
    id: 'repair_pulse',
    name: 'Repair Pulse',
    shortName: 'Repair',
    hotkey: '7',
    description: 'Restores +25 Planetary Health and stabilizes the atmosphere.',
    unlockLevel: 3,
    durationSeconds: 0,
    cooldownSeconds: 22,
    startingCharges: 1,
    maxCharges: 3,
    accentColor: '#34D399',
  },
  solar_flare: {
    id: 'solar_flare',
    name: 'Solar Flare',
    shortName: 'Flare',
    hotkey: '8',
    description: 'Sweeps a coronal wave across orbit, vaporizing smaller threats.',
    unlockLevel: 4,
    durationSeconds: 0,
    cooldownSeconds: 26,
    startingCharges: 1,
    maxCharges: 2,
    accentColor: '#FBBF24',
  },
};

export interface CosmicEnvironmentMeta {
  id: CosmicEnvironmentId;
  name: string;
  subtitle: string;
  unlockLevel: number;
  skyTop: string;
  skyBottom: string;
  nebulaPrimary: string;
  nebulaSecondary: string;
  sunColor: string;
  sunIntensity: number;
  rimTint: string;
}

export const COSMIC_ENVIRONMENT_ORDER: CosmicEnvironmentId[] = [
  'deep_space',
  'solar_system',
  'nebula',
  'cosmic_storm',
  'distant_galaxy',
];

export const COSMIC_ENVIRONMENTS: Record<CosmicEnvironmentId, CosmicEnvironmentMeta> = {
  deep_space: {
    id: 'deep_space',
    name: 'Deep Space',
    subtitle: 'Crisp starlight and cold orbital silence.',
    unlockLevel: 1,
    skyTop: '#03060E',
    skyBottom: '#081022',
    nebulaPrimary: '#1D4ED8',
    nebulaSecondary: '#0EA5E9',
    sunColor: '#FFF7E8',
    sunIntensity: 2.65,
    rimTint: '#4DA6FF',
  },
  solar_system: {
    id: 'solar_system',
    name: 'Solar System',
    subtitle: 'Warm coronal sunlight across inner orbit.',
    unlockLevel: 1,
    skyTop: '#09060E',
    skyBottom: '#1B111C',
    nebulaPrimary: '#D97706',
    nebulaSecondary: '#EA580C',
    sunColor: '#FFE5B4',
    sunIntensity: 2.95,
    rimTint: '#60B6FF',
  },
  nebula: {
    id: 'nebula',
    name: 'Carina Nebula',
    subtitle: 'Luminous cyan and rose ionized dust clouds.',
    unlockLevel: 2,
    skyTop: '#080716',
    skyBottom: '#161130',
    nebulaPrimary: '#0891B2',
    nebulaSecondary: '#DB2777',
    sunColor: '#F8FAFC',
    sunIntensity: 2.6,
    rimTint: '#38BDF8',
  },
  cosmic_storm: {
    id: 'cosmic_storm',
    name: 'Cosmic Storm',
    subtitle: 'Charged magnetosphere gusts and electric aurora.',
    unlockLevel: 3,
    skyTop: '#050914',
    skyBottom: '#0F1C2E',
    nebulaPrimary: '#6366F1',
    nebulaSecondary: '#14B8A6',
    sunColor: '#E0F2FE',
    sunIntensity: 2.75,
    rimTint: '#22D3EE',
  },
  distant_galaxy: {
    id: 'distant_galaxy',
    name: 'Distant Galaxy',
    subtitle: 'Spiral galactic core suspended behind Earth.',
    unlockLevel: 5,
    skyTop: '#06040F',
    skyBottom: '#170E28',
    nebulaPrimary: '#9333EA',
    nebulaSecondary: '#F59E0B',
    sunColor: '#FEF3C7',
    sunIntensity: 2.85,
    rimTint: '#7DD3FC',
  },
};

export interface WaveParams {
  wave: number;
  label: string;
  durationSeconds: number;
  breathingSeconds: number;
  spawnInterval: number;
  maxActiveMeteors: number;
  speedMultiplier: number;
  weights: Record<MeteorType, number>;
}

const WAVE_TITLES = [
  'Meteor Activity Detected',
  'Orbital Debris Swell',
  'Incoming Asteroid Cluster',
  'Heavy Impact Warning',
  'Fracture Field Alert',
  'Volatile Detonation Zone',
  'Extreme Meteor Shower',
  'Cosmic Threat Approaching',
];

export function getWaveParams(wave: number): WaveParams {
  const w = Math.max(1, Math.floor(wave));
  const titleIdx = Math.min(WAVE_TITLES.length - 1, w - 1);
  const label =
    w <= WAVE_TITLES.length
      ? WAVE_TITLES[titleIdx]
      : w % 4 === 0
        ? 'Extreme Meteor Shower'
        : w % 3 === 0
          ? 'Cosmic Threat Approaching'
          : 'Heavy Impact Warning';

  const spawnInterval = Math.max(0.46, 1.48 - (w - 1) * 0.11);
  const maxActiveMeteors = Math.min(26, 7 + w * 2);
  const speedMultiplier = Math.min(2.15, 0.92 + (w - 1) * 0.11);

  const weights: Record<MeteorType, number> = {
    regular: Math.max(28, 78 - w * 5),
    heavy: w >= 2 ? Math.min(24, 6 + (w - 1) * 3) : 0,
    armored: w >= 3 ? Math.min(18, 4 + (w - 2) * 2.5) : 0,
    splitting: w >= 3 ? Math.min(18, 5 + (w - 2) * 2.5) : 0,
    explosive: w >= 4 ? Math.min(14, 4 + (w - 3) * 2) : 0,
    cosmic: w >= 2 ? 7 : 4,
  };

  return {
    wave: w,
    label,
    durationSeconds: Math.min(34, 18 + w * 1.5),
    breathingSeconds: w % 3 === 0 ? 4.5 : 3.0,
    spawnInterval,
    maxActiveMeteors,
    speedMultiplier,
    weights,
  };
}

export function calculateComboMultiplier(combo: number): number {
  if (combo >= 35) return 10;
  if (combo >= 25) return 7;
  if (combo >= 18) return 5;
  if (combo >= 12) return 4;
  if (combo >= 7) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function calculateMeteorDestroyReward(params: {
  basePoints: number;
  baseXp: number;
  multiplier: number;
  distanceFromPlanet: number;
  planetRadius: number;
}): { points: number; xp: number; earlyIntercept: boolean } {
  const clearance = params.distanceFromPlanet - params.planetRadius;
  const earlyIntercept = clearance >= 3.2;
  const earlyBonus = earlyIntercept ? 1.25 : 1.0;

  return {
    points: Math.round(params.basePoints * params.multiplier * earlyBonus),
    xp: Math.max(1, Math.round(params.baseXp * (1 + (params.multiplier - 1) * 0.15))),
    earlyIntercept,
  };
}

export const METEOR_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_intercept',
    title: 'First Line of Defense',
    description: 'Destroy 25 incoming meteors across your runs.',
    xpReward: 60,
    check: (s) => s.totalMeteorsDestroyed >= 25,
  },
  {
    id: 'sky_watcher_250',
    title: 'Orbital Sentry',
    description: 'Destroy 250 total meteors.',
    xpReward: 140,
    check: (s) => s.totalMeteorsDestroyed >= 250,
  },
  {
    id: 'heavy_breaker',
    title: 'Asteroid Cracker',
    description: 'Shatter 15 Heavy or Armoured meteors.',
    xpReward: 110,
    check: (s) => s.heavyDestroyed + s.armoredDestroyed >= 15,
  },
  {
    id: 'chain_reaction',
    title: 'Volatile Domino',
    description: 'Destroy 10 Splitting or Explosive meteors.',
    xpReward: 110,
    check: (s) => s.splittingDestroyed + s.explosiveDestroyed >= 10,
  },
  {
    id: 'cosmic_hunter',
    title: 'Cosmic Collector',
    description: 'Intercept 5 Rare Cosmic meteors.',
    xpReward: 120,
    check: (s) => s.cosmicDestroyed >= 5,
  },
  {
    id: 'wave_survivor_5',
    title: 'Atmosphere Intact',
    description: 'Reach Wave 5 in a single run.',
    xpReward: 130,
    check: (s) => s.highestWave >= 5,
  },
  {
    id: 'wave_survivor_10',
    title: 'Iron Magnetosphere',
    description: 'Reach Wave 10 in a single run.',
    xpReward: 240,
    check: (s) => s.highestWave >= 10,
  },
  {
    id: 'clean_wave',
    title: 'Unblemished Horizon',
    description: 'Complete a wave without Earth taking damage.',
    xpReward: 95,
    check: (s) => s.perfectWaves >= 1,
  },
  {
    id: 'combo_15',
    title: 'Precision Rhythm',
    description: 'Reach a 15x consecutive meteor streak.',
    xpReward: 100,
    check: (s) => s.highestCombo >= 15,
  },
  {
    id: 'score_10k',
    title: 'Planetary Ace',
    description: 'Score 10,000 points in a single game.',
    xpReward: 175,
    check: (s) => s.highScore >= 10000,
  },
  {
    id: 'power_commander',
    title: 'Orbital Tactician',
    description: 'Activate planetary abilities 15 times.',
    xpReward: 100,
    check: (s) => s.powerUpsActivated >= 15,
  },
  {
    id: 'veteran_5',
    title: 'Earth Warden',
    description: 'Complete 5 defense runs.',
    xpReward: 120,
    check: (s) => s.gamesPlayed >= 5,
  },
];

export function evaluateMeteorAchievements(
  stats: LifetimeStats,
  alreadyUnlocked: Set<string>,
  session?: SessionState
): AchievementDef[] {
  return METEOR_ACHIEVEMENTS.filter(
    (def) => !alreadyUnlocked.has(def.id) && def.check(stats, session)
  );
}
