import React, { useState } from 'react';
import { Award, CheckCircle2, Lock, Play, RotateCcw, Trash2, X } from 'lucide-react';
import { getLevelFromXp, METEOR_ACHIEVEMENTS } from '../progression';
import {
  EndOfRunSummary,
  GameSettings,
  LifetimeStats,
  SessionState,
  UnlockedAchievement,
} from '../types';

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

/* ---------------- PAUSE MODAL ---------------- */
interface MeteorPauseModalProps {
  score: number;
  wave: number;
  planetHp: number;
  meteorsDestroyed: number;
  settings: GameSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onExitToPlatform: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
}

export const MeteorPauseModal: React.FC<MeteorPauseModalProps> = ({
  score,
  wave,
  planetHp,
  meteorsDestroyed,
  settings,
  onResume,
  onRestart,
  onMainMenu,
  onExitToPlatform,
  onUpdateSettings,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meteor-pause-title"
      className="w-full max-w-md rounded-2xl border border-white/15 bg-[#070D1E] p-6 text-slate-100 shadow-2xl"
    >
      <h2 id="meteor-pause-title" className="text-2xl font-black tracking-tight text-white">
        Defense Paused
      </h2>
      <p className="mt-1 text-xs text-slate-400">Orbital telemetry held in standby.</p>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</div>
          <div className="mt-0.5 text-lg font-black tabular-nums text-white">
            {score.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wave</div>
          <div className="mt-0.5 text-lg font-black tabular-nums text-sky-300">{wave}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earth HP</div>
          <div className="mt-0.5 text-lg font-black tabular-nums text-emerald-300">
            {Math.round(planetHp)}%
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400 tabular-nums">
        Meteors Intercepted this run: <span className="font-semibold text-white">{meteorsDestroyed}</span>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
        <span className="text-xs font-medium text-slate-200">Sound Effects & Ambient</span>
        <button
          type="button"
          onClick={() => {
            const next = !(settings.sfxEnabled || settings.musicEnabled);
            onUpdateSettings({ sfxEnabled: next, musicEnabled: next });
          }}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/15"
        >
          {settings.sfxEnabled || settings.musicEnabled ? 'On' : 'Muted'}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
        >
          <Play className="h-4 w-4 fill-current" />
          Resume Defense
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10"
          >
            Title Screen
          </button>
        </div>
        <button
          type="button"
          onClick={onExitToPlatform}
          className="mt-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
        >
          Back to Oddlot
        </button>
      </div>
    </div>
  </div>
);

/* ---------------- GAME OVER MODAL ---------------- */
interface MeteorGameOverModalProps {
  summary: EndOfRunSummary;
  totalLifetimeXp: number;
  onReplay: () => void;
  onMainMenu: () => void;
  onExitToPlatform: () => void;
}

export const MeteorGameOverModal: React.FC<MeteorGameOverModalProps> = ({
  summary,
  totalLifetimeXp,
  onReplay,
  onMainMenu,
  onExitToPlatform,
}) => {
  const levelInfo = getLevelFromXp(totalLifetimeXp);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/72 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meteor-gameover-title"
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#070D1E] p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="meteor-gameover-title" className="text-2xl font-black tracking-tight text-white">
              Atmosphere Breached
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {summary.isNewRecord
                ? 'New Planetary Defense High Score!'
                : `Survived ${summary.wavesSurvived} ${summary.wavesSurvived === 1 ? 'wave' : 'waves'} in orbit`}
            </p>
          </div>
          {summary.isNewRecord && (
            <span className="rounded-md border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              New Record
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</div>
            <div className="mt-0.5 text-xl font-black tabular-nums text-white">
              {summary.score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Waves Cleared
            </div>
            <div className="mt-0.5 text-xl font-black tabular-nums text-sky-300">
              {summary.wavesSurvived}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Meteors Hit
            </div>
            <div className="mt-0.5 text-xl font-black tabular-nums text-amber-300">
              {summary.meteorsDestroyed}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5 text-xs">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="text-slate-400">Best Streak </span>
            <span className="font-bold tabular-nums text-white">{summary.maxCombo}</span>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="text-slate-400">Peak Mult </span>
            <span className="font-bold tabular-nums text-white">x{summary.bestMultiplier}</span>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
            <span className="text-slate-400">Duration </span>
            <span className="font-bold tabular-nums text-white">
              {formatDuration(summary.elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/8 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-300">
              Lv {levelInfo.level} · {levelInfo.title}
            </span>
            <span className="font-bold tabular-nums text-emerald-300">
              +{summary.xpEarned} XP
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{ width: `${Math.round(levelInfo.progressRatio * 100)}%` }}
            />
          </div>
        </div>

        {summary.newlyUnlockedAchievements.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Achievements Unlocked
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {summary.newlyUnlockedAchievements.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs text-slate-100">
                  <span className="font-semibold">{a.title}</span>
                  <span className="tabular-nums text-amber-300">+{a.xpReward} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-start="true"
            onClick={onReplay}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-100 hover:bg-white/10"
          >
            Title Screen
          </button>
          <button
            type="button"
            onClick={onExitToPlatform}
            className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-xs font-medium text-slate-300 hover:text-white"
          >
            Oddlot
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- STATS MODAL ---------------- */
interface MeteorStatsModalProps {
  stats: LifetimeStats;
  lastSession: SessionState | null;
  recentRuns: EndOfRunSummary[];
  unlockedCount: number;
  totalAchievements: number;
  onClose: () => void;
}

export const MeteorStatsModal: React.FC<MeteorStatsModalProps> = ({
  stats,
  lastSession,
  recentRuns,
  unlockedCount,
  totalAchievements,
  onClose,
}) => {
  const levelInfo = getLevelFromXp(stats.totalXp);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meteor-stats-title"
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#070D1E] p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="meteor-stats-title" className="text-xl font-black text-white">
              Planetary Defense Telemetry
            </h2>
            <p className="text-xs text-slate-400">
              Lv {levelInfo.level} · {levelInfo.title} · {unlockedCount}/{totalAchievements} Honors
            </p>
          </div>
          <button
            type="button"
            aria-label="Close statistics"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {[
            ['High Score', stats.highScore.toLocaleString()],
            ['Highest Wave', String(stats.highestWave)],
            ['Meteors Destroyed', stats.totalMeteorsDestroyed.toLocaleString()],
            ['Best Streak', String(stats.highestCombo)],
            ['Games Played', String(stats.gamesPlayed)],
            ['Play Time', formatDuration(stats.totalPlaySeconds)],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
              </div>
              <div className="mt-0.5 text-lg font-black tabular-nums text-white">{val}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs">
          <div className="mb-2 font-bold uppercase tracking-wider text-slate-400">
            Threat Breakdown
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div>Heavy: <strong className="tabular-nums text-white">{stats.heavyDestroyed}</strong></div>
            <div>Armored: <strong className="tabular-nums text-white">{stats.armoredDestroyed}</strong></div>
            <div>Splitting: <strong className="tabular-nums text-white">{stats.splittingDestroyed}</strong></div>
            <div>Explosive: <strong className="tabular-nums text-white">{stats.explosiveDestroyed}</strong></div>
            <div>Cosmic: <strong className="tabular-nums text-sky-300">{stats.cosmicDestroyed}</strong></div>
            <div>Clean Waves: <strong className="tabular-nums text-emerald-300">{stats.perfectWaves}</strong></div>
          </div>
        </div>

        {lastSession && (
          <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/5 p-3 text-xs text-slate-200">
            Last Run: <strong className="tabular-nums text-white">{lastSession.score.toLocaleString()}</strong> pts ·{' '}
            Wave <strong className="tabular-nums text-white">{lastSession.wave}</strong> ·{' '}
            {lastSession.meteorsDestroyed} meteors
          </div>
        )}

        {recentRuns.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Recent Deployments
            </div>
            <div className="flex flex-col gap-1.5">
              {recentRuns.slice(0, 5).map((run) => (
                <div
                  key={run.runId}
                  className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="font-bold tabular-nums text-white">
                    {run.score.toLocaleString()} pts
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {run.wavesSurvived} waves · {run.meteorsDestroyed} hits · {formatDuration(run.elapsedSeconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- ACHIEVEMENTS MODAL ---------------- */
interface MeteorAchievementsModalProps {
  stats: LifetimeStats;
  unlocked: UnlockedAchievement[];
  onClose: () => void;
}

export const MeteorAchievementsModal: React.FC<MeteorAchievementsModalProps> = ({
  stats,
  unlocked,
  onClose,
}) => {
  const unlockedIds = new Set(unlocked.map((u) => u.id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meteor-achievements-title"
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#070D1E] p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-amber-400" />
            <h2 id="meteor-achievements-title" className="text-xl font-black text-white">
              Orbital Honors ({unlocked.length}/{METEOR_ACHIEVEMENTS.length})
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close achievements"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {METEOR_ACHIEVEMENTS.map((def) => {
            const isUnlocked = unlockedIds.has(def.id) || def.check(stats);
            return (
              <div
                key={def.id}
                className={`rounded-xl border p-3.5 ${
                  isUnlocked
                    ? 'border-amber-400/35 bg-amber-500/10'
                    : 'border-white/8 bg-white/[0.02] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-white">{def.title}</div>
                  {isUnlocked ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-300">{def.description}</p>
                <div className="mt-2 text-[11px] font-bold tabular-nums text-amber-300">
                  +{def.xpReward} XP
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- SETTINGS MODAL ---------------- */
interface MeteorSettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetAllData: () => Promise<void>;
  onClose: () => void;
}

export const MeteorSettingsModal: React.FC<MeteorSettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meteor-settings-title"
        className="w-full max-w-md rounded-2xl border border-white/15 bg-[#070D1E] p-6 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="meteor-settings-title" className="text-xl font-black text-white">
            Defense Settings
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm">
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <span>Sound Effects</span>
            <input
              type="checkbox"
              checked={settings.sfxEnabled}
              onChange={(e) => onUpdateSettings({ sfxEnabled: e.target.checked })}
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <span>Space Ambient Drone</span>
            <input
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={(e) => onUpdateSettings({ musicEnabled: e.target.checked })}
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <span>Impact Camera Shake</span>
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={(e) => onUpdateSettings({ screenShake: e.target.checked })}
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <span>Reduced Motion</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
              className="h-4 w-4 accent-sky-500"
            />
          </label>

          <label className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span>Master Volume</span>
              <span className="tabular-nums text-sky-300">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: Number(e.target.value) })}
              className="mt-2 w-full accent-sky-500"
            />
          </label>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Meteor Shower Progress
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onResetAllData();
                  setConfirmReset(false);
                  onClose();
                }}
                className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white hover:bg-rose-400"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
