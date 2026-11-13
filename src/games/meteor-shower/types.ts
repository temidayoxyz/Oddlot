export type MeteorType =
  | 'regular'
  | 'heavy'
  | 'armored'
  | 'splitting'
  | 'explosive'
  | 'cosmic';

export type PowerUpId =
  | 'shield'
  | 'laser'
  | 'time_dilation'
  | 'cosmic_blast'
  | 'gravity_field'
  | 'meteor_magnet'
  | 'repair_pulse'
  | 'solar_flare';

export type CosmicEnvironmentId =
  | 'deep_space'
  | 'solar_system'
  | 'nebula'
  | 'cosmic_storm'
  | 'distant_galaxy';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export interface MeteorEntity {
  id: number;
  type: MeteorType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  hitRadius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  points: number;
  xp: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  hitFlash: number;
  age: number;
  isFragment: boolean;
  seed: number;
  destroyed: boolean;
}

export interface ShockwaveEvent {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface LaserBeamEvent {
  id: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
  life: number;
  maxLife: number;
}

export interface FloatingCallout {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PowerUpSlotState {
  id: PowerUpId;
  unlocked: boolean;
  unlockLevel: number;
  charges: number;
  maxCharges: number;
  activeRemaining: number;
  cooldownRemaining: number;
}

export interface SessionState {
  score: number;
  xpEarned: number;
  planetHp: number;
  maxPlanetHp: number;
  wave: number;
  waveLabel: string;
  wavePhase: 'active' | 'breathing';
  waveRemainingSeconds: number;
  waveBannerTimer: number;
  waveDamageTaken: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  bestMultiplier: number;
  comboTimer: number;
  comboMaxTime: number;
  meteorsDestroyed: number;
  regularDestroyed: number;
  heavyDestroyed: number;
  armoredDestroyed: number;
  splittingDestroyed: number;
  explosiveDestroyed: number;
  cosmicDestroyed: number;
  chainKills: number;
  earlyIntercepts: number;
  powerUpsUsed: number;
  wavesSurvived: number;
  elapsedSeconds: number;
}

export interface LifetimeStats {
  highScore: number;
  totalScore: number;
  totalXp: number;
  totalMeteorsDestroyed: number;
  heavyDestroyed: number;
  armoredDestroyed: number;
  splittingDestroyed: number;
  explosiveDestroyed: number;
  cosmicDestroyed: number;
  highestWave: number;
  highestCombo: number;
  bestMultiplier: number;
  totalPlaySeconds: number;
  gamesPlayed: number;
  powerUpsActivated: number;
  perfectWaves: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  check: (stats: LifetimeStats, session?: SessionState) => boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
  screenShake: boolean;
  selectedEnvironment: CosmicEnvironmentId;
}

export interface SavedActiveSession {
  version: number;
  runId: string;
  savedAt: number;
  environment: CosmicEnvironmentId;
  session: SessionState;
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  meteors: MeteorEntity[];
}

export interface EndOfRunSummary {
  runId: string;
  score: number;
  previousHighScore: number;
  isNewRecord: boolean;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  wavesSurvived: number;
  meteorsDestroyed: number;
  planetHpRemaining: number;
  maxPlanetHp: number;
  maxCombo: number;
  bestMultiplier: number;
  elapsedSeconds: number;
  newlyUnlockedAchievements: AchievementDef[];
}

export interface GameSimulation {
  runId: string;
  phase: GamePhase;
  planetRadius: number;
  spawnRadius: number;
  environment: CosmicEnvironmentId;
  playerLevelAtStart: number;
  nextEntityId: number;
  spawnAccumulator: number;
  laserTickTimer: number;
  magnetPulseTimer: number;
  gravityTarget: { x: number; y: number; z: number } | null;
  shieldRippleTimer: number;
  planetImpactFlash: number;
  trauma: number;
  newRecordAchieved: boolean;
  lastComboMilestone: number;
  session: SessionState;
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  meteors: MeteorEntity[];
  shockwaves: ShockwaveEvent[];
  laserBeams: LaserBeamEvent[];
  callouts: FloatingCallout[];
}
