import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OddlotGameProps } from '../../platform/games';
import { meteorAudio } from './audio';
import { MeteorHud, MeteorHudSnapshot } from './components/MeteorHud';
import {
  MeteorAchievementsModal,
  MeteorGameOverModal,
  MeteorPauseModal,
  MeteorSettingsModal,
  MeteorStatsModal,
} from './components/MeteorModals';
import { MeteorTitleScreen } from './components/MeteorTitleScreen';
import {
  activatePowerUp,
  createSimulation,
  EngineCallbacks,
  exportSavedSession,
  hitMeteorById,
  hydrateSimulationFromSave,
  startNewRun,
  stepSimulation,
} from './engine';
import { mountPlanetScene, PlanetSceneController } from './planetScene';
import {
  evaluateMeteorAchievements,
  getLevelFromXp,
  METEOR_ACHIEVEMENTS,
  POWERUP_ORDER,
} from './progression';
import {
  clearActiveSession,
  clearAllProgressData,
  DEFAULT_LIFETIME_STATS,
  loadActiveSession,
  loadLifetimeStats,
  loadRecentRuns,
  loadSettings,
  loadUnlockedAchievements,
  recordRunSummary,
  saveActiveSession,
  saveLifetimeStats,
  saveSettings,
  saveUnlockedAchievements,
} from './storage';
import {
  CosmicEnvironmentId,
  EndOfRunSummary,
  GamePhase,
  GameSettings,
  GameSimulation,
  LifetimeStats,
  MeteorType,
  PowerUpId,
  SavedActiveSession,
  SessionState,
  UnlockedAchievement,
} from './types';

type ActiveModal = 'none' | 'stats' | 'achievements' | 'settings';

function getMeteorBurstColor(type: MeteorType): string {
  switch (type) {
    case 'cosmic':
      return '#38BDF8';
    case 'explosive':
      return '#F43F5E';
    case 'armored':
      return '#94A3B8';
    case 'splitting':
      return '#FACC15';
    case 'heavy':
      return '#FB923C';
    case 'regular':
    default:
      return '#FDBA74';
  }
}

export const MeteorShowerGame: React.FC<OddlotGameProps> = ({ onExitToPlatform }) => {
  const sceneMountRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneControllerRef = useRef<PlanetSceneController | null>(null);
  const simRef = useRef<GameSimulation | null>(null);
  const settingsRef = useRef<GameSettings>(loadSettings());
  const reducedMotionRef = useRef<boolean>(settingsRef.current.reducedMotion);
  const screenShakeRef = useRef<boolean>(settingsRef.current.screenShake);
  const lifetimeStatsRef = useRef<LifetimeStats>({ ...DEFAULT_LIFETIME_STATS });
  const unlockedRef = useRef<UnlockedAchievement[]>([]);
  const comboBarRef = useRef<HTMLDivElement | null>(null);
  const lastHudSyncRef = useRef<number>(0);
  const lastHudSignatureRef = useRef<string>('');
  const lastAutosaveRef = useRef<number>(0);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [settings, setSettings] = useState<GameSettings>(() => settingsRef.current);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(DEFAULT_LIFETIME_STATS);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [savedSession, setSavedSession] = useState<SavedActiveSession | null>(null);
  const [recentRuns, setRecentRuns] = useState<EndOfRunSummary[]>([]);
  const [lastSession, setLastSession] = useState<SessionState | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<EndOfRunSummary | null>(null);
  const [hud, setHud] = useState<MeteorHudSnapshot | null>(null);

  const syncBodyState = useCallback((nextPhase: GamePhase) => {
    document.body.dataset.state = nextPhase;
    setPhase(nextPhase);
  }, []);

  const syncHudFromSim = useCallback((sim: GameSimulation) => {
    setHud({
      session: { ...sim.session },
      powerUps: structuredClone(sim.powerUps),
      highScore: lifetimeStatsRef.current.highScore,
    });
  }, []);

  const finalizeRun = useCallback(async (sim: GameSimulation) => {
    const prevStats = lifetimeStatsRef.current;
    const levelBefore = getLevelFromXp(prevStats.totalXp).level;
    const previousHighScore = prevStats.highScore;
    const isNewRecord = sim.session.score > previousHighScore && sim.session.score > 0;

    const updatedStats: LifetimeStats = {
      highScore: Math.max(prevStats.highScore, sim.session.score),
      totalScore: prevStats.totalScore + sim.session.score,
      totalXp: prevStats.totalXp + sim.session.xpEarned,
      totalMeteorsDestroyed: prevStats.totalMeteorsDestroyed + sim.session.meteorsDestroyed,
      heavyDestroyed: prevStats.heavyDestroyed + sim.session.heavyDestroyed,
      armoredDestroyed: prevStats.armoredDestroyed + sim.session.armoredDestroyed,
      splittingDestroyed: prevStats.splittingDestroyed + sim.session.splittingDestroyed,
      explosiveDestroyed: prevStats.explosiveDestroyed + sim.session.explosiveDestroyed,
      cosmicDestroyed: prevStats.cosmicDestroyed + sim.session.cosmicDestroyed,
      highestWave: Math.max(prevStats.highestWave, sim.session.wave),
      highestCombo: Math.max(prevStats.highestCombo, sim.session.maxCombo),
      bestMultiplier: Math.max(prevStats.bestMultiplier, sim.session.bestMultiplier),
      totalPlaySeconds: prevStats.totalPlaySeconds + sim.session.elapsedSeconds,
      gamesPlayed: prevStats.gamesPlayed + 1,
      powerUpsActivated: prevStats.powerUpsActivated + sim.session.powerUpsUsed,
      perfectWaves: prevStats.perfectWaves + (sim.session.wavesSurvived > 0 && sim.session.waveDamageTaken === 0 ? 1 : 0),
    };

    const unlockedIds = new Set(unlockedRef.current.map((u) => u.id));
    const newlyUnlocked = evaluateMeteorAchievements(updatedStats, unlockedIds, sim.session);
    let bonusXp = 0;
    const nowTs = Date.now();
    const newUnlockRecords: UnlockedAchievement[] = newlyUnlocked.map((def) => {
      bonusXp += def.xpReward;
      return { id: def.id, unlockedAt: nowTs };
    });
    updatedStats.totalXp += bonusXp;

    const levelAfter = getLevelFromXp(updatedStats.totalXp).level;
    if (levelAfter > levelBefore) {
      meteorAudio.playFanfare('levelup');
    } else if (newlyUnlocked.length > 0) {
      meteorAudio.playFanfare('achievement');
    } else {
      meteorAudio.playFanfare('gameover');
    }

    const summary: EndOfRunSummary = {
      runId: sim.runId,
      score: sim.session.score,
      previousHighScore,
      isNewRecord,
      xpEarned: sim.session.xpEarned + bonusXp,
      levelBefore,
      levelAfter,
      wavesSurvived: sim.session.wavesSurvived,
      meteorsDestroyed: sim.session.meteorsDestroyed,
      planetHpRemaining: sim.session.planetHp,
      maxPlanetHp: sim.session.maxPlanetHp,
      maxCombo: sim.session.maxCombo,
      bestMultiplier: sim.session.bestMultiplier,
      elapsedSeconds: sim.session.elapsedSeconds,
      newlyUnlockedAchievements: newlyUnlocked,
    };

    lifetimeStatsRef.current = updatedStats;
    unlockedRef.current = [...unlockedRef.current, ...newUnlockRecords];
    setLifetimeStats(updatedStats);
    setUnlockedAchievements(unlockedRef.current);
    setLastSession({ ...sim.session });
    setGameOverSummary(summary);
    setSavedSession(null);

    await Promise.all([
      saveLifetimeStats(updatedStats),
      saveUnlockedAchievements(newUnlockRecords),
      clearActiveSession(),
      recordRunSummary(summary),
    ]);
    const runs = await loadRecentRuns();
    setRecentRuns(runs);
  }, []);

  const callbacksRef = useRef<EngineCallbacks>({});
  callbacksRef.current = {
    onMeteorHit: ({ type, destroyed, combo }) => {
      meteorAudio.playMeteorHit(type, destroyed, combo);
    },
    onMeteorSplit: () => {
      meteorAudio.playSplit();
    },
    onExplosion: (x, y, z) => {
      meteorAudio.playExplosion();
      sceneControllerRef.current?.spawnHitBurst(x, y, z, '#FB923C', 22);
    },
    onPowerUpActivate: (id) => {
      meteorAudio.playPowerUp(id);
      if (id === 'solar_flare') {
        sceneControllerRef.current?.spawnHitBurst(0, 0, 1.5, '#FBBF24', 28);
      } else if (id === 'cosmic_blast') {
        sceneControllerRef.current?.spawnHitBurst(0, 2.2, 0.5, '#FB923C', 20);
      }
      if (simRef.current) {
        void saveActiveSession(exportSavedSession(simRef.current));
      }
    },
    onPlanetImpact: (shieldBlocked) => {
      meteorAudio.playPlanetImpact(shieldBlocked);
      if (!shieldBlocked) {
        sceneControllerRef.current?.spawnHitBurst(0, 0, 1.8, '#EF4444', 18);
      } else {
        sceneControllerRef.current?.spawnHitBurst(0, 0, 2.1, '#38BDF8', 12);
      }
    },
    onWaveChange: (_wave, phaseType, _label, perfectClear) => {
      meteorAudio.playWaveTransition(phaseType, perfectClear);
      if (perfectClear) {
        lifetimeStatsRef.current = {
          ...lifetimeStatsRef.current,
          perfectWaves: lifetimeStatsRef.current.perfectWaves + 1,
        };
        void saveLifetimeStats(lifetimeStatsRef.current);
      }
    },
    onComboMilestone: () => {
      meteorAudio.playComboMilestone();
    },
    onNewRecord: () => {
      meteorAudio.playComboMilestone();
    },
    onGameOver: () => {
      meteorAudio.stopAmbient();
      syncBodyState('gameover');
      if (simRef.current) {
        syncHudFromSim(simRef.current);
        void finalizeRun(simRef.current);
      }
    },
  };

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    reducedMotionRef.current = next.reducedMotion;
    screenShakeRef.current = next.screenShake;
    setSettings(next);
    saveSettings(next);
    meteorAudio.configure(next);
    if (patch.selectedEnvironment) {
      if (simRef.current) simRef.current.environment = patch.selectedEnvironment;
      sceneControllerRef.current?.setEnvironment(patch.selectedEnvironment);
      meteorAudio.setEnvironment(patch.selectedEnvironment);
    }
    if (next.musicEnabled && simRef.current?.phase === 'playing') {
      meteorAudio.startAmbient(simRef.current.environment);
    }
  }, []);

  const handleStartNewGame = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    meteorAudio.unlock();
    const playerLevel = getLevelFromXp(lifetimeStatsRef.current.totalXp).level;
    const env = settingsRef.current.selectedEnvironment;
    startNewRun(sim, env, playerLevel);
    sceneControllerRef.current?.setEnvironment(env);
    setGameOverSummary(null);
    setActiveModal('none');
    setSavedSession(null);
    void clearActiveSession();
    syncBodyState('playing');
    syncHudFromSim(sim);
    meteorAudio.startAmbient(env);
  }, [syncBodyState, syncHudFromSim]);

  const handleResumeSavedSession = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !savedSession) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    meteorAudio.unlock();
    hydrateSimulationFromSave(sim, savedSession);
    sceneControllerRef.current?.setEnvironment(sim.environment);
    setActiveModal('none');
    syncBodyState('playing');
    syncHudFromSim(sim);
    meteorAudio.startAmbient(sim.environment);
  }, [savedSession, syncBodyState, syncHudFromSim]);

  const handlePause = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'playing') return;
    sim.phase = 'paused';
    meteorAudio.stopAmbient();
    const snapshot = exportSavedSession(sim);
    setSavedSession(snapshot);
    void saveActiveSession(snapshot);
    syncBodyState('paused');
    syncHudFromSim(sim);
  }, [syncBodyState, syncHudFromSim]);

  const handleResumeFromPause = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'paused') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sim.phase = 'playing';
    syncBodyState('playing');
    syncHudFromSim(sim);
    meteorAudio.startAmbient(sim.environment);
  }, [syncBodyState, syncHudFromSim]);

  const handleReturnToTitle = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    meteorAudio.stopAmbient();
    if (sim.phase === 'paused' || sim.phase === 'playing') {
      const snapshot = exportSavedSession(sim);
      setSavedSession(snapshot);
      void saveActiveSession(snapshot);
    }
    sim.phase = 'title';
    setGameOverSummary(null);
    setActiveModal('none');
    syncBodyState('title');
  }, [syncBodyState]);

  const handleLeaveGameToPlatform = useCallback(() => {
    const sim = simRef.current;
    meteorAudio.stopAmbient();
    if (sim && (sim.phase === 'paused' || sim.phase === 'playing')) {
      const snapshot = exportSavedSession(sim);
      void saveActiveSession(snapshot);
    }
    onExitToPlatform();
  }, [onExitToPlatform]);

  const handleActivatePowerUp = useCallback(
    (id: PowerUpId) => {
      const sim = simRef.current;
      if (!sim || sim.phase !== 'playing') return;
      meteorAudio.unlock();
      const activated = activatePowerUp(
        sim,
        id,
        lifetimeStatsRef.current.highScore,
        callbacksRef.current
      );
      if (activated) {
        syncHudFromSim(sim);
      }
    },
    [syncHudFromSim]
  );

  const handleResetAllData = useCallback(async () => {
    await clearAllProgressData();
    const fresh = { ...DEFAULT_LIFETIME_STATS };
    lifetimeStatsRef.current = fresh;
    unlockedRef.current = [];
    setLifetimeStats(fresh);
    setUnlockedAchievements([]);
    setSavedSession(null);
    setRecentRuns([]);
    setLastSession(null);
  }, []);

  // Mount Three.js scene + overlay 2D callout canvas once
  useEffect(() => {
    document.title = 'Meteor Shower — Oddlot';
    meteorAudio.configure(settingsRef.current);

    const mount = sceneMountRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!mount || !overlayCanvas) return;

    const sim = createSimulation(settingsRef.current.selectedEnvironment, 1);
    simRef.current = sim;

    const params = new URLSearchParams(window.location.search);
    const shouldAutostart = params.get('autostart') === '1';
    if (shouldAutostart) {
      startNewRun(sim, settingsRef.current.selectedEnvironment, 1);
      document.body.dataset.state = 'playing';
      setPhase('playing');
      syncHudFromSim(sim);
    } else {
      document.body.dataset.state = 'title';
    }

    const resizeOverlay = () => {
      const rect = overlayCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, rect.width || window.innerWidth);
      const h = Math.max(320, rect.height || window.innerHeight);
      overlayCanvas.width = Math.round(w * dpr);
      overlayCanvas.height = Math.round(h * dpr);
      const ctx = overlayCanvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeOverlay();
    const overlayObserver = new ResizeObserver(resizeOverlay);
    overlayObserver.observe(overlayCanvas);

    const drawOverlay = (sceneCtrl: PlanetSceneController, currentSim: GameSimulation) => {
      const ctx = overlayCanvas.getContext('2d');
      if (!ctx) return;
      const rect = overlayCanvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (currentSim.phase !== 'playing') return;

      // Multi-hit HP pips above armored/heavy/cosmic meteors
      for (const m of currentSim.meteors) {
        if (m.destroyed || m.maxHp <= 1) continue;
        const proj = sceneCtrl.projectWorldToScreen(m.x, m.y + m.radius + 0.24, m.z);
        if (!proj.visible) continue;
        const pipW = 9;
        const gap = 3;
        const totalW = m.maxHp * pipW + (m.maxHp - 1) * gap;
        const startX = proj.x - totalW * 0.5;
        for (let i = 0; i < m.maxHp; i++) {
          ctx.fillStyle = i < m.hp ? '#FBBF24' : 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.fillRect(startX + i * (pipW + gap), proj.y, pipW, 4);
          ctx.strokeRect(startX + i * (pipW + gap), proj.y, pipW, 4);
        }
      }

      // Floating score & milestone callouts
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const c of currentSim.callouts) {
        const proj = sceneCtrl.projectWorldToScreen(c.x, c.y, c.z);
        if (!proj.visible) continue;
        const alpha = Math.max(0, Math.min(1, c.life / c.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '800 15px system-ui, -apple-system, sans-serif';
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(3, 7, 18, 0.9)';
        ctx.strokeText(c.text, proj.x, proj.y);
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, proj.x, proj.y);
        if (c.subtext) {
          ctx.font = '600 11px system-ui, -apple-system, sans-serif';
          ctx.strokeText(c.subtext, proj.x, proj.y + 15);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText(c.subtext, proj.x, proj.y + 15);
        }
        ctx.restore();
      }
    };

    const controller = mountPlanetScene(
      mount,
      () => sim,
      (dt) => {
        if (sim.phase !== 'paused') {
          stepSimulation(sim, dt, lifetimeStatsRef.current.highScore, callbacksRef.current);
        }
        drawOverlay(controller, sim);

        if (sim.phase === 'playing') {
          if (comboBarRef.current) {
            const ratio =
              sim.session.combo > 0 && sim.session.comboMaxTime > 0
                ? Math.max(0, Math.min(1, sim.session.comboTimer / sim.session.comboMaxTime))
                : 0;
            comboBarRef.current.style.transform = `scaleX(${ratio})`;
          }

          const now = performance.now();
          const powerSig = POWERUP_ORDER.map((id) => {
            const sl = sim.powerUps[id];
            return `${sl.charges}:${sl.activeRemaining.toFixed(1)}:${Math.ceil(sl.cooldownRemaining)}`;
          }).join('|');
          const sig = `${Math.round(sim.session.score)}:${sim.session.combo}:${Math.round(sim.session.planetHp)}:${sim.session.wave}:${sim.session.wavePhase}:${Math.ceil(sim.session.waveRemainingSeconds)}:${sim.session.waveBannerTimer > 0 ? 1 : 0}:${powerSig}`;

          if (sig !== lastHudSignatureRef.current && now - lastHudSyncRef.current >= 110) {
            lastHudSignatureRef.current = sig;
            lastHudSyncRef.current = now;
            syncHudFromSim(sim);
          }
          if (now - lastAutosaveRef.current >= 3000) {
            lastAutosaveRef.current = now;
            void saveActiveSession(exportSavedSession(sim));
          }
        }
      },
      reducedMotionRef,
      screenShakeRef
    );
    sceneControllerRef.current = controller;

    // Load IndexedDB profile
    let mounted = true;
    void (async () => {
      const [loadedStats, loadedAchievements, loadedSession, loadedRuns] = await Promise.all([
        loadLifetimeStats(),
        loadUnlockedAchievements(),
        loadActiveSession(),
        loadRecentRuns(),
      ]);
      if (!mounted) return;
      lifetimeStatsRef.current = loadedStats;
      unlockedRef.current = loadedAchievements;
      setLifetimeStats(loadedStats);
      setUnlockedAchievements(loadedAchievements);
      setSavedSession(loadedSession);
      setRecentRuns(loadedRuns);

      if (shouldAutostart && sim.phase === 'playing') {
        // Re-unlock power-ups based on player level
        const lvl = getLevelFromXp(loadedStats.totalXp).level;
        sim.playerLevelAtStart = lvl;
        syncHudFromSim(sim);
      }
    })();

    const handleVisibilityOrUnload = () => {
      if (sim.phase === 'playing' || sim.phase === 'paused') {
        void saveActiveSession(exportSavedSession(sim));
      }
    };
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      mounted = false;
      overlayObserver.disconnect();
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      meteorAudio.stopAmbient();
      controller.dispose();
      sceneControllerRef.current = null;
      document.body.dataset.state = 'platform';
    };
  }, [syncHudFromSim]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const sim = simRef.current;
      if (!sim) return;

      if (activeModal !== 'none') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveModal('none');
        }
        return;
      }

      if (sim.phase === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartNewGame();
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const muted = !settingsRef.current.sfxEnabled && !settingsRef.current.musicEnabled;
        handleUpdateSettings({ sfxEnabled: muted, musicEnabled: muted });
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        if (sim.phase === 'playing') handlePause();
        else if (sim.phase === 'paused') handleResumeFromPause();
        return;
      }

      if (sim.phase === 'playing') {
        const num = Number(e.key);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          const powerUpId = POWERUP_ORDER[num - 1];
          if (powerUpId) handleActivatePowerUp(powerUpId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeModal,
    handleActivatePowerUp,
    handlePause,
    handleResumeFromPause,
    handleStartNewGame,
    handleUpdateSettings,
  ]);

  const handleScenePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    const ctrl = sceneControllerRef.current;
    if (!sim || !ctrl || sim.phase !== 'playing') return;
    meteorAudio.unlock();

    const meteorId = ctrl.pickMeteorAtClientPos(e.clientX, e.clientY, sim);
    if (meteorId === null) return;

    const target = sim.meteors.find((m) => m.id === meteorId);
    if (!target) return;

    const hit = hitMeteorById(
      sim,
      meteorId,
      lifetimeStatsRef.current.highScore,
      callbacksRef.current
    );
    if (hit) {
      ctrl.spawnHitBurst(
        target.x,
        target.y,
        target.z,
        getMeteorBurstColor(target.type),
        target.destroyed ? 16 : 6
      );
      syncHudFromSim(sim);
    }
  };

  const isMuted = !settings.sfxEnabled && !settings.musicEnabled;

  return (
    <main className="relative h-dvh w-screen overflow-hidden select-none bg-[#03060E] touch-manipulation">
      {/* Isolated Full-Bleed Three.js Viewport */}
      <div
        ref={sceneMountRef}
        onPointerDown={handleScenePointerDown}
        className="absolute inset-0 cursor-crosshair touch-none"
      />

      {/* Transparent 2D Callout & HP Pip Overlay */}
      <canvas
        ref={overlayCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      {phase === 'title' && (
        <MeteorTitleScreen
          stats={lifetimeStats}
          selectedEnvironment={settings.selectedEnvironment}
          unlockedCount={unlockedAchievements.length}
          totalAchievements={METEOR_ACHIEVEMENTS.length}
          savedSession={savedSession}
          onSelectEnvironment={(env: CosmicEnvironmentId) =>
            handleUpdateSettings({ selectedEnvironment: env })
          }
          onStartNew={handleStartNewGame}
          onResumeSaved={handleResumeSavedSession}
          onOpenStats={() => setActiveModal('stats')}
          onOpenAchievements={() => setActiveModal('achievements')}
          onOpenSettings={() => setActiveModal('settings')}
          onExitToPlatform={handleLeaveGameToPlatform}
        />
      )}

      {phase === 'playing' && hud && (
        <MeteorHud
          hud={hud}
          muted={isMuted}
          comboBarRef={comboBarRef}
          onToggleMute={() =>
            handleUpdateSettings({ sfxEnabled: isMuted, musicEnabled: isMuted })
          }
          onPause={handlePause}
          onActivatePowerUp={handleActivatePowerUp}
        />
      )}

      {phase === 'paused' && hud && (
        <MeteorPauseModal
          score={hud.session.score}
          wave={hud.session.wave}
          planetHp={hud.session.planetHp}
          meteorsDestroyed={hud.session.meteorsDestroyed}
          settings={settings}
          onResume={handleResumeFromPause}
          onRestart={handleStartNewGame}
          onMainMenu={handleReturnToTitle}
          onExitToPlatform={handleLeaveGameToPlatform}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {phase === 'gameover' && gameOverSummary && (
        <MeteorGameOverModal
          summary={gameOverSummary}
          totalLifetimeXp={lifetimeStats.totalXp}
          onReplay={handleStartNewGame}
          onMainMenu={handleReturnToTitle}
          onExitToPlatform={handleLeaveGameToPlatform}
        />
      )}

      {activeModal === 'stats' && (
        <MeteorStatsModal
          stats={lifetimeStats}
          lastSession={lastSession}
          recentRuns={recentRuns}
          unlockedCount={unlockedAchievements.length}
          totalAchievements={METEOR_ACHIEVEMENTS.length}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'achievements' && (
        <MeteorAchievementsModal
          stats={lifetimeStats}
          unlocked={unlockedAchievements}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'settings' && (
        <MeteorSettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetAllData={handleResetAllData}
          onClose={() => setActiveModal('none')}
        />
      )}
    </main>
  );
};

export default MeteorShowerGame;
