import {
  calculateComboMultiplier,
  calculatePopReward,
  getComboWindowSeconds,
  getDifficultyParams,
  POWERUP_META,
  POWERUP_ORDER,
  WEATHER_CONFIGS,
  WEATHER_SEQUENCE,
} from './progression';
import {
  Bubble,
  BubbleSize,
  BubbleType,
  GameSimulation,
  LightningArc,
  Particle,
  PowerUpId,
  PowerUpSlotState,
  SavedActiveSession,
  WeatherId,
} from './types';

export const PARTICLE_POOL_SIZE = 320;

export interface EngineCallbacks {
  onBubblePop?: (info: {
    type: BubbleType;
    size: BubbleSize;
    combo: number;
    multiplier: number;
    points: number;
    xp: number;
    isMilestone: boolean;
    armoredCrackOnly: boolean;
  }) => void;
  onPowerUpCollect?: (id: PowerUpId) => void;
  onPowerUpActivate?: (id: PowerUpId) => void;
  onWeatherChange?: (weather: WeatherId) => void;
  onDamage?: (shieldBlocked: boolean) => void;
  onGameOver?: () => void;
  onNewRecord?: () => void;
}

function createInitialPowerUps(): Record<PowerUpId, PowerUpSlotState> {
  const result = {} as Record<PowerUpId, PowerUpSlotState>;
  for (const id of POWERUP_ORDER) {
    const meta = POWERUP_META[id];
    result[id] = {
      id,
      charges: id === 'burst' || id === 'shield' ? 1 : 0,
      maxCharges: meta.maxCharges,
      activeRemaining: 0,
      duration: meta.duration,
      cooldownRemaining: 0,
      cooldown: meta.cooldown,
    };
  }
  return result;
}

function createParticlePool(): Particle[] {
  const pool: Particle[] = new Array(PARTICLE_POOL_SIZE);
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 2,
      life: 0,
      maxLife: 0.5,
      hue: 195,
      alpha: 1,
      kind: 'droplet',
    };
  }
  return pool;
}

export function createSimulation(
  width: number,
  height: number,
  highScore = 0
): GameSimulation {
  const w = Math.max(320, width);
  const h = Math.max(320, height);
  const sim: GameSimulation = {
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    phase: 'title',
    width: w,
    height: h,
    nextBubbleId: 1,
    nextTextId: 1,
    spawnAccumulator: 0,
    bubbles: [],
    particles: createParticlePool(),
    particleCursor: 0,
    floatingTexts: [],
    lightningArcs: [],
    powerUps: createInitialPowerUps(),
    weather: {
      current: 'clear',
      next: 'golden_hour',
      transitionProgress: 0,
      phaseElapsed: 0,
      phaseDuration: WEATHER_CONFIGS.clear.durationSeconds,
      windX: WEATHER_CONFIGS.clear.windBase,
      windTargetX: WEATHER_CONFIGS.clear.windBase,
      lightningFlash: 0,
    },
    session: {
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
      comboMaxTime: getComboWindowSeconds(1),
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
    },
    hitstopTimer: 0,
    trauma: 0,
    cursorX: w * 0.5,
    cursorY: h * 0.5,
    cursorActive: false,
    lastComboMilestone: 0,
    newRecordAchieved: highScore <= 0,
  };

  // Seed a few calm ambient bubbles for immediate visual life
  for (let i = 0; i < 9; i++) {
    const b = spawnBubble(sim, 'standard', Math.random);
    b.y = h * (0.2 + Math.random() * 0.7);
    sim.bubbles.push(b);
  }
  return sim;
}

export function startNewRun(
  sim: GameSimulation,
  highScore = 0,
  rng: () => number = Math.random
): void {
  sim.runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sim.phase = 'playing';
  sim.bubbles = [];
  sim.floatingTexts = [];
  sim.lightningArcs = [];
  sim.spawnAccumulator = 0.6;
  sim.hitstopTimer = 0;
  sim.trauma = 0;
  sim.lastComboMilestone = 0;
  sim.newRecordAchieved = false;
  sim.powerUps = createInitialPowerUps();
  sim.weather = {
    current: 'clear',
    next: 'golden_hour',
    transitionProgress: 0,
    phaseElapsed: 0,
    phaseDuration: WEATHER_CONFIGS.clear.durationSeconds,
    windX: WEATHER_CONFIGS.clear.windBase,
    windTargetX: WEATHER_CONFIGS.clear.windBase,
    lightningFlash: 0,
  };
  sim.session = {
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
    comboMaxTime: getComboWindowSeconds(1),
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
  };
  for (const p of sim.particles) {
    p.active = false;
  }

  // Spawn 4 welcoming starter bubbles already inside the lower-mid sky
  for (let i = 0; i < 4; i++) {
    const b = spawnBubble(sim, 'standard', rng);
    b.y = sim.height * (0.58 + i * 0.08);
    sim.bubbles.push(b);
  }
  void highScore;
}

export function exportSavedSession(sim: GameSimulation): SavedActiveSession {
  return {
    version: 1,
    savedAt: Date.now(),
    runId: sim.runId,
    session: { ...sim.session, weathersExperienced: [...sim.session.weathersExperienced] },
    weather: { ...sim.weather },
    powerUps: structuredClone(sim.powerUps),
    bubbles: sim.bubbles.map((b) => ({ ...b })),
    nextBubbleId: sim.nextBubbleId,
  };
}

export function hydrateSimulationFromSave(
  sim: GameSimulation,
  saved: SavedActiveSession,
  highScore: number
): void {
  sim.runId = saved.runId;
  sim.phase = 'playing';
  sim.session = {
    ...saved.session,
    weathersExperienced: [...saved.session.weathersExperienced],
  };
  sim.weather = { ...saved.weather };
  sim.powerUps = structuredClone(saved.powerUps);
  sim.bubbles = saved.bubbles.map((b) => ({
    ...b,
    x: Math.min(sim.width - b.radius - 12, Math.max(b.radius + 12, b.x)),
    y: Math.min(sim.height + b.radius, Math.max(-b.radius, b.y)),
  }));
  sim.nextBubbleId = Math.max(saved.nextBubbleId, sim.bubbles.length + 1);
  sim.floatingTexts = [];
  sim.lightningArcs = [];
  sim.hitstopTimer = 0;
  sim.trauma = 0;
  sim.newRecordAchieved = saved.session.score > highScore && highScore > 0;
}

function emitParticle(
  sim: GameSimulation,
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number,
  maxLife: number,
  hue: number,
  kind: Particle['kind']
): void {
  const p = sim.particles[sim.particleCursor];
  sim.particleCursor = (sim.particleCursor + 1) % PARTICLE_POOL_SIZE;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.radius = radius;
  p.life = maxLife;
  p.maxLife = maxLife;
  p.hue = hue;
  p.alpha = 1;
  p.kind = kind;
}

function spawnPopParticles(
  sim: GameSimulation,
  bubble: Bubble,
  count: number,
  rng: () => number = Math.random
): void {
  const baseHue =
    bubble.type === 'golden'
      ? 44
      : bubble.type === 'frost'
        ? 196
        : bubble.type === 'chain'
          ? 272
          : bubble.type === 'heart'
            ? 340
            : bubble.type === 'storm_hazard'
              ? 22
              : (190 + bubble.hueOffset) % 360;

  // Expanding shockwave ring
  emitParticle(sim, bubble.x, bubble.y, 0, 0, bubble.radius, 0.28, baseHue, 'ring');

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (rng() - 0.5) * 0.4;
    const speed = 75 + rng() * 190;
    const hue = (baseHue + (rng() - 0.5) * 70 + 360) % 360;
    emitParticle(
      sim,
      bubble.x + Math.cos(angle) * (bubble.radius * 0.35),
      bubble.y + Math.sin(angle) * (bubble.radius * 0.35),
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 25,
      2 + rng() * 4.5,
      0.32 + rng() * 0.35,
      hue,
      i % 4 === 0 ? 'spark' : 'droplet'
    );
  }
}

export function addFloatingText(
  sim: GameSimulation,
  x: number,
  y: number,
  text: string,
  color: string,
  subtext?: string,
  scale = 1
): void {
  if (sim.floatingTexts.length > 28) {
    sim.floatingTexts.shift();
  }
  sim.floatingTexts.push({
    id: sim.nextTextId++,
    x: Math.max(48, Math.min(sim.width - 48, x)),
    y: Math.max(60, Math.min(sim.height - 60, y)),
    vy: -52,
    text,
    subtext,
    color,
    life: 0.95,
    maxLife: 0.95,
    scale,
  });
}

function chooseBubbleType(sim: GameSimulation, rng: () => number): BubbleType {
  const diff = getDifficultyParams(sim.session.elapsedSeconds);
  const weather = sim.weather.current;
  const r = rng();

  // Hazard chance (higher in overcast/storm)
  const stormHazardBoost = weather === 'storm' ? 0.08 : weather === 'rain' ? 0.03 : 0;
  if (r < diff.hazardChance + stormHazardBoost) {
    return 'storm_hazard';
  }

  // Heart chance if hurt
  if (sim.session.stability < sim.session.maxStability && rng() < 0.06) {
    return 'heart';
  }

  // Power-up orb chance
  if (rng() < 0.075) {
    return 'powerup';
  }

  // Special bubbles
  const specialRoll = rng();
  if (specialRoll < diff.specialChance) {
    const goldenBias = weather === 'golden_hour' ? 0.42 : 0.26;
    const frostBias = weather === 'rain' ? 0.35 : 0.18;
    const chainBias = weather === 'storm' ? 0.42 : 0.24;
    const pick = rng() * (goldenBias + frostBias + chainBias + 0.12);
    if (pick < goldenBias) return 'golden';
    if (pick < goldenBias + frostBias) return 'frost';
    if (pick < goldenBias + frostBias + chainBias) return 'chain';
    return 'heart';
  }

  if (rng() < diff.armoredChance) {
    return 'armored';
  }

  if (rng() < diff.swiftChance) {
    return 'swift';
  }

  return 'standard';
}

function chooseBubbleSize(type: BubbleType, rng: () => number): BubbleSize {
  if (type === 'swift') return 'small';
  if (type === 'armored') return rng() < 0.5 ? 'large' : 'medium';
  if (type === 'powerup' || type === 'heart' || type === 'golden') return 'medium';
  const r = rng();
  if (r < 0.32) return 'small';
  if (r < 0.74) return 'medium';
  return 'large';
}

export function spawnBubble(
  sim: GameSimulation,
  forcedType?: BubbleType,
  rng: () => number = Math.random
): Bubble {
  const type = forcedType ?? chooseBubbleType(sim, rng);
  const size = chooseBubbleSize(type, rng);
  const diff = getDifficultyParams(sim.session.elapsedSeconds);
  const weatherCfg = WEATHER_CONFIGS[sim.weather.current];

  const baseRadius =
    size === 'small'
      ? 20 + rng() * 5
      : size === 'medium'
        ? 30 + rng() * 7
        : 44 + rng() * 10;

  const margin = baseRadius + 24;
  const x = margin + rng() * Math.max(40, sim.width - margin * 2);
  const y = sim.height + baseRadius + 10 + rng() * 24;

  const sizeSpeedFactor = size === 'small' ? 1.28 : size === 'medium' ? 1.0 : 0.78;
  const typeSpeedFactor =
    type === 'swift'
      ? 1.42
      : type === 'armored'
        ? 0.78
        : type === 'golden'
          ? 1.15
          : 1.0;

  const vy =
    -(54 + rng() * 26) *
    sizeSpeedFactor *
    typeSpeedFactor *
    diff.speedScale *
    weatherCfg.speedMultiplier;

  const powerUpReward =
    type === 'powerup'
      ? POWERUP_ORDER[Math.floor(rng() * POWERUP_ORDER.length)]
      : undefined;

  return {
    id: sim.nextBubbleId++,
    type,
    size,
    x,
    y,
    vx: (rng() - 0.5) * 18,
    vy,
    radius: baseRadius,
    baseRadius,
    hp: type === 'armored' ? 2 : 1,
    maxHp: type === 'armored' ? 2 : 1,
    wobblePhase: rng() * Math.PI * 2,
    wobbleAmp: type === 'swift' ? 42 : 14 + rng() * 12,
    wobbleFreq: type === 'swift' ? 3.2 : 1.1 + rng() * 0.9,
    hueOffset: Math.floor(rng() * 360),
    age: 0,
    popped: false,
    hitFlash: 0,
    powerUpReward,
  };
}

function advanceWeather(
  sim: GameSimulation,
  dt: number,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): void {
  const w = sim.weather;
  w.phaseElapsed += dt;

  // Smooth transition between weather states over 4 seconds
  if (w.transitionProgress > 0 && w.transitionProgress < 1) {
    w.transitionProgress = Math.min(1, w.transitionProgress + dt / 4);
    if (w.transitionProgress >= 1) {
      w.current = w.next;
      w.transitionProgress = 0;
      const idx = WEATHER_SEQUENCE.indexOf(w.current);
      w.next = WEATHER_SEQUENCE[(idx + 1) % WEATHER_SEQUENCE.length];
      w.phaseDuration = WEATHER_CONFIGS[w.current].durationSeconds;
      if (!sim.session.weathersExperienced.includes(w.current)) {
        sim.session.weathersExperienced.push(w.current);
      }
      callbacks?.onWeatherChange?.(w.current);
    }
  } else if (w.phaseElapsed >= w.phaseDuration) {
    w.phaseElapsed = 0;
    w.transitionProgress = 0.001;
  }

  // Smooth wind gusts
  const cfg = WEATHER_CONFIGS[w.current];
  if (rng() < dt * 0.4) {
    w.windTargetX = cfg.windBase + (rng() - 0.5) * 2 * cfg.windVariance;
  }
  w.windX += (w.windTargetX - w.windX) * Math.min(1, dt * 1.5);

  // Ambient storm lightning flash
  if (w.lightningFlash > 0) {
    w.lightningFlash = Math.max(0, w.lightningFlash - dt * 3.2);
  } else if (w.current === 'storm' && rng() < dt * 0.14) {
    w.lightningFlash = 0.75;
  }
}

export function stepSimulation(
  sim: GameSimulation,
  rawDt: number,
  highScore = 0,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): void {
  const dt = Math.min(Math.max(0, rawDt), 0.05);
  if (dt <= 0) return;

  // Always decay screen trauma & lightning arcs/particles even in hitstop
  sim.trauma = Math.max(0, sim.trauma - dt * 1.8);

  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = sim.particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    if (p.kind === 'ring') {
      p.radius += dt * 145;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt; // subtle gravity on burst droplets
      p.vx *= 1 - dt * 1.8;
    }
    p.alpha = Math.max(0, p.life / p.maxLife);
  }

  for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
    const ft = sim.floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ft.vy *= 1 - dt * 2.2;
    if (ft.life <= 0) {
      sim.floatingTexts.splice(i, 1);
    }
  }

  for (let i = sim.lightningArcs.length - 1; i >= 0; i--) {
    sim.lightningArcs[i].life -= dt;
    if (sim.lightningArcs[i].life <= 0) {
      sim.lightningArcs.splice(i, 1);
    }
  }

  // Title background ambient simulation
  if (sim.phase === 'title') {
    advanceWeather(sim, dt * 0.45, undefined, rng);
    sim.spawnAccumulator += dt;
    if (sim.spawnAccumulator >= 0.85 && sim.bubbles.length < 16) {
      sim.spawnAccumulator = 0;
      const types: BubbleType[] = ['standard', 'standard', 'standard', 'golden', 'swift'];
      const t = types[Math.floor(rng() * types.length)];
      sim.bubbles.push(spawnBubble(sim, t, rng));
    }
    for (let i = sim.bubbles.length - 1; i >= 0; i--) {
      const b = sim.bubbles[i];
      b.age += dt;
      b.wobblePhase += dt * b.wobbleFreq;
      b.x += (b.vx + Math.sin(b.wobblePhase) * b.wobbleAmp + sim.weather.windX * 0.35) * dt;
      b.y += b.vy * 0.68 * dt;
      if (b.x < b.radius + 10) b.x = b.radius + 10;
      if (b.x > sim.width - b.radius - 10) b.x = sim.width - b.radius - 10;
      if (b.y < -b.radius - 20) {
        sim.bubbles.splice(i, 1);
      }
    }
    return;
  }

  if (sim.phase !== 'playing') return;

  // Hitstop pauses gameplay movement momentarily on big bursts
  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    return;
  }

  sim.session.elapsedSeconds += dt;
  const diff = getDifficultyParams(sim.session.elapsedSeconds);
  sim.session.difficultyLevel = diff.level;
  sim.session.comboMaxTime = getComboWindowSeconds(diff.level);

  // Combo decay
  if (sim.session.combo > 0) {
    sim.session.comboTimer -= dt;
    if (sim.session.comboTimer <= 0) {
      sim.session.combo = 0;
      sim.session.multiplier = 1;
      sim.session.comboTimer = 0;
      sim.lastComboMilestone = 0;
    }
  }

  // Power-up timers
  for (const id of POWERUP_ORDER) {
    const slot = sim.powerUps[id];
    if (slot.activeRemaining > 0) {
      slot.activeRemaining = Math.max(0, slot.activeRemaining - dt);
    }
    if (slot.cooldownRemaining > 0) {
      slot.cooldownRemaining = Math.max(0, slot.cooldownRemaining - dt);
    }
  }

  advanceWeather(sim, dt, callbacks, rng);

  const freezeActive = sim.powerUps.freeze.activeRemaining > 0;
  const slowMoActive = sim.powerUps.slow_mo.activeRemaining > 0;
  const magnetActive = sim.powerUps.magnet.activeRemaining > 0;
  const shieldActive = sim.powerUps.shield.activeRemaining > 0;
  const bubbleTimeScale = freezeActive ? 0 : slowMoActive ? 0.4 : 1;

  // Spawn bubbles
  if (!freezeActive) {
    sim.spawnAccumulator += dt;
    if (sim.spawnAccumulator >= diff.spawnInterval && sim.bubbles.length < diff.maxBubbles) {
      sim.spawnAccumulator = 0;
      sim.bubbles.push(spawnBubble(sim, undefined, rng));
    }
  }

  const magnetX = sim.width * 0.5;
  const magnetY = sim.height * 0.48;

  // Move bubbles & check escape
  for (let i = sim.bubbles.length - 1; i >= 0; i--) {
    const b = sim.bubbles[i];
    if (b.popped) {
      sim.bubbles.splice(i, 1);
      continue;
    }

    b.age += dt;
    if (b.hitFlash > 0) {
      b.hitFlash = Math.max(0, b.hitFlash - dt * 5);
    }

    const bDt = dt * bubbleTimeScale;
    if (bDt > 0) {
      b.wobblePhase += bDt * b.wobbleFreq;
      let moveX = b.vx + Math.sin(b.wobblePhase) * b.wobbleAmp + sim.weather.windX * 0.65;
      let moveY = b.vy;

      // Magnet pulls safe bubbles gently toward center cluster
      if (magnetActive && b.type !== 'storm_hazard') {
        const dx = magnetX - b.x;
        const dy = magnetY - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > 28) {
          const pull = Math.min(260, 140 + dist * 0.45);
          moveX += (dx / dist) * pull;
          moveY += (dy / dist) * pull;
        } else {
          moveY *= 0.15;
        }
      }

      b.x += moveX * bDt;
      b.y += moveY * bDt;

      // Keep inside horizontal viewport bounds with gentle bounce
      if (b.x < b.radius + 10) {
        b.x = b.radius + 10;
        b.vx = Math.abs(b.vx) + 12;
      } else if (b.x > sim.width - b.radius - 10) {
        b.x = sim.width - b.radius - 10;
        b.vx = -Math.abs(b.vx) - 12;
      }
    }

    // Escaped top boundary
    if (b.y < -b.radius - 12) {
      sim.bubbles.splice(i, 1);
      const isPenalizedMiss =
        b.type === 'standard' || b.type === 'swift' || b.type === 'armored';
      if (isPenalizedMiss) {
        if (shieldActive) {
          addFloatingText(sim, b.x, 72, 'Shielded', '#60a5fa', 'No penalty', 0.9);
          callbacks?.onDamage?.(true);
        } else {
          sim.session.stability = Math.max(0, sim.session.stability - 1);
          sim.session.combo = 0;
          sim.session.multiplier = 1;
          sim.session.comboTimer = 0;
          sim.trauma = Math.min(1, sim.trauma + 0.35);
          addFloatingText(sim, b.x, 76, 'Escaped -1', '#fb7185', 'Combo broken', 0.95);
          callbacks?.onDamage?.(false);
          if (sim.session.stability <= 0) {
            sim.phase = 'gameover';
            callbacks?.onGameOver?.();
            return;
          }
        }
      }
    }
  }

  // Check new record notification mid-run
  if (!sim.newRecordAchieved && highScore > 0 && sim.session.score > highScore) {
    sim.newRecordAchieved = true;
    addFloatingText(sim, sim.width * 0.5, sim.height * 0.25, 'NEW HIGH SCORE!', '#fbbf24', undefined, 1.3);
    callbacks?.onNewRecord?.();
  }
}

function awardPop(
  sim: GameSimulation,
  bubble: Bubble,
  precisionBonus: boolean,
  highScore: number,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): void {
  if (bubble.popped) return;
  bubble.popped = true;

  sim.session.combo += 1;
  sim.session.maxCombo = Math.max(sim.session.maxCombo, sim.session.combo);
  sim.session.multiplier = calculateComboMultiplier(sim.session.combo);
  sim.session.bestMultiplier = Math.max(sim.session.bestMultiplier, sim.session.multiplier);
  sim.session.comboTimer = sim.session.comboMaxTime;

  const weatherCfg = WEATHER_CONFIGS[sim.weather.current];
  const { points, xp } = calculatePopReward({
    type: bubble.type,
    size: bubble.size,
    multiplier: sim.session.multiplier,
    scoreBoostActive: sim.powerUps.score_boost.activeRemaining > 0,
    xpBoostActive: sim.powerUps.xp_boost.activeRemaining > 0,
    weatherXpBonus: weatherCfg.xpBonus,
    precisionBonus,
  });

  sim.session.score += points;
  sim.session.xpEarned += xp;
  sim.session.bubblesPopped += 1;
  if (bubble.size === 'small') sim.session.smallPopped += 1;
  else if (bubble.size === 'medium') sim.session.mediumPopped += 1;
  else sim.session.largePopped += 1;

  if (precisionBonus) sim.session.precisionPops += 1;
  if (bubble.type === 'golden') sim.session.goldenPopped += 1;
  if (bubble.type === 'armored') sim.session.armoredPopped += 1;

  // Special bubble side-effects
  if (bubble.type === 'heart') {
    if (sim.session.stability < sim.session.maxStability) {
      sim.session.stability += 1;
      addFloatingText(sim, bubble.x, bubble.y - 24, '+1 Stability', '#fb7185', `+${points}`, 1.1);
    } else {
      sim.session.score += 200;
      addFloatingText(sim, bubble.x, bubble.y - 24, `+${points + 200}`, '#fb7185', 'Full Stability!', 1.1);
    }
  } else if (bubble.type === 'frost') {
    // Brief ambient chill on nearby bubbles
    for (const other of sim.bubbles) {
      if (!other.popped && Math.hypot(other.x - bubble.x, other.y - bubble.y) < 180) {
        other.vy *= 0.65;
      }
    }
    addFloatingText(sim, bubble.x, bubble.y - 14, `+${points}`, '#7dd3fc', 'Frost Chill', 1.0);
  } else if (bubble.type === 'powerup' && bubble.powerUpReward) {
    const slot = sim.powerUps[bubble.powerUpReward];
    if (slot.charges < slot.maxCharges) {
      slot.charges += 1;
    } else {
      sim.session.score += 150;
    }
    sim.session.powerUpsCollected += 1;
    const meta = POWERUP_META[bubble.powerUpReward];
    addFloatingText(sim, bubble.x, bubble.y - 16, `+1 ${meta.shortName}`, meta.accentColor, `+${points} pts`, 1.15);
    callbacks?.onPowerUpCollect?.(bubble.powerUpReward);
  } else {
    const color =
      bubble.type === 'golden'
        ? '#fbbf24'
        : bubble.type === 'chain'
          ? '#c084fc'
          : precisionBonus
            ? '#67e8f9'
            : '#f8fafc';
    const sub =
      precisionBonus && sim.session.multiplier > 1
        ? `Bullseye · x${sim.session.multiplier}`
        : sim.session.multiplier > 1
          ? `x${sim.session.multiplier} · +${xp} XP`
          : `+${xp} XP`;
    addFloatingText(sim, bubble.x, bubble.y - 10, `+${points}`, color, sub, bubble.type === 'golden' ? 1.2 : 1.0);
  }

  // Combo milestone bonus every 15 pops
  const milestoneBucket = Math.floor(sim.session.combo / 15) * 15;
  let isMilestone = false;
  if (milestoneBucket >= 15 && milestoneBucket > sim.lastComboMilestone) {
    sim.lastComboMilestone = milestoneBucket;
    isMilestone = true;
    const bonusPts = milestoneBucket * 25;
    sim.session.score += bonusPts;
    sim.session.xpEarned += 35;
    // Reward a random power-up charge
    const candidates = POWERUP_ORDER.filter(
      (id) => sim.powerUps[id].charges < sim.powerUps[id].maxCharges
    );
    if (candidates.length > 0) {
      const rewardId = candidates[Math.floor(rng() * candidates.length)];
      sim.powerUps[rewardId].charges += 1;
      sim.session.powerUpsCollected += 1;
      addFloatingText(
        sim,
        sim.width * 0.5,
        sim.height * 0.28,
        `${milestoneBucket}x STREAK!`,
        '#fde047',
        `+${bonusPts} pts · +1 ${POWERUP_META[rewardId].shortName}`,
        1.35
      );
    } else {
      addFloatingText(
        sim,
        sim.width * 0.5,
        sim.height * 0.28,
        `${milestoneBucket}x STREAK!`,
        '#fde047',
        `+${bonusPts} bonus pts`,
        1.35
      );
    }
  }

  const particleCount = bubble.type === 'golden' || bubble.type === 'chain' ? 20 : 12;
  spawnPopParticles(sim, bubble, particleCount, rng);

  callbacks?.onBubblePop?.({
    type: bubble.type,
    size: bubble.size,
    combo: sim.session.combo,
    multiplier: sim.session.multiplier,
    points,
    xp,
    isMilestone,
    armoredCrackOnly: false,
  });

  // Chain reaction trigger
  if (bubble.type === 'chain') {
    sim.session.chainPops += 1;
    const nearby = sim.bubbles
      .filter((other) => !other.popped && other.type !== 'storm_hazard')
      .map((other) => ({
        other,
        dist: Math.hypot(other.x - bubble.x, other.y - bubble.y),
      }))
      .filter((entry) => entry.dist < 260)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    for (const entry of nearby) {
      sim.lightningArcs.push({
        points: buildLightningPoints(bubble.x, bubble.y, entry.other.x, entry.other.y, rng),
        life: 0.28,
        maxLife: 0.28,
        color: '#c084fc',
      });
      entry.other.hp = 1;
      awardPop(sim, entry.other, false, highScore, callbacks, rng);
    }
  }

  if (!sim.newRecordAchieved && highScore > 0 && sim.session.score > highScore) {
    sim.newRecordAchieved = true;
    addFloatingText(sim, sim.width * 0.5, sim.height * 0.2, 'NEW RECORD!', '#fbbf24', undefined, 1.3);
    callbacks?.onNewRecord?.();
  }
}

function buildLightningPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: () => number = Math.random
): Array<{ x: number; y: number }> {
  const pts = [{ x: x1, y: y1 }];
  const segments = 5;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = 22;
    pts.push({
      x: x1 + (x2 - x1) * t + (rng() - 0.5) * jitter,
      y: y1 + (y2 - y1) * t + (rng() - 0.5) * jitter,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

export function popBubbleAt(
  sim: GameSimulation,
  x: number,
  y: number,
  highScore = 0,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): boolean {
  if (sim.phase !== 'playing') return false;

  // Iterate reverse (topmost rendered bubble first), with +10px forgiving touch halo
  let bestTarget: Bubble | null = null;
  let bestDist = Infinity;

  for (let i = sim.bubbles.length - 1; i >= 0; i--) {
    const b = sim.bubbles[i];
    if (b.popped) continue;
    const dist = Math.hypot(x - b.x, y - b.y);
    const hitRadius = b.radius + 10;
    if (dist <= hitRadius) {
      // Prefer safe bubbles over storm hazard if overlapping, or smallest/closest
      if (
        !bestTarget ||
        (bestTarget.type === 'storm_hazard' && b.type !== 'storm_hazard') ||
        (b.type !== 'storm_hazard' && dist < bestDist)
      ) {
        bestTarget = b;
        bestDist = dist;
      }
    }
  }

  if (!bestTarget) return false;

  if (bestTarget.type === 'storm_hazard') {
    bestTarget.popped = true;
    spawnPopParticles(sim, bestTarget, 18, rng);
    const shieldActive = sim.powerUps.shield.activeRemaining > 0;
    if (shieldActive) {
      addFloatingText(sim, bestTarget.x, bestTarget.y, 'Hazard Blocked', '#60a5fa', 'Shield active', 1.1);
      callbacks?.onDamage?.(true);
    } else {
      sim.session.stability = Math.max(0, sim.session.stability - 1);
      sim.session.combo = 0;
      sim.session.multiplier = 1;
      sim.session.comboTimer = 0;
      sim.trauma = Math.min(1, sim.trauma + 0.55);
      sim.hitstopTimer = 0.045;
      addFloatingText(sim, bestTarget.x, bestTarget.y, 'STORM SHOCK -1', '#f97316', 'Combo reset', 1.15);
      callbacks?.onDamage?.(false);
      if (sim.session.stability <= 0) {
        sim.phase = 'gameover';
        callbacks?.onGameOver?.();
      }
    }
    return true;
  }

  // Armored bubbles take 2 hits
  if (bestTarget.hp > 1) {
    bestTarget.hp -= 1;
    bestTarget.hitFlash = 1;
    bestTarget.vy *= 0.85;
    emitParticle(sim, bestTarget.x, bestTarget.y, 0, 0, bestTarget.radius, 0.22, 220, 'ring');
    addFloatingText(sim, bestTarget.x, bestTarget.y - 12, 'CRACKED!', '#a5b4fc', 'Hit again', 0.95);
    callbacks?.onBubblePop?.({
      type: bestTarget.type,
      size: bestTarget.size,
      combo: sim.session.combo,
      multiplier: sim.session.multiplier,
      points: 0,
      xp: 0,
      isMilestone: false,
      armoredCrackOnly: true,
    });
    return true;
  }

  const precisionBonus = bestDist <= bestTarget.radius * 0.42;
  awardPop(sim, bestTarget, precisionBonus, highScore, callbacks, rng);
  return true;
}

export function activatePowerUp(
  sim: GameSimulation,
  id: PowerUpId,
  highScore = 0,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): boolean {
  if (sim.phase !== 'playing') return false;
  const slot = sim.powerUps[id];
  if (!slot || slot.charges <= 0 || slot.cooldownRemaining > 0) {
    return false;
  }

  slot.charges -= 1;
  slot.cooldownRemaining = slot.cooldown;
  if (slot.duration > 0) {
    slot.activeRemaining = slot.duration;
  }
  sim.session.powerUpsActivated += 1;
  callbacks?.onPowerUpActivate?.(id);

  const meta = POWERUP_META[id];

  switch (id) {
    case 'burst': {
      // Pop up to 8 safe bubbles nearest to screen center (or cursor if active)
      const cx = sim.cursorActive ? sim.cursorX : sim.width * 0.5;
      const cy = sim.cursorActive ? sim.cursorY : sim.height * 0.5;
      emitParticle(sim, cx, cy, 0, 0, 40, 0.38, 198, 'ring');
      const targets = sim.bubbles
        .filter((b) => !b.popped && b.type !== 'storm_hazard')
        .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
        .slice(0, 8);
      for (const b of targets) {
        b.hp = 1;
        awardPop(sim, b, false, highScore, callbacks, rng);
      }
      sim.trauma = Math.min(1, sim.trauma + 0.35);
      sim.hitstopTimer = 0.04;
      addFloatingText(sim, cx, cy - 28, 'BUBBLE BURST!', meta.accentColor, `${targets.length} popped`, 1.25);
      break;
    }
    case 'lightning': {
      // Screen-wide clear of all safe bubbles + safely vaporize hazards!
      sim.weather.lightningFlash = 0.85;
      sim.trauma = Math.min(1, sim.trauma + 0.5);
      sim.hitstopTimer = 0.055;
      const originX = sim.width * 0.5;
      const originY = 40;
      let cleared = 0;
      for (const b of sim.bubbles) {
        if (b.popped) continue;
        const arc: LightningArc = {
          points: buildLightningPoints(originX, originY, b.x, b.y, rng),
          life: 0.35,
          maxLife: 0.35,
          color: '#a78bfa',
        };
        sim.lightningArcs.push(arc);
        if (b.type === 'storm_hazard') {
          b.popped = true;
          spawnPopParticles(sim, b, 10, rng);
        } else {
          b.hp = 1;
          awardPop(sim, b, false, highScore, callbacks, rng);
          cleared++;
        }
      }
      addFloatingText(
        sim,
        sim.width * 0.5,
        sim.height * 0.32,
        'LIGHTNING STRIKE!',
        '#c4b5fd',
        `${cleared} bubbles cleared`,
        1.35
      );
      break;
    }
    default: {
      addFloatingText(
        sim,
        sim.width * 0.5,
        sim.height * 0.72,
        meta.name.toUpperCase(),
        meta.accentColor,
        `${slot.duration}s active`,
        1.2
      );
      break;
    }
  }

  return true;
}
