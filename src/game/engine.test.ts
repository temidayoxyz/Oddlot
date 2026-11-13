import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activatePowerUp,
  createSimulation,
  exportSavedSession,
  hydrateSimulationFromSave,
  popBubbleAt,
  spawnBubble,
  startNewRun,
  stepSimulation,
} from './engine';

test('Game survives first 10 seconds without player input', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  for (let i = 0; i < 220; i++) {
    stepSimulation(sim, 0.05, 0, undefined, () => 0.5);
  }
  assert.equal(sim.phase, 'playing');
  assert.ok(sim.session.stability >= 1);
});

test('Popping a bubble awards points, increments combo, and prevents double-pop', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  sim.bubbles = [];

  const b = spawnBubble(sim, 'standard', () => 0.5);
  b.x = 400;
  b.y = 400;
  sim.bubbles.push(b);

  const hit1 = popBubbleAt(sim, 400, 400, 0);
  const scoreAfterHit1 = sim.session.score;
  const hit2 = popBubbleAt(sim, 400, 400, 0);

  assert.equal(hit1, true);
  assert.equal(hit2, false);
  assert.ok(scoreAfterHit1 > 0);
  assert.equal(sim.session.bubblesPopped, 1);
  assert.equal(sim.session.combo, 1);
});

test('Armored bubble requires two hits to pop', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  sim.bubbles = [];

  const armored = spawnBubble(sim, 'armored', () => 0.5);
  armored.x = 500;
  armored.y = 350;
  sim.bubbles.push(armored);

  assert.equal(armored.hp, 2);
  const firstHit = popBubbleAt(sim, 500, 350, 0);
  assert.equal(firstHit, true);
  assert.equal(armored.popped, false);
  assert.equal(armored.hp, 1);
  assert.equal(sim.session.bubblesPopped, 0);

  const secondHit = popBubbleAt(sim, 500, 350, 0);
  assert.equal(secondHit, true);
  assert.equal(armored.popped, true);
  assert.equal(sim.session.bubblesPopped, 1);
});

test('Storm hazard damages stability unless Shield is active', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  sim.bubbles = [];

  const hazard1 = spawnBubble(sim, 'storm_hazard', () => 0.5);
  hazard1.x = 300;
  hazard1.y = 300;
  sim.bubbles.push(hazard1);

  popBubbleAt(sim, 300, 300, 0);
  assert.equal(sim.session.stability, 4);

  // Activate shield (starts with 1 charge)
  const activated = activatePowerUp(sim, 'shield', 0);
  assert.equal(activated, true);

  const hazard2 = spawnBubble(sim, 'storm_hazard', () => 0.5);
  hazard2.x = 320;
  hazard2.y = 320;
  sim.bubbles.push(hazard2);

  popBubbleAt(sim, 320, 320, 0);
  assert.equal(sim.session.stability, 4);
});

test('Power-ups (Burst, Lightning, Freeze) work as specified', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  sim.bubbles = [];

  for (let i = 0; i < 5; i++) {
    const b = spawnBubble(sim, 'standard', () => 0.5);
    b.x = 600 + i * 20;
    b.y = 400;
    sim.bubbles.push(b);
  }

  // Starter burst charge
  const burstOk = activatePowerUp(sim, 'burst', 0);
  assert.equal(burstOk, true);
  assert.equal(sim.session.bubblesPopped, 5);
  assert.equal(sim.powerUps.burst.charges, 0);

  // Lightning strike clears remaining + neutralizes storm hazards
  sim.powerUps.lightning.charges = 1;
  const safe = spawnBubble(sim, 'golden', () => 0.5);
  safe.x = 200;
  safe.y = 300;
  const hazard = spawnBubble(sim, 'storm_hazard', () => 0.5);
  hazard.x = 700;
  hazard.y = 300;
  sim.bubbles = [safe, hazard];

  const lightningOk = activatePowerUp(sim, 'lightning', 0);
  assert.equal(lightningOk, true);
  assert.equal(safe.popped, true);
  assert.equal(hazard.popped, true);
  assert.equal(sim.session.stability, 5);

  // Freeze stops bubble vertical movement
  sim.powerUps.freeze.charges = 1;
  const frozen = spawnBubble(sim, 'standard', () => 0.5);
  frozen.x = 400;
  frozen.y = 400;
  sim.bubbles = [frozen];
  activatePowerUp(sim, 'freeze', 0);
  stepSimulation(sim, 0.05, 0);
  assert.equal(frozen.y, 400);
});

test('Session export and hydration preserves run state accurately', () => {
  const sim = createSimulation(1280, 800, 0);
  startNewRun(sim, 0, () => 0.5);
  sim.session.score = 1420;
  sim.session.combo = 9;
  sim.session.stability = 3;
  const saved = exportSavedSession(sim);

  const freshSim = createSimulation(1024, 768, 5000);
  hydrateSimulationFromSave(freshSim, saved, 5000);

  assert.equal(freshSim.phase, 'playing');
  assert.equal(freshSim.session.score, 1420);
  assert.equal(freshSim.session.combo, 9);
  assert.equal(freshSim.session.stability, 3);
  assert.equal(freshSim.bubbles.length, saved.bubbles.length);
});
