import React from 'react';
import { ArrowLeft, Award, BarChart3, Lock, Play, RotateCcw, Settings } from 'lucide-react';
import {
  COSMIC_ENVIRONMENTS,
  COSMIC_ENVIRONMENT_ORDER,
  getLevelFromXp,
} from '../progression';
import { CosmicEnvironmentId, LifetimeStats, SavedActiveSession } from '../types';

interface MeteorTitleScreenProps {
  stats: LifetimeStats;
  selectedEnvironment: CosmicEnvironmentId;
  unlockedCount: number;
  totalAchievements: number;
  savedSession: SavedActiveSession | null;
  onSelectEnvironment: (env: CosmicEnvironmentId) => void;
  onStartNew: () => void;
  onResumeSaved: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onExitToPlatform: () => void;
}

export const MeteorTitleScreen: React.FC<MeteorTitleScreenProps> = ({
  stats,
  selectedEnvironment,
  unlockedCount,
  totalAchievements,
  savedSession,
  onSelectEnvironment,
  onStartNew,
  onResumeSaved,
  onOpenStats,
  onOpenAchievements,
  onOpenSettings,
  onExitToPlatform,
}) => {
  const levelInfo = getLevelFromXp(stats.totalXp);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Safe Bar: Back to Oddlot + High Score / Rank */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExitToPlatform}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#070D1D]/85 px-3.5 py-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:border-sky-400/50 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
          Oddlot
        </button>

        <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-white/12 bg-[#070D1D]/85 px-4 py-2 text-right">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Best Score
            </div>
            <div className="text-base font-bold tabular-nums text-white">
              {stats.highScore.toLocaleString()}
            </div>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Lv {levelInfo.level} · {levelInfo.title}
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-400 transition-all duration-300"
                style={{ width: `${Math.round(levelInfo.progressRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Stage: Left Title Lockup + Actions, Right Negative Space for Photorealistic Earth */}
      <div className="my-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="pointer-events-auto max-w-md rounded-2xl border border-white/12 bg-[#060B18]/84 p-5 shadow-2xl sm:p-6">
          {/* Bespoke SVG Title Lockup */}
          <div className="mb-3 flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-hidden="true">
              <circle cx="20" cy="20" r="14" fill="#0C2446" stroke="#38BDF8" strokeWidth="1.6" />
              <path
                d="M9 17C12 13 18 12 22 15C25 17 29 15 31 12"
                stroke="#34D399"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M7 29L18 18"
                stroke="#FB923C"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="19" cy="17" r="3" fill="#FDE047" />
              <ellipse
                cx="20"
                cy="20"
                rx="18"
                ry="7"
                transform="rotate(-22 20 20)"
                stroke="#7DD3FC"
                strokeWidth="1.1"
                strokeOpacity="0.6"
                fill="none"
              />
            </svg>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                METEOR SHOWER
              </h1>
              <p className="text-xs font-medium text-sky-200/85">
                Planetary Orbital Defense
              </p>
            </div>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-300">
            Intercept incoming asteroids before atmospheric impact. Chain precision hits,
            crack armored cores, and deploy orbital defenses to keep Earth intact.
          </p>

          {/* Primary Actions */}
          <div className="flex flex-col gap-2.5">
            {savedSession ? (
              <>
                <button
                  type="button"
                  data-start="true"
                  onClick={onResumeSaved}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 active:scale-[0.99]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume Defense · Wave {savedSession.session.wave}
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Start New Defense
                </button>
              </>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onStartNew}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 active:scale-[0.99]"
              >
                <Play className="h-4 w-4 fill-current" />
                Launch Defense
              </button>
            )}
          </div>

          {/* Secondary Utility Row */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3.5">
            <button
              type="button"
              onClick={onOpenStats}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:text-white"
            >
              <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
              Stats
            </button>
            <button
              type="button"
              onClick={onOpenAchievements}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:text-white"
            >
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span className="tabular-nums">
                {unlockedCount}/{totalAchievements}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5 text-slate-300" />
              Settings
            </button>
          </div>
        </div>

        {/* Cosmic Environment Selector */}
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/12 bg-[#060B18]/84 p-4 shadow-2xl">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
              Cosmic Sector
            </span>
            <span className="text-[11px] font-medium text-sky-300">
              {COSMIC_ENVIRONMENTS[selectedEnvironment].name}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {COSMIC_ENVIRONMENT_ORDER.map((envId) => {
              const env = COSMIC_ENVIRONMENTS[envId];
              const locked = levelInfo.level < env.unlockLevel;
              const active = selectedEnvironment === envId;
              return (
                <button
                  key={envId}
                  type="button"
                  disabled={locked}
                  onClick={() => onSelectEnvironment(envId)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? 'border-sky-400/70 bg-sky-500/18 text-white'
                      : locked
                        ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-500'
                        : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm border border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${env.nebulaPrimary}, ${env.nebulaSecondary})`,
                      }}
                    />
                    <div>
                      <div className="text-xs font-semibold leading-tight">{env.name}</div>
                      <div className="text-[10px] text-slate-400">{env.subtitle}</div>
                    </div>
                  </div>
                  {locked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-amber-400/90">
                      <Lock className="h-3 w-3" />
                      Lv {env.unlockLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Flat Inline Control Hint */}
      <div className="flex justify-center">
        <p className="text-center text-xs font-medium tracking-wide text-slate-300/85">
          Click or Tap Meteors to Intercept · Keys 1–8 Abilities · P Pause · Enter to Launch
        </p>
      </div>
    </div>
  );
};
