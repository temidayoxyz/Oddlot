import {
  calculateComboMultiplier,
  calculateMeteorDestroyReward,
  getWaveParams,
  POWERUP_META,
  POWERUP_ORDER,
} from './progression';
import {
  CosmicEnvironmentId,
  GameSimulation,
  MeteorEntity,
  MeteorType,
  PowerUpId,
  PowerUpSlotState,
  SavedActiveSession,
  SessionState,
} from './types';

export const PLANET_RADIUS = 1.75;
export const SPAWN_RADIUS = 7.4;

export interface EngineCallbacks {
  onMeteorHit?: (info: {
    type: MeteorType;
    destroyed: boolean;
    combo: number;
    isChain: boolean;
  }) => void;
  onMeteorSplit?: () => void;
  onExplosion?: (x: number, y: number, z: number, chainKills: number) => void;
  onPowerUpActivate?: (id: PowerUpId) => void;
  onPlanetImpact?: (shieldBlocked: boolean, newHp: number) => void;
  onWaveChange?: (wave: number, phase: 'active' | 'breathing', label: string, perfectClear: boolean) => void;
  onComboMilestone?: (combo: number) => void;
  onNewRecord?: () => void;
  onGameOver?: () => void;
}

function createInitialPowerUps(playerLevel: number): Record<PowerUpId, PowerUpSlotState> {
  const out = {} as Record<PowerUpId, PowerUpSlotState>;
  for (const id of POWERUP_ORDER) {
    const meta = POWERUP_META[id];
    const unlocked = playerLevel >= meta.unlockLevel;
    out[id] = {
      id,
      unlocked,
      unlockLevel: meta.unlockLevel,
      charges: unlocked ? meta.startingCharges : 0,
      maxCharges: meta.maxCharges,
      activeRemaining: 0,
      cooldownRemaining: 0,
    };
  }
  return out;
}

function createInitialSession(): SessionState {
  const w1 = getWaveParams(1);
  return {
    score: 0,
    xpEarned: 0,
    planetHp: 100,
    maxPlanetHp: 100,
    wave: 1,
    waveLabel: w1.label,
    wavePhase: 'active',
    waveRemainingSeconds: w1.durationSeconds,
    waveBannerTimer: 2.6,
    waveDamageTaken: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    bestMultiplier: 1,
    comboTimer: 0,
    comboMaxTime: 3.4,
    meteorsDestroyed: 0,
    regularDestroyed: 0,
    heavyDestroyed: 0,
    armoredDestroyed: 0,
    splittingDestroyed: 0,
    explosiveDestroyed: 0,
    cosmicDestroyed: 0,
    chainKills: 0,
    earlyIntercepts: 0,
    powerUpsUsed: 0,
    wavesSurvived: 0,
    elapsedSeconds: 0,
  };
}

export function createSimulation(
  environment: CosmicEnvironmentId = 'deep_space',
  playerLevel = 1
): GameSimulation {
  return {
    runId: `ms-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    phase: 'title',
    planetRadius: PLANET_RADIUS,
    spawnRadius: SPAWN_RADIUS,
    environment,
    playerLevelAtStart: playerLevel,
    nextEntityId: 1,
    spawnAccumulator: 0,
    laserTickTimer: 0,
    magnetPulseTimer: 0,
    gravityTarget: null,
    shieldRippleTimer: 0,
    planetImpactFlash: 0,
    trauma: 0,
    newRecordAchieved: false,
    lastComboMilestone: 0,
    session: createInitialSession(),
    powerUps: createInitialPowerUps(playerLevel),
    meteors: [],
    shockwaves: [],
    laserBeams: [],
    callouts: [],
  };
}

export function startNewRun(
  sim: GameSimulation,
  environment: CosmicEnvironmentId,
  playerLevel: number,
  rng: () => number = Math.random
): void {
  sim.runId = `ms-${Date.now()}-${Math.floor(rng() * 100000)}`;
  sim.phase = 'playing';
  sim.environment = environment;
  sim.playerLevelAtStart = playerLevel;
  sim.nextEntityId = 1;
  sim.spawnAccumulator = 0.25;
  sim.laserTickTimer = 0;
  sim.magnetPulseTimer = 0;
  sim.gravityTarget = null;
  sim.shieldRippleTimer = 0;
  sim.planetImpactFlash = 0;
  sim.trauma = 0;
  sim.newRecordAchieved = false;
  sim.lastComboMilestone = 0;
  sim.session = createInitialSession();
  sim.powerUps = createInitialPowerUps(playerLevel);
  sim.meteors = [];
  sim.shockwaves = [];
  sim.laserBeams = [];
  sim.callouts = [];

  // Spawn 2 initial approaching meteors smoothly spaced so action starts right away
  sim.meteors.push(spawnMeteor(sim, 'regular', rng));
  const second = spawnMeteor(sim, 'regular', rng);
  second.x *= 1.12;
  second.y *= 1.12;
  sim.meteors.push(second);
}

function pickMeteorType(wave: number, rng: () => number): MeteorType {
  const params = getWaveParams(wave);
  const entries = Object.entries(params.weights) as Array<[MeteorType, number]>;
  let total = 0;
  for (const [, w] of entries) total += w;
  let roll = rng() * total;
  for (const [type, weight] of entries) {
    if (weight <= 0) continue;
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'regular';
}

export function spawnMeteor(
  sim: GameSimulation,
  forcedType?: MeteorType,
  rng: () => number = Math.random
): MeteorEntity {
  const waveParams = getWaveParams(sim.session.wave);
  const type = forcedType ?? pickMeteorType(sim.session.wave, rng);

  const angle = rng() * Math.PI * 2;
  const radiusScale = 0.94 + rng() * 0.22;
  const dist = sim.spawnRadius * radiusScale;
  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist * 0.86;
  const z = (rng() - 0.5) * 1.4;

  // Target Earth with tiny tangential curve
  const len = Math.hypot(x, y, z) || 1;
  const nx = -x / len;
  const ny = -y / len;
  const nz = -z / len;

  // Tangent perpendicular in XY for slight dynamic arc
  const tx = -ny;
  const ty = nx;
  const curveAmt = (rng() - 0.5) * 0.28;

  let hp = 1;
  let radius = 0.26 + rng() * 0.08;
  let baseSpeed = 0.88 + rng() * 0.34;
  let damage = 12;
  let points = 45;
  let xp = 6;

  switch (type) {
    case 'heavy':
      hp = 3;
      radius = 0.45 + rng() * 0.08;
      baseSpeed = 0.62 + rng() * 0.16;
      damage = 24;
      points = 160;
      xp = 18;
      break;
    case 'armored':
      hp = 4;
      radius = 0.41 + rng() * 0.07;
      baseSpeed = 0.68 + rng() * 0.18;
      damage = 22;
      points = 200;
      xp = 22;
      break;
    case 'splitting':
      hp = 1;
      radius = 0.34 + rng() * 0.06;
      baseSpeed = 0.84 + rng() * 0.22;
      damage = 16;
      points = 95;
      xp = 12;
      break;
    case 'explosive':
      hp = 1;
      radius = 0.33 + rng() * 0.06;
      baseSpeed = 0.86 + rng() * 0.22;
      damage = 22;
      points = 125;
      xp = 16;
      break;
    case 'cosmic':
      hp = 2;
      radius = 0.31 + rng() * 0.05;
      baseSpeed = 1.08 + rng() * 0.24;
      damage = 10;
      points = 260;
      xp = 38;
      break;
    case 'regular':
    default:
      break;
  }

  const speed = baseSpeed * waveParams.speedMultiplier;

  return {
    id: sim.nextEntityId++,
    type,
    x,
    y,
    z,
    vx: (nx + tx * curveAmt) * speed,
    vy: (ny + ty * curveAmt) * speed,
    vz: nz * speed,
    radius,
    hitRadius: radius * 1.48,
    hp,
    maxHp: hp,
    speed,
    damage,
    points,
    xp,
    spinX: (rng() - 0.5) * 2.4,
    spinY: (rng() - 0.5) * 2.4,
    spinZ: (rng() - 0.5) * 2.4,
    rotX: rng() * Math.PI * 2,
    rotY: rng() * Math.PI * 2,
    rotZ: rng() * Math.PI * 2,
    hitFlash: 0,
    age: 0,
    isFragment: false,
    seed: rng(),
    destroyed: false,
  };
}

function addCallout(
  sim: GameSimulation,
  x: number,
  y: number,
  z: number,
  text: string,
  color: string,
  subtext?: string
): void {
  if (sim.callouts.length > 18) {
    sim.callouts.shift();
  }
  let adjustedY = y;
  for (const existing of sim.callouts) {
    if (
      Math.abs(existing.x - x) < 1.1 &&
      Math.abs(existing.y - adjustedY) < 0.55
    ) {
      adjustedY = existing.y + 0.56;
    }
  }
  sim.callouts.push({
    id: sim.nextEntityId++,
    x,
    y: adjustedY,
    z,
    text,
    subtext,
    color,
    life: 0.95,
    maxLife: 0.95,
  });
}

function addShockwave(
  sim: GameSimulation,
  x: number,
  y: number,
  z: number,
  color: string,
  maxRadius: number,
  duration = 0.45
): void {
  if (sim.shockwaves.length > 16) {
    sim.shockwaves.shift();
  }
  sim.shockwaves.push({
    id: sim.nextEntityId++,
    x,
    y,
    z,
    color,
    maxRadius,
    life: duration,
    maxLife: duration,
  });
}

function grantRandomPowerUpCharge(
  sim: GameSimulation,
  rng: () => number = Math.random
): PowerUpId | null {
  const candidates = POWERUP_ORDER.filter((id) => {
    const slot = sim.powerUps[id];
    return slot.unlocked && slot.charges < slot.maxCharges;
  });
  if (candidates.length === 0) return null;
  const picked = candidates[Math.floor(rng() * candidates.length)];
  sim.powerUps[picked].charges += 1;
  return picked;
}

function destroyMeteor(
  sim: GameSimulation,
  meteor: MeteorEntity,
  highScore: number,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random,
  isChain = false
): void {
  if (meteor.destroyed) return;
  meteor.destroyed = true;

  sim.session.combo += 1;
  sim.session.maxCombo = Math.max(sim.session.maxCombo, sim.session.combo);
  sim.session.multiplier = calculateComboMultiplier(sim.session.combo);
  sim.session.bestMultiplier = Math.max(sim.session.bestMultiplier, sim.session.multiplier);
  sim.session.comboTimer = sim.session.comboMaxTime;

  const distFromPlanet = Math.hypot(meteor.x, meteor.y, meteor.z);
  const reward = calculateMeteorDestroyReward({
    basePoints: meteor.points,
    baseXp: meteor.xp,
    multiplier: sim.session.multiplier,
    distanceFromPlanet: distFromPlanet,
    planetRadius: sim.planetRadius,
  });

  sim.session.score += reward.points;
  sim.session.xpEarned += reward.xp;
  sim.session.meteorsDestroyed += 1;
  if (reward.earlyIntercept) sim.session.earlyIntercepts += 1;
  if (isChain) sim.session.chainKills += 1;

  switch (meteor.type) {
    case 'regular':
      sim.session.regularDestroyed += 1;
      break;
    case 'heavy':
      sim.session.heavyDestroyed += 1;
      break;
    case 'armored':
      sim.session.armoredDestroyed += 1;
      break;
    case 'splitting':
      sim.session.splittingDestroyed += 1;
      break;
    case 'explosive':
      sim.session.explosiveDestroyed += 1;
      break;
    case 'cosmic':
      sim.session.cosmicDestroyed += 1;
      break;
  }

  const calloutColor =
    meteor.type === 'cosmic'
      ? '#67E8F9'
      : meteor.type === 'explosive'
        ? '#FB923C'
        : meteor.type === 'heavy' || meteor.type === 'armored'
          ? '#FDE047'
          : '#F8FAFC';

  let subtext: string | undefined;
  if (meteor.type === 'cosmic') {
    const recharged = grantRandomPowerUpCharge(sim, rng);
    subtext = recharged
      ? `+1 ${POWERUP_META[recharged].shortName} · +${reward.xp} XP`
      : `Cosmic Jackpot · +${reward.xp} XP`;
    addShockwave(sim, meteor.x, meteor.y, meteor.z, '#38BDF8', 1.8, 0.5);
  } else if (isChain) {
    subtext = `Chain Kill · x${sim.session.multiplier}`;
  } else if (reward.earlyIntercept && sim.session.multiplier > 1) {
    subtext = `Early Intercept · x${sim.session.multiplier}`;
  } else if (sim.session.multiplier > 1) {
    subtext = `x${sim.session.multiplier}`;
  }

  addCallout(sim, meteor.x, meteor.y, meteor.z, `+${reward.points}`, calloutColor, subtext);
  addShockwave(
    sim,
    meteor.x,
    meteor.y,
    meteor.z,
    meteor.type === 'explosive' ? '#F97316' : meteor.type === 'cosmic' ? '#38BDF8' : '#FDBA74',
    meteor.type === 'explosive' ? 2.85 : meteor.radius * 2.8,
    meteor.type === 'explosive' ? 0.55 : 0.34
  );

  // Combo milestone check every 15 consecutive destructions
  const bucket = Math.floor(sim.session.combo / 15) * 15;
  if (bucket >= 15 && bucket > sim.lastComboMilestone) {
    sim.lastComboMilestone = bucket;
    const bonus = bucket * 30;
    sim.session.score += bonus;
    sim.session.xpEarned += 35;
    const recharged = grantRandomPowerUpCharge(sim, rng);
    addCallout(
      sim,
      0,
      2.6,
      0.5,
      `${bucket}x STREAK!`,
      '#FDE047',
      recharged ? `+${bonus} · +1 ${POWERUP_META[recharged].shortName}` : `+${bonus} pts`
    );
    callbacks?.onComboMilestone?.(bucket);
  }

  callbacks?.onMeteorHit?.({
    type: meteor.type,
    destroyed: true,
    combo: sim.session.combo,
    isChain,
  });

  // Splitting Meteor spawns 2 smaller rapid fragments
  if (meteor.type === 'splitting' && !meteor.isFragment) {
    callbacks?.onMeteorSplit?.();
    const toPlanetX = -meteor.x;
    const toPlanetY = -meteor.y;
    const len = Math.hypot(toPlanetX, toPlanetY) || 1;
    const perpX = -toPlanetY / len;
    const perpY = toPlanetX / len;

    for (const dir of [-1, 1]) {
      const fragSpeed = Math.min(2.2, meteor.speed * 1.16);
      const offsetDist = 0.32;
      const fx = meteor.x + perpX * offsetDist * dir;
      const fy = meteor.y + perpY * offsetDist * dir;
      const fLen = Math.hypot(fx, fy, meteor.z) || 1;
      sim.meteors.push({
        id: sim.nextEntityId++,
        type: 'regular',
        x: fx,
        y: fy,
        z: meteor.z,
        vx: (-fx / fLen) * fragSpeed + perpX * dir * 0.45,
        vy: (-fy / fLen) * fragSpeed + perpY * dir * 0.45,
        vz: (-meteor.z / fLen) * fragSpeed,
        radius: 0.19,
        hitRadius: 0.34,
        hp: 1,
        maxHp: 1,
        speed: fragSpeed,
        damage: 8,
        points: 35,
        xp: 5,
        spinX: (rng() - 0.5) * 3.2,
        spinY: (rng() - 0.5) * 3.2,
        spinZ: (rng() - 0.5) * 3.2,
        rotX: rng() * Math.PI,
        rotY: rng() * Math.PI,
        rotZ: rng() * Math.PI,
        hitFlash: 0.4,
        age: 0,
        isFragment: true,
        seed: rng(),
        destroyed: false,
      });
    }
  }

  // Explosive Meteor triggers chain-reaction blast
  if (meteor.type === 'explosive') {
    const blastRadius = 2.9;
    sim.trauma = Math.min(1, sim.trauma + 0.32);
    let chains = 0;
    const targets = sim.meteors.filter(
      (other) =>
        !other.destroyed &&
        other.id !== meteor.id &&
        Math.hypot(other.x - meteor.x, other.y - meteor.y, other.z - meteor.z) <= blastRadius
    );
    for (const target of targets) {
      target.hp = 1;
      chains++;
      destroyMeteor(sim, target, highScore, callbacks, rng, true);
    }
    callbacks?.onExplosion?.(meteor.x, meteor.y, meteor.z, chains);
  }

  if (!sim.newRecordAchieved && highScore > 0 && sim.session.score > highScore) {
    sim.newRecordAchieved = true;
    addCallout(sim, 0, 2.9, 0.5, 'NEW RECORD!', '#FBBF24');
    callbacks?.onNewRecord?.();
  }
}

export function hitMeteorById(
  sim: GameSimulation,
  meteorId: number,
  highScore = 0,
  callbacks?: EngineCallbacks,
  rng: () => number = Math.random
): boolean {
  if (sim.phase !== 'playing') return false;
  const meteor = sim.meteors.find((m) => m.id === meteorId && !m.destroyed);
  if (!meteor) return false;

  meteor.hp -= 1;
  meteor.hitFlash = 1;

  if (meteor.hp <= 0) {
    destroyMeteor(sim, meteor, highScore, callbacks, rng, false);
    return true;
  }

  // Knockback pulse on armored / heavy hit
  const dist = Math.hypot(meteor.x, meteor.y, meteor.z) || 1;
  meteor.x += (meteor.x / dist) * 0.14;
  meteor.y += (meteor.y / dist) * 0.14;
  sim.trauma = Math.min(1, sim.trauma + 0.08);
  addCallout(sim, meteor.x, meteor.y, meteor.z, `${meteor.hp} HP`, '#CBD5E1');
  callbacks?.onMeteorHit?.({
    type: meteor.type,
    destroyed: false,
    combo: sim.session.combo,
    isChain: false,
  });
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
  const meta = POWERUP_META[id];
  if (!slot || !slot.unlocked || slot.charges <= 0 || slot.cooldownRemaining > 0) {
    return false;
  }

  slot.charges -= 1;
  slot.cooldownRemaining = meta.cooldownSeconds;
  if (meta.durationSeconds > 0) {
    slot.activeRemaining = meta.durationSeconds;
  }
  sim.session.powerUpsUsed += 1;

  switch (id) {
    case 'shield':
      sim.shieldRippleTimer = 0.6;
      addCallout(sim, 0, 2.35, 0.4, 'SHIELD ACTIVE', meta.accentColor);
      break;

    case 'laser':
      sim.laserTickTimer = 0.05;
      addCallout(sim, 0, 2.35, 0.4, 'ORBITAL LASER', meta.accentColor);
      break;

    case 'time_dilation':
      addCallout(sim, 0, 2.35, 0.4, 'TIME DILATION', meta.accentColor);
      break;

    case 'gravity_field':
      sim.gravityTarget = { x: 0, y: 3.1, z: 0 };
      addCallout(sim, 0, 3.2, 0.4, 'GRAVITY SINGULARITY', meta.accentColor);
      break;

    case 'meteor_magnet':
      sim.magnetPulseTimer = 0.1;
      addCallout(sim, 0, 2.35, 0.4, 'METEOR MAGNET', meta.accentColor);
      break;

    case 'cosmic_blast': {
      // Find densest meteor cluster or nearest threat
      let cx = 0;
      let cy = 3.0;
      let cz = 0;
      const alive = sim.meteors.filter((m) => !m.destroyed);
      if (alive.length > 0) {
        let best = alive[0];
        let bestNeighbors = -1;
        for (const m of alive) {
          const count = alive.filter(
            (o) => Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z) <= 3.1
          ).length;
          if (count > bestNeighbors) {
            bestNeighbors = count;
            best = m;
          }
        }
        cx = best.x;
        cy = best.y;
        cz = best.z;
      }
      addShockwave(sim, cx, cy, cz, meta.accentColor, 3.4, 0.6);
      sim.trauma = Math.min(1, sim.trauma + 0.45);
      for (const m of alive) {
        if (Math.hypot(m.x - cx, m.y - cy, m.z - cz) <= 3.3) {
          m.hp = 1;
          destroyMeteor(sim, m, highScore, callbacks, rng, true);
        }
      }
      addCallout(sim, cx, cy, cz, 'COSMIC BLAST', meta.accentColor);
      break;
    }

    case 'repair_pulse': {
      const prev = sim.session.planetHp;
      sim.session.planetHp = Math.min(sim.session.maxPlanetHp, prev + 25);
      const gained = sim.session.planetHp - prev;
      addShockwave(sim, 0, 0, 0, meta.accentColor, 3.2, 0.65);
      addCallout(sim, 0, 2.4, 0.4, `+${gained} INTEGRITY`, meta.accentColor);
      break;
    }

    case 'solar_flare': {
      addShockwave(sim, 0, 0, 0, meta.accentColor, 8.2, 0.85);
      sim.trauma = Math.min(1, sim.trauma + 0.55);
      const alive = sim.meteors.filter((m) => !m.destroyed);
      for (const m of alive) {
        if (m.hp <= 2) {
          m.hp = 1;
          destroyMeteor(sim, m, highScore, callbacks, rng, true);
        } else {
          m.hp -= 2;
          m.hitFlash = 1;
        }
      }
      addCallout(sim, 0, 2.6, 0.4, 'SOLAR FLARE', meta.accentColor);
      break;
    }
  }

  callbacks?.onPowerUpActivate?.(id);
  return true;
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

  // Always decay transient visual effects
  sim.trauma = Math.max(0, sim.trauma - dt * 1.9);
  sim.planetImpactFlash = Math.max(0, sim.planetImpactFlash - dt * 2.8);
  sim.shieldRippleTimer = Math.max(0, sim.shieldRippleTimer - dt);

  for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
    sim.shockwaves[i].life -= dt;
    if (sim.shockwaves[i].life <= 0) sim.shockwaves.splice(i, 1);
  }
  for (let i = sim.laserBeams.length - 1; i >= 0; i--) {
    sim.laserBeams[i].life -= dt;
    if (sim.laserBeams[i].life <= 0) sim.laserBeams.splice(i, 1);
  }
  for (let i = sim.callouts.length - 1; i >= 0; i--) {
    const c = sim.callouts[i];
    c.life -= dt;
    c.y += dt * 0.65;
    if (c.life <= 0) sim.callouts.splice(i, 1);
  }

  if (sim.phase !== 'playing') return;

  sim.session.elapsedSeconds += dt;
  if (sim.session.waveBannerTimer > 0) {
    sim.session.waveBannerTimer = Math.max(0, sim.session.waveBannerTimer - dt);
  }

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
      if (id === 'gravity_field' && slot.activeRemaining <= 0) {
        sim.gravityTarget = null;
      }
    }
    if (slot.cooldownRemaining > 0) {
      slot.cooldownRemaining = Math.max(0, slot.cooldownRemaining - dt);
    }
  }

  // Wave State Machine
  const waveParams = getWaveParams(sim.session.wave);
  sim.session.waveRemainingSeconds -= dt;

  if (sim.session.waveRemainingSeconds <= 0) {
    if (sim.session.wavePhase === 'active') {
      sim.session.wavesSurvived += 1;
      const perfectClear = sim.session.waveDamageTaken === 0;
      if (perfectClear) {
        const cleanBonus = 150 * sim.session.wave;
        sim.session.score += cleanBonus;
        sim.session.xpEarned += 40;
        addCallout(
          sim,
          0,
          2.6,
          0.4,
          `WAVE ${sim.session.wave} CLEAR!`,
          '#34D399',
          `No Damage +${cleanBonus}`
        );
      } else {
        sim.session.xpEarned += 20;
      }
      sim.session.wavePhase = 'breathing';
      sim.session.waveRemainingSeconds = waveParams.breathingSeconds;
      sim.session.waveLabel = 'Atmospheric Calm';
      sim.session.waveBannerTimer = 2.0;
      // Grant a random charge every 2 waves
      if (sim.session.wave % 2 === 0) {
        grantRandomPowerUpCharge(sim, rng);
      }
      callbacks?.onWaveChange?.(sim.session.wave, 'breathing', sim.session.waveLabel, perfectClear);
    } else {
      sim.session.wave += 1;
      const nextParams = getWaveParams(sim.session.wave);
      sim.session.wavePhase = 'active';
      sim.session.waveRemainingSeconds = nextParams.durationSeconds;
      sim.session.waveLabel = nextParams.label;
      sim.session.waveBannerTimer = 2.8;
      sim.session.waveDamageTaken = 0;
      callbacks?.onWaveChange?.(sim.session.wave, 'active', nextParams.label, false);
    }
  }

  // Spawning during active wave
  if (sim.session.wavePhase === 'active') {
    sim.spawnAccumulator += dt;
    if (
      sim.spawnAccumulator >= waveParams.spawnInterval &&
      sim.meteors.length < waveParams.maxActiveMeteors
    ) {
      sim.spawnAccumulator = 0;
      sim.meteors.push(spawnMeteor(sim, undefined, rng));
    }
  }

  const shieldActive = sim.powerUps.shield.activeRemaining > 0;
  const laserActive = sim.powerUps.laser.activeRemaining > 0;
  const timeDilationActive = sim.powerUps.time_dilation.activeRemaining > 0;
  const gravityActive = sim.powerUps.gravity_field.activeRemaining > 0 && sim.gravityTarget !== null;
  const magnetActive = sim.powerUps.meteor_magnet.activeRemaining > 0;

  // Orbital Laser auto-targeting
  if (laserActive) {
    sim.laserTickTimer -= dt;
    if (sim.laserTickTimer <= 0) {
      sim.laserTickTimer = 0.55;
      const alive = sim.meteors.filter((m) => !m.destroyed);
      if (alive.length > 0) {
        // Target closest threat to Earth
        let closest = alive[0];
        let minDist = Math.hypot(closest.x, closest.y, closest.z);
        for (const m of alive) {
          const d = Math.hypot(m.x, m.y, m.z);
          if (d < minDist) {
            minDist = d;
            closest = m;
          }
        }
        const dirLen = Math.hypot(closest.x, closest.y, closest.z) || 1;
        sim.laserBeams.push({
          id: sim.nextEntityId++,
          fromX: (closest.x / dirLen) * (sim.planetRadius + 0.35),
          fromY: (closest.y / dirLen) * (sim.planetRadius + 0.35),
          fromZ: (closest.z / dirLen) * (sim.planetRadius + 0.35) + 0.25,
          toX: closest.x,
          toY: closest.y,
          toZ: closest.z,
          life: 0.22,
          maxLife: 0.22,
        });
        hitMeteorById(sim, closest.id, highScore, callbacks, rng);
      }
    }
  }

  // Meteor Magnet auto-harvest cosmic meteors & slow threats
  if (magnetActive) {
    sim.magnetPulseTimer -= dt;
    if (sim.magnetPulseTimer <= 0) {
      sim.magnetPulseTimer = 0.45;
      const cosmicTarget = sim.meteors.find((m) => !m.destroyed && m.type === 'cosmic');
      if (cosmicTarget) {
        cosmicTarget.hp = 1;
        destroyMeteor(sim, cosmicTarget, highScore, callbacks, rng, false);
      }
    }
  }

  const timeScale = timeDilationActive ? 0.32 : 1;
  const impactLimit = shieldActive ? sim.planetRadius + 0.33 : sim.planetRadius + 0.08;

  // Advance meteors
  for (let i = sim.meteors.length - 1; i >= 0; i--) {
    const m = sim.meteors[i];
    if (m.destroyed) {
      sim.meteors.splice(i, 1);
      continue;
    }

    m.age += dt;
    if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - dt * 5);

    const mDt = dt * timeScale;
    m.rotX += m.spinX * mDt;
    m.rotY += m.spinY * mDt;
    m.rotZ += m.spinZ * mDt;

    // Gentle orbital correction toward Earth so curved paths always threaten Earth
    const dist = Math.hypot(m.x, m.y, m.z) || 1;
    const desiredVx = (-m.x / dist) * m.speed;
    const desiredVy = (-m.y / dist) * m.speed;
    const desiredVz = (-m.z / dist) * m.speed;

    const steerRate = Math.min(1, mDt * 1.15);
    m.vx += (desiredVx - m.vx) * steerRate;
    m.vy += (desiredVy - m.vy) * steerRate;
    m.vz += (desiredVz - m.vz) * steerRate;

    if (gravityActive && sim.gravityTarget) {
      const gx = sim.gravityTarget.x - m.x;
      const gy = sim.gravityTarget.y - m.y;
      const gz = sim.gravityTarget.z - m.z;
      const gDist = Math.hypot(gx, gy, gz) || 1;
      if (gDist > 0.4) {
        const pull = 2.6;
        m.x += (gx / gDist) * pull * dt;
        m.y += (gy / gDist) * pull * dt;
        m.z += (gz / gDist) * pull * dt;
      }
    } else {
      m.x += m.vx * mDt;
      m.y += m.vy * mDt;
      m.z += m.vz * mDt;
    }

    const newDist = Math.hypot(m.x, m.y, m.z);
    if (newDist <= impactLimit + m.radius * 0.5) {
      sim.meteors.splice(i, 1);
      if (shieldActive) {
        sim.shieldRippleTimer = 0.55;
        addShockwave(sim, m.x, m.y, m.z, '#38BDF8', 1.4, 0.35);
        addCallout(sim, m.x, m.y, m.z, 'DEFLECTED', '#38BDF8');
        callbacks?.onPlanetImpact?.(true, sim.session.planetHp);
      } else {
        sim.session.planetHp = Math.max(0, sim.session.planetHp - m.damage);
        sim.session.waveDamageTaken += m.damage;
        sim.session.combo = 0;
        sim.session.multiplier = 1;
        sim.session.comboTimer = 0;
        sim.lastComboMilestone = 0;
        sim.planetImpactFlash = 1;
        sim.trauma = Math.min(1, sim.trauma + 0.45);
        addShockwave(sim, m.x, m.y, m.z, '#EF4444', 1.9, 0.48);
        addCallout(sim, m.x, m.y, m.z, `-${m.damage} HP`, '#FB7185');
        callbacks?.onPlanetImpact?.(false, sim.session.planetHp);

        if (sim.session.planetHp <= 0) {
          sim.phase = 'gameover';
          callbacks?.onGameOver?.();
          return;
        }
      }
    }
  }
}

export function exportSavedSession(sim: GameSimulation): SavedActiveSession {
  return {
    version: 1,
    runId: sim.runId,
    savedAt: Date.now(),
    environment: sim.environment,
    session: { ...sim.session },
    powerUps: structuredClone(sim.powerUps),
    meteors: sim.meteors.filter((m) => !m.destroyed).map((m) => ({ ...m })),
  };
}

export function hydrateSimulationFromSave(
  sim: GameSimulation,
  saved: SavedActiveSession
): void {
  sim.runId = saved.runId;
  sim.environment = saved.environment;
  sim.session = { ...saved.session };
  sim.powerUps = structuredClone(saved.powerUps);
  sim.meteors = saved.meteors.map((m) => ({ ...m }));
  sim.shockwaves = [];
  sim.laserBeams = [];
  sim.callouts = [];
  sim.phase = 'playing';
  const maxId = sim.meteors.reduce((acc, m) => Math.max(acc, m.id), 1);
  sim.nextEntityId = maxId + 1;
}
