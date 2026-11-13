import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activatePowerUp,
  createSimulation,
  exportSavedSession,
  hitMeteorById,
  hydrateSimulationFromSave,
  spawnMeteor,
  startNewRun,
  stepSimulation,
} from './engine';

test('Game survives first 5 seconds without player input', () => {
  const sim = createSimulation('deep_space', 1);
  startNewRun(sim, 'deep_space', 1, () => 0.42);
  for (let i = 0; i < 300; i++) {
    stepSimulation(sim, 1 / 60, 0, undefined, () => 0.42);
  }
  assert.equal(sim.phase, 'playing');
  assert.ok(sim.session.planetHp > 0);
});

test('Multi-hit heavy meteor requires multiple hits before destruction', () => {
  const sim = createSimulation('deep_space', 1);
  startNewRun(sim, 'deep_space', 1, () => 0.5);
  sim.meteors = [];
  const heavy = spawnMeteor(sim, 'heavy', () => 0.5);
  heavy.hp = 3;
  heavy.maxHp = 3;
  sim.meteors.push(heavy);

  assert.equal(hitMeteorById(sim, heavy.id), true);
  assert.equal(heavy.destroyed, false);
  assert.equal(heavy.hp, 2);

  hitMeteorById(sim, heavy.id);
  assert.equal(heavy.destroyed, false);
  assert.equal(heavy.hp, 1);

  hitMeteorById(sim, heavy.id);
  assert.equal(heavy.destroyed, true);
  assert.equal(sim.session.heavyDestroyed, 1);
  assert.ok(sim.session.score > 0);
});

test('Splitting meteor creates two fragment meteors when destroyed', () => {
  const sim = createSimulation('deep_space', 1);
  startNewRun(sim, 'deep_space', 1, () => 0.3);
  sim.meteors = [];
  const split = spawnMeteor(sim, 'splitting', () => 0.3);
  sim.meteors.push(split);

  hitMeteorById(sim, split.id, 0, undefined, () => 0.3);
  assert.equal(split.destroyed, true);
  const fragments = sim.meteors.filter((m) => m.isFragment && !m.destroyed);
  assert.equal(fragments.length, 2);
});

test('Explosive meteor triggers chain destruction of nearby meteors', () => {
  const sim = createSimulation('deep_space', 1);
  startNewRun(sim, 'deep_space', 1, () => 0.5);
  sim.meteors = [];
  const bomb = spawnMeteor(sim, 'explosive', () => 0.5);
  bomb.x = 4.0;
  bomb.y = 0;
  bomb.z = 0;
  const neighbor = spawnMeteor(sim, 'regular', () => 0.5);
  neighbor.x = 4.8;
  neighbor.y = 0.5;
  neighbor.z = 0;
  sim.meteors.push(bomb, neighbor);

  hitMeteorById(sim, bomb.id, 0, undefined, () => 0.5);
  assert.equal(bomb.destroyed, true);
  assert.equal(neighbor.destroyed, true);
  assert.equal(sim.session.chainKills, 1);
});

test('Planetary Shield deflects incoming meteor damage without reducing HP', () => {
  const sim = createSimulation('deep_space', 1);
  startNewRun(sim, 'deep_space', 1, () => 0.5);
  sim.meteors = [];
  assert.equal(activatePowerUp(sim, 'shield'), true);
  const m = spawnMeteor(sim, 'heavy', () => 0.5);
  m.x = 2.05;
  m.y = 0;
  m.z = 0;
  sim.meteors.push(m);

  stepSimulation(sim, 0.05);
  assert.equal(sim.session.planetHp, 100);
});

test('Game Over triggers when planet HP reaches 0 and save/hydrate restores state', () => {
  const sim = createSimulation('solar_system', 4);
  startNewRun(sim, 'solar_system', 4, () => 0.5);
  sim.session.score = 1240;
  sim.session.wave = 3;
  const saved = exportSavedSession(sim);

  const restored = createSimulation('deep_space', 1);
  hydrateSimulationFromSave(restored, saved);
  assert.equal(restored.session.score, 1240);
  assert.equal(restored.session.wave, 3);
  assert.equal(restored.environment, 'solar_system');

  restored.meteors = [];
  restored.session.planetHp = 10;
  const fatal = spawnMeteor(restored, 'heavy', () => 0.5);
  fatal.x = 1.9;
  fatal.y = 0;
  fatal.z = 0;
  restored.meteors.push(fatal);

  let ended = false;
  stepSimulation(restored, 0.05, 0, {
    onGameOver: () => {
      ended = true;
    },
  });
  assert.equal(ended, true);
  assert.equal(restored.phase, 'gameover');
  assert.equal(restored.session.planetHp, 0);
});
