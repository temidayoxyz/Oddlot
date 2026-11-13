export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type BubbleSize = 'small' | 'medium' | 'large';

export type BubbleType =
  | 'standard'
  | 'swift'
  | 'golden'
  | 'armored'
  | 'chain'
  | 'frost'
  | 'heart'
  | 'storm_hazard'
  | 'powerup';

export type PowerUpId =
  | 'burst'
  | 'freeze'
  | 'magnet'
  | 'score_boost'
  | 'slow_mo'
  | 'lightning'
  | 'shield'
  | 'xp_boost';

export type WeatherId =
  | 'clear'
  | 'golden_hour'
  | 'overcast'
  | 'rain'
  | 'storm'
  | 'night'
  | 'aurora';

export interface Bubble {
  id: number;
  type: BubbleType;
  size: BubbleSize;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  hp: number;
  maxHp: number;
  wobblePhase: number;
  wobbleAmp: number;
  wobbleFreq: number;
  hueOffset: number;
  age: number;
  popped: boolean;
  hitFlash: number;
  powerUpReward?: PowerUpId;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  hue: number;
  alpha: number;
  kind: 'droplet' | 'ring' | 'spark' | 'confetti';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface LightningArc {
  points: Array<{ x: number; y: number }>;
  life: number;
  maxLife: number;
  color: string;
}

export interface PowerUpSlotState {
  id: PowerUpId;
  charges: number;
  maxCharges: number;
  activeRemaining: number;
  duration: number;
  cooldownRemaining: number;
  cooldown: number;
}

export interface WeatherState {
  current: WeatherId;
  next: WeatherId;
  transitionProgress: number; // 0..1
  phaseElapsed: number;
  phaseDuration: number;
  windX: number;
  windTargetX: number;
  lightningFlash: number;
}

export interface SessionCounters {
  score: number;
  xpEarned: number;
  bubblesPopped: number;
  smallPopped: number;
  mediumPopped: number;
  largePopped: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  bestMultiplier: number;
  comboTimer: number;
  comboMaxTime: number;
  powerUpsCollected: number;
  powerUpsActivated: number;
  weathersExperienced: WeatherId[];
  elapsedSeconds: number;
  difficultyLevel: number;
  stability: number;
  maxStability: number;
  goldenPopped: number;
  chainPops: number;
  armoredPopped: number;
  precisionPops: number;
}

export interface GameSimulation {
  runId: string;
  phase: GamePhase;
  width: number;
  height: number;
  nextBubbleId: number;
  nextTextId: number;
  spawnAccumulator: number;
  bubbles: Bubble[];
  particles: Particle[];
  particleCursor: number;
  floatingTexts: FloatingText[];
  lightningArcs: LightningArc[];
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  weather: WeatherState;
  session: SessionCounters;
  hitstopTimer: number;
  trauma: number;
  cursorX: number;
  cursorY: number;
  cursorActive: boolean;
  lastComboMilestone: number;
  newRecordAchieved: boolean;
}

export interface LifetimeStats {
  highScore: number;
  totalScore: number;
  totalXp: number;
  totalBubblesPopped: number;
  smallBubblesPopped: number;
  mediumBubblesPopped: number;
  largeBubblesPopped: number;
  highestCombo: number;
  bestMultiplier: number;
  totalPlaySeconds: number;
  gamesPlayed: number;
  powerUpsCollected: number;
  powerUpsActivated: number;
  goldenBubblesPopped: number;
  chainReactionsTriggered: number;
  weathersSeen: WeatherId[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  metric:
    | 'totalBubblesPopped'
    | 'highScore'
    | 'highestCombo'
    | 'bestMultiplier'
    | 'powerUpsActivated'
    | 'gamesPlayed'
    | 'goldenBubblesPopped'
    | 'weathersSeenCount'
    | 'level';
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number; // 0..1
  sfxVolume: number; // 0..1
  musicVolume: number; // 0..1
  reducedMotion: boolean;
  screenShake: boolean;
  weatherEffectsIntensity: 'full' | 'subtle';
}

export interface SavedActiveSession {
  version: number;
  savedAt: number;
  runId: string;
  session: SessionCounters;
  weather: WeatherState;
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  bubbles: Bubble[];
  nextBubbleId: number;
}

export interface EndOfRunSummary {
  runId: string;
  score: number;
  previousHighScore: number;
  isNewRecord: boolean;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  bubblesPopped: number;
  smallPopped: number;
  mediumPopped: number;
  largePopped: number;
  maxCombo: number;
  bestMultiplier: number;
  elapsedSeconds: number;
  difficultyLevel: number;
  newlyUnlockedAchievements: AchievementDef[];
  completedDailyChallenges: DailyChallengeDef[];
}

export type DailyChallengeMetric =
  | 'session_bubbles'
  | 'session_score'
  | 'session_combo'
  | 'session_seconds'
  | 'daily_powerups'
  | 'daily_golden'
  | 'daily_small'
  | 'daily_chains';

export interface DailyChallengeDef {
  id: string;
  title: string;
  description: string;
  metric: DailyChallengeMetric;
  target: number;
  xpReward: number;
  scope: 'session' | 'daily';
}

export interface DailyChallengeProgress {
  id: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
}

export interface DailyChallengesState {
  dateKey: string;
  challenges: DailyChallengeDef[];
  progressById: Record<string, DailyChallengeProgress>;
}

