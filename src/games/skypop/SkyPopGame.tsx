import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AchievementsModal } from '../../components/AchievementsModal';
import { GameHud, HudSnapshot } from '../../components/GameHud';
import { GameOverModal } from '../../components/GameOverModal';
import { PauseModal } from '../../components/PauseModal';
import { SettingsModal } from '../../components/SettingsModal';
import { StatsModal } from '../../components/StatsModal';
import { TitleScreen } from '../../components/TitleScreen';
import { audioEngine } from '../../game/audio';
import {
  AppliedSessionDeltas,
  applySessionToDailyChallenges,
  createDailyChallengesState,
  createEmptyAppliedDeltas,
  ensureCurrentDailyChallenges,
  getLocalDateKey,
} from '../../game/dailyChallenges';
import {
  activatePowerUp,
  addFloatingText,
  createSimulation,
  EngineCallbacks,
  exportSavedSession,
  hydrateSimulationFromSave,
  popBubbleAt,
  startNewRun,
  stepSimulation,
} from '../../game/engine';
import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievements,
  getLevelFromXp,
  POWERUP_ORDER,
  WEATHER_CONFIGS,
} from '../../game/progression';
import { renderSimulation } from '../../game/renderer';
import {
  clearActiveSession,
  clearAllProgressData,
  DEFAULT_LIFETIME_STATS,
  loadActiveSession,
  loadAppliedDailyDeltas,
  loadDailyChallengesState,
  loadLifetimeStats,
  loadRecentRuns,
  loadSettings,
  loadUnlockedAchievements,
  recordRunSummary,
  saveActiveSession,
  saveAppliedDailyDeltas,
  saveDailyChallengesState,
  saveLifetimeStats,
  saveSettings,
  saveUnlockedAchievements,
} from '../../game/storage';
import {
  DailyChallengesState,
  EndOfRunSummary,
  GamePhase,
  GameSettings,
  GameSimulation,
  LifetimeStats,
  PowerUpId,
  SavedActiveSession,
  SessionCounters,
  UnlockedAchievement,
} from '../../game/types';
import { OddlotGameProps } from '../../platform/games';

type ActiveModal = 'none' | 'stats' | 'achievements' | 'settings';

export const SkyPopGame: React.FC<OddlotGameProps> = ({ onExitToPlatform }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<GameSimulation | null>(null);
  const settingsRef = useRef<GameSettings>(loadSettings());
  const lifetimeStatsRef = useRef<LifetimeStats>({ ...DEFAULT_LIFETIME_STATS });
  const unlockedRef = useRef<UnlockedAchievement[]>([]);
  const lastHudSyncRef = useRef<number>(0);
  const lastHudSignatureRef = useRef<string>('');
  const lastAutosaveRef = useRef<number>(0);
  const comboBarRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [settings, setSettings] = useState<GameSettings>(() => settingsRef.current);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>(DEFAULT_LIFETIME_STATS);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengesState | null>(null);
  const dailyChallengesRef = useRef<DailyChallengesState | null>(null);
  const appliedDailyDeltasRef = useRef<AppliedSessionDeltas>(createEmptyAppliedDeltas());
  const [savedSession, setSavedSession] = useState<SavedActiveSession | null>(null);
  const [recentRuns, setRecentRuns] = useState<EndOfRunSummary[]>([]);
  const [lastSession, setLastSession] = useState<SessionCounters | null>(null);
  const [gameOverSummary, setGameOverSummary] = useState<EndOfRunSummary | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);

  const syncBodyState = useCallback((nextPhase: GamePhase) => {
    document.body.dataset.state = nextPhase;
    setPhase(nextPhase);
  }, []);

  const syncHudFromSim = useCallback((sim: GameSimulation) => {
    setHud({
      session: { ...sim.session, weathersExperienced: [...sim.session.weathersExperienced] },
      weather: sim.weather.current,
      powerUps: structuredClone(sim.powerUps),
      totalLifetimeXpBeforeRun: lifetimeStatsRef.current.totalXp,
      highScore: lifetimeStatsRef.current.highScore,
    });
  }, []);

  const finalizeRun = useCallback(async (sim: GameSimulation) => {
    const prevStats = lifetimeStatsRef.current;
    const levelBefore = getLevelFromXp(prevStats.totalXp).level;
    const previousHighScore = prevStats.highScore;
    const isNewRecord = sim.session.score > previousHighScore && sim.session.score > 0;

    const mergedWeathers = Array.from(
      new Set([...prevStats.weathersSeen, ...sim.session.weathersExperienced])
    );

    const updatedStats: LifetimeStats = {
      highScore: Math.max(prevStats.highScore, sim.session.score),
      totalScore: prevStats.totalScore + sim.session.score,
      totalXp: prevStats.totalXp + sim.session.xpEarned,
      totalBubblesPopped: prevStats.totalBubblesPopped + sim.session.bubblesPopped,
      smallBubblesPopped: prevStats.smallBubblesPopped + sim.session.smallPopped,
      mediumBubblesPopped: prevStats.mediumBubblesPopped + sim.session.mediumPopped,
      largeBubblesPopped: prevStats.largeBubblesPopped + sim.session.largePopped,
      highestCombo: Math.max(prevStats.highestCombo, sim.session.maxCombo),
      bestMultiplier: Math.max(prevStats.bestMultiplier, sim.session.bestMultiplier),
      totalPlaySeconds: prevStats.totalPlaySeconds + sim.session.elapsedSeconds,
      gamesPlayed: prevStats.gamesPlayed + 1,
      powerUpsCollected: prevStats.powerUpsCollected + sim.session.powerUpsCollected,
      powerUpsActivated: prevStats.powerUpsActivated + sim.session.powerUpsActivated,
      goldenBubblesPopped: prevStats.goldenBubblesPopped + sim.session.goldenPopped,
      chainReactionsTriggered: prevStats.chainReactionsTriggered + sim.session.chainPops,
      weathersSeen: mergedWeathers,
    };

    const currentDaily = ensureCurrentDailyChallenges(dailyChallengesRef.current);
    const dailyEval = applySessionToDailyChallenges(
      currentDaily,
      sim.session,
      appliedDailyDeltasRef.current,
      sim.runId
    );
    dailyChallengesRef.current = dailyEval.nextState;
    appliedDailyDeltasRef.current = dailyEval.nextApplied;
    setDailyChallenges(dailyEval.nextState);

    const unlockedIds = new Set(unlockedRef.current.map((u) => u.id));
    const newlyUnlocked = evaluateAchievements(
      { ...updatedStats, totalXp: updatedStats.totalXp + dailyEval.bonusXpGranted },
      unlockedIds
    );
    let bonusXp = dailyEval.bonusXpGranted;
    const nowTs = Date.now();
    const newUnlockRecords: UnlockedAchievement[] = newlyUnlocked.map((def) => {
      bonusXp += def.xpReward;
      return { id: def.id, unlockedAt: nowTs };
    });
    updatedStats.totalXp += bonusXp;

    const levelAfter = getLevelFromXp(updatedStats.totalXp).level;
    if (levelAfter > levelBefore) {
      audioEngine.playFanfare('levelup');
    } else if (newlyUnlocked.length > 0 || dailyEval.newlyCompleted.length > 0) {
      audioEngine.playFanfare('achievement');
    } else {
      audioEngine.playFanfare('gameover');
    }

    const summary: EndOfRunSummary = {
      runId: sim.runId,
      score: sim.session.score,
      previousHighScore,
      isNewRecord,
      xpEarned: sim.session.xpEarned + bonusXp,
      levelBefore,
      levelAfter,
      bubblesPopped: sim.session.bubblesPopped,
      smallPopped: sim.session.smallPopped,
      mediumPopped: sim.session.mediumPopped,
      largePopped: sim.session.largePopped,
      maxCombo: sim.session.maxCombo,
      bestMultiplier: sim.session.bestMultiplier,
      elapsedSeconds: sim.session.elapsedSeconds,
      difficultyLevel: sim.session.difficultyLevel,
      newlyUnlockedAchievements: newlyUnlocked,
      completedDailyChallenges: dailyEval.newlyCompleted,
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
      saveDailyChallengesState(dailyEval.nextState),
      saveAppliedDailyDeltas(dailyEval.nextApplied),
      clearActiveSession(),
      recordRunSummary(summary),
    ]);
    const runs = await loadRecentRuns();
    setRecentRuns(runs);
  }, []);

  const syncDailyProgressMidRun = useCallback((sim: GameSimulation) => {
    const currentDaily = ensureCurrentDailyChallenges(dailyChallengesRef.current);
    const evalRes = applySessionToDailyChallenges(
      currentDaily,
      sim.session,
      appliedDailyDeltasRef.current,
      sim.runId
    );
    dailyChallengesRef.current = evalRes.nextState;
    appliedDailyDeltasRef.current = evalRes.nextApplied;
    setDailyChallenges(evalRes.nextState);
    void saveDailyChallengesState(evalRes.nextState);
    void saveAppliedDailyDeltas(evalRes.nextApplied);

    if (evalRes.bonusXpGranted > 0) {
      const updatedStats: LifetimeStats = {
        ...lifetimeStatsRef.current,
        totalXp: lifetimeStatsRef.current.totalXp + evalRes.bonusXpGranted,
      };
      lifetimeStatsRef.current = updatedStats;
      setLifetimeStats(updatedStats);
      void saveLifetimeStats(updatedStats);
      audioEngine.playFanfare('achievement');
    }
  }, []);

  const callbacksRef = useRef<EngineCallbacks>({});
  callbacksRef.current = {
    onBubblePop: ({ type, size, combo, isMilestone, armoredCrackOnly }) => {
      audioEngine.playPop(type, size, combo, armoredCrackOnly);
      if (isMilestone) {
        audioEngine.playComboMilestone();
      }
    },
    onPowerUpCollect: () => {
      audioEngine.playPop('powerup', 'medium', 5, false);
    },
    onPowerUpActivate: (id) => {
      audioEngine.playPowerUp(id);
      if (simRef.current) {
        void saveActiveSession(exportSavedSession(simRef.current));
      }
    },
    onWeatherChange: (weather) => {
      audioEngine.setWeather(weather);
      if (simRef.current) {
        const cfg = WEATHER_CONFIGS[weather];
        addFloatingText(
          simRef.current,
          simRef.current.width * 0.5,
          104,
          cfg.label,
          '#e0f2fe',
          cfg.subtitle,
          1.15
        );
      }
    },
    onDamage: (shieldBlocked) => {
      audioEngine.playDamage(shieldBlocked);
    },
    onGameOver: () => {
      audioEngine.stopAmbient();
      syncBodyState('gameover');
      if (simRef.current) {
        syncHudFromSim(simRef.current);
        void finalizeRun(simRef.current);
      }
    },
    onNewRecord: () => {
      audioEngine.playComboMilestone();
    },
  };

  const handleStartNewGame = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioEngine.unlock();
    startNewRun(sim, lifetimeStatsRef.current.highScore);
    appliedDailyDeltasRef.current = createEmptyAppliedDeltas(sim.runId);
    void saveAppliedDailyDeltas(appliedDailyDeltasRef.current);
    setGameOverSummary(null);
    setActiveModal('none');
    setSavedSession(null);
    void clearActiveSession();
    syncBodyState('playing');
    syncHudFromSim(sim);
    audioEngine.startAmbient(sim.weather.current);
  }, [syncBodyState, syncHudFromSim]);

  const handleResumeSavedSession = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !savedSession) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioEngine.unlock();
    hydrateSimulationFromSave(sim, savedSession, lifetimeStatsRef.current.highScore);
    if (appliedDailyDeltasRef.current.runId !== sim.runId) {
      appliedDailyDeltasRef.current = {
        runId: sim.runId,
        powerUpsActivated: sim.session.powerUpsActivated,
        goldenPopped: sim.session.goldenPopped,
        smallPopped: sim.session.smallPopped,
        chainPops: sim.session.chainPops,
      };
    }
    setActiveModal('none');
    syncBodyState('playing');
    syncHudFromSim(sim);
    audioEngine.startAmbient(sim.weather.current);
  }, [savedSession, syncBodyState, syncHudFromSim]);

  const handlePause = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'playing') return;
    sim.phase = 'paused';
    audioEngine.stopAmbient();
    const snapshot = exportSavedSession(sim);
    setSavedSession(snapshot);
    void saveActiveSession(snapshot);
    syncDailyProgressMidRun(sim);
    syncBodyState('paused');
    syncHudFromSim(sim);
  }, [syncBodyState, syncDailyProgressMidRun, syncHudFromSim]);

  const handleResumeFromPause = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'paused') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    sim.phase = 'playing';
    syncBodyState('playing');
    syncHudFromSim(sim);
    audioEngine.startAmbient(sim.weather.current);
  }, [syncBodyState, syncHudFromSim]);

  const handleReturnToTitle = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    audioEngine.stopAmbient();
    if (sim.phase === 'paused' || sim.phase === 'playing') {
      const snapshot = exportSavedSession(sim);
      setSavedSession(snapshot);
      void saveActiveSession(snapshot);
      syncDailyProgressMidRun(sim);
    }
    sim.phase = 'title';
    setGameOverSummary(null);
    setActiveModal('none');
    syncBodyState('title');
  }, [syncBodyState, syncDailyProgressMidRun]);

  const handleLeaveGameToPlatform = useCallback(() => {
    const sim = simRef.current;
    audioEngine.stopAmbient();
    if (sim && (sim.phase === 'paused' || sim.phase === 'playing')) {
      const snapshot = exportSavedSession(sim);
      void saveActiveSession(snapshot);
      syncDailyProgressMidRun(sim);
    }
    onExitToPlatform();
  }, [onExitToPlatform, syncDailyProgressMidRun]);

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    audioEngine.configure(next);
    if (next.musicEnabled && simRef.current?.phase === 'playing') {
      audioEngine.startAmbient(simRef.current.weather.current);
    }
  }, []);

  const handleActivatePowerUp = useCallback(
    (id: PowerUpId) => {
      const sim = simRef.current;
      if (!sim || sim.phase !== 'playing') return;
      audioEngine.unlock();
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
    const fresh = {
      ...DEFAULT_LIFETIME_STATS,
      weathersSeen: ['clear'] as LifetimeStats['weathersSeen'],
    };
    const freshDaily = createDailyChallengesState(getLocalDateKey());
    lifetimeStatsRef.current = fresh;
    unlockedRef.current = [];
    dailyChallengesRef.current = freshDaily;
    appliedDailyDeltasRef.current = createEmptyAppliedDeltas();
    setLifetimeStats(fresh);
    setUnlockedAchievements([]);
    setDailyChallenges(freshDaily);
    void saveDailyChallengesState(freshDaily);
    setSavedSession(null);
    setRecentRuns([]);
    setLastSession(null);
  }, []);

  // Initialize Canvas, Simulation, Persistent Data & RAF Loop once
  useEffect(() => {
    document.title = 'SkyPop — Oddlot';
    audioEngine.configure(settingsRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const initW = rect.width || window.innerWidth;
    const initH = rect.height || window.innerHeight;
    const sim = createSimulation(initW, initH, 0);
    simRef.current = sim;

    const updateCanvasSize = () => {
      const bounds = canvas.getBoundingClientRect();
      const w = Math.max(320, bounds.width);
      const h = Math.max(320, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      sim.width = w;
      sim.height = h;
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    const params = new URLSearchParams(window.location.search);
    const shouldAutostart = params.get('autostart') === '1';
    if (shouldAutostart) {
      startNewRun(sim, 0);
      document.body.dataset.state = 'playing';
      setPhase('playing');
      setHud({
        session: { ...sim.session, weathersExperienced: [...sim.session.weathersExperienced] },
        weather: sim.weather.current,
        powerUps: structuredClone(sim.powerUps),
        totalLifetimeXpBeforeRun: 0,
        highScore: 0,
      });
    } else {
      document.body.dataset.state = 'title';
    }

    // Load persistent IndexedDB profile
    let mounted = true;
    void (async () => {
      const [
        loadedStats,
        loadedAchievements,
        loadedSession,
        loadedRuns,
        loadedDaily,
        loadedDeltas,
      ] = await Promise.all([
        loadLifetimeStats(),
        loadUnlockedAchievements(),
        loadActiveSession(),
        loadRecentRuns(),
        loadDailyChallengesState(),
        loadAppliedDailyDeltas(),
      ]);
      if (!mounted) return;
      const currentDaily = ensureCurrentDailyChallenges(loadedDaily);
      if (!loadedDaily || loadedDaily.dateKey !== currentDaily.dateKey) {
        void saveDailyChallengesState(currentDaily);
      }
      dailyChallengesRef.current = currentDaily;
      setDailyChallenges(currentDaily);
      if (loadedDeltas) {
        appliedDailyDeltasRef.current = loadedDeltas;
      }

      lifetimeStatsRef.current = loadedStats;
      unlockedRef.current = loadedAchievements;
      setLifetimeStats(loadedStats);
      setUnlockedAchievements(loadedAchievements);
      setSavedSession(loadedSession);
      setRecentRuns(loadedRuns);

      if (shouldAutostart && sim.phase === 'playing') {
        syncHudFromSim(sim);
      }
    })();

    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let renderedPausedFrame = false;
    const isHeadless = typeof navigator !== 'undefined' && navigator.webdriver === true;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      if (sim.phase !== 'paused') {
        renderedPausedFrame = false;
        stepSimulation(sim, rawDt, lifetimeStatsRef.current.highScore, callbacksRef.current);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderSimulation(ctx, sim, now / 1000, settingsRef.current);
        }
      } else if (!renderedPausedFrame) {
        renderedPausedFrame = true;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderSimulation(ctx, sim, now / 1000, settingsRef.current);
        }
      }

      if (sim.phase === 'playing') {
        if (comboBarRef.current) {
          const ratio =
            sim.session.combo > 0 && sim.session.comboMaxTime > 0
              ? Math.max(0, Math.min(1, sim.session.comboTimer / sim.session.comboMaxTime))
              : 0;
          comboBarRef.current.style.transform = `scaleX(${ratio})`;
        }

        const activeTimers = POWERUP_ORDER.map((id) => {
          const sl = sim.powerUps[id];
          return `${sl.charges}:${sl.activeRemaining.toFixed(1)}:${Math.ceil(sl.cooldownRemaining)}`;
        }).join('|');
        const sig = `${sim.session.score}:${sim.session.combo}:${sim.session.stability}:${sim.session.difficultyLevel}:${sim.weather.current}:${activeTimers}`;

        if (sig !== lastHudSignatureRef.current && now - lastHudSyncRef.current >= 120) {
          lastHudSignatureRef.current = sig;
          lastHudSyncRef.current = now;
          syncHudFromSim(sim);
        }
        if (now - lastAutosaveRef.current >= 3000) {
          lastAutosaveRef.current = now;
          void saveActiveSession(exportSavedSession(sim));
        }
      }

      if (isHeadless) {
        timerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, 220);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    const handleVisibilityOrUnload = () => {
      if (sim.phase === 'playing' || sim.phase === 'paused') {
        void saveActiveSession(exportSavedSession(sim));
      }
    };
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      audioEngine.stopAmbient();
      document.body.dataset.state = 'platform';
    };
  }, [syncHudFromSim]);

  // Global keyboard bindings
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
        handleUpdateSettings({
          sfxEnabled: muted,
          musicEnabled: muted,
        });
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        if (sim.phase === 'playing') {
          handlePause();
        } else if (sim.phase === 'paused') {
          handleResumeFromPause();
        }
        return;
      }

      if (sim.phase === 'playing') {
        const num = Number(e.key);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          const powerUpId = POWERUP_ORDER[num - 1];
          if (powerUpId) {
            handleActivatePowerUp(powerUpId);
          }
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

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    const canvas = canvasRef.current;
    if (!sim || !canvas) return;
    audioEngine.unlock();

    const bounds = canvas.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    sim.cursorX = x;
    sim.cursorY = y;
    sim.cursorActive = true;

    if (sim.phase === 'playing') {
      const hit = popBubbleAt(
        sim,
        x,
        y,
        lifetimeStatsRef.current.highScore,
        callbacksRef.current
      );
      if (hit) {
        syncHudFromSim(sim);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    const canvas = canvasRef.current;
    if (!sim || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    sim.cursorX = e.clientX - bounds.left;
    sim.cursorY = e.clientY - bounds.top;
    sim.cursorActive = true;
  };

  const isMuted = !settings.sfxEnabled && !settings.musicEnabled;

  return (
    <main className="relative h-dvh w-screen overflow-hidden select-none bg-slate-950 touch-manipulation">
      {/* Isolated Full-Bleed Canvas2D Sky Arena */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        className="block h-full w-full touch-none cursor-crosshair"
      />

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleScreen
          stats={lifetimeStats}
          unlockedCount={unlockedAchievements.length}
          totalAchievements={ACHIEVEMENT_DEFINITIONS.length}
          savedSession={savedSession}
          dailyChallenges={dailyChallenges}
          onStartNew={handleStartNewGame}
          onResumeSaved={handleResumeSavedSession}
          onOpenStats={() => setActiveModal('stats')}
          onOpenAchievements={() => setActiveModal('achievements')}
          onOpenSettings={() => setActiveModal('settings')}
          onExitToPlatform={handleLeaveGameToPlatform}
        />
      )}

      {/* Active Gameplay HUD */}
      {phase === 'playing' && hud && (
        <GameHud
          hud={hud}
          muted={isMuted}
          comboBarRef={comboBarRef}
          onToggleMute={() =>
            handleUpdateSettings({
              sfxEnabled: isMuted,
              musicEnabled: isMuted,
            })
          }
          onPause={handlePause}
          onActivatePowerUp={handleActivatePowerUp}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && hud && (
        <PauseModal
          score={hud.session.score}
          combo={hud.session.combo}
          bubblesPopped={hud.session.bubblesPopped}
          settings={settings}
          onResume={handleResumeFromPause}
          onRestart={handleStartNewGame}
          onMainMenu={handleReturnToTitle}
          onExitToPlatform={handleLeaveGameToPlatform}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          totalLifetimeXp={lifetimeStats.totalXp}
          onReplay={handleStartNewGame}
          onMainMenu={handleReturnToTitle}
          onExitToPlatform={handleLeaveGameToPlatform}
        />
      )}

      {/* Sub-Modals */}
      {activeModal === 'stats' && (
        <StatsModal
          stats={lifetimeStats}
          lastSession={lastSession}
          recentRuns={recentRuns}
          unlockedCount={unlockedAchievements.length}
          totalAchievements={ACHIEVEMENT_DEFINITIONS.length}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'achievements' && (
        <AchievementsModal
          stats={lifetimeStats}
          unlocked={unlockedAchievements}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetAllData={handleResetAllData}
          onClose={() => setActiveModal('none')}
        />
      )}
    </main>
  );
};

export default SkyPopGame;
