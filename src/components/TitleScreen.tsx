import React from 'react';
import { ArrowLeft, Award, BarChart3, CheckCircle2, Clock, Play, RotateCcw, Settings } from 'lucide-react';
import { getTimeUntilDailyReset } from '../game/dailyChallenges';
import { getLevelFromXp } from '../game/progression';
import { DailyChallengesState, LifetimeStats, SavedActiveSession } from '../game/types';
import { TitleEmblemSvg } from './GameIcons';

interface TitleScreenProps {
  stats: LifetimeStats;
  unlockedCount: number;
  totalAchievements: number;
  savedSession: SavedActiveSession | null;
  dailyChallenges: DailyChallengesState | null;
  onStartNew: () => void;
  onResumeSaved: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onExitToPlatform?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  stats,
  unlockedCount,
  totalAchievements,
  savedSession,
  dailyChallenges,
  onStartNew,
  onResumeSaved,
  onOpenStats,
  onOpenAchievements,
  onOpenSettings,
  onExitToPlatform,
}) => {
  const levelInfo = getLevelFromXp(stats.totalXp);
  const resetCountdown = getTimeUntilDailyReset();

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between overflow-y-auto p-4 sm:p-8 pointer-events-none">
      {/* Top Bar: Platform Return + Level & High Score readout */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 pointer-events-auto">
          {onExitToPlatform && (
            <button
              type="button"
              onClick={onExitToPlatform}
              className="hud-panel inline-flex min-h-[42px] items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-900/90 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 self-start sm:self-stretch cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-300" />
              <span>Oddlot</span>
            </button>
          )}
          <div className="hud-panel rounded-2xl px-4 py-3 min-w-[180px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-sky-200/80">
                Level {levelInfo.level} · {levelInfo.title}
              </span>
              <span className="font-mono-num text-xs text-slate-300">
                {stats.totalXp.toLocaleString()} XP
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/12 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-300 transition-all duration-300"
                style={{ width: `${Math.round(levelInfo.progressRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hud-panel rounded-2xl px-4 py-3 text-right pointer-events-auto shrink-0">
          <div className="text-xs font-medium text-sky-200/80">Best Score</div>
          <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-white">
            {stats.highScore.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Center Focal Lockup + Daily Challenges */}
      <div className="mx-auto my-4 flex w-full max-w-3xl flex-col items-center text-center pointer-events-auto">
        <div className="mb-2 flex items-center justify-center">
          <TitleEmblemSvg className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_8px_24px_rgba(56,189,248,0.35)]" />
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white hud-text-shadow text-balance">
          SkyPop
        </h1>

        <p className="mt-2 max-w-md text-sm sm:text-base text-white/95 hud-text-shadow">
          Pop iridescent bubbles across shifting skies, chain high-speed combos, and weather the storm.
        </p>

        {/* Primary Action Cluster */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {savedSession ? (
            <>
              <button
                type="button"
                onClick={onResumeSaved}
                className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-sky-400 px-7 py-3 font-display text-base font-bold text-slate-950 shadow-lg shadow-sky-950/40 transition-transform duration-150 hover:bg-sky-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Resume Run ({savedSession.session.score.toLocaleString()})
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onStartNew}
                className="hud-panel inline-flex min-h-[48px] items-center gap-2 rounded-xl px-6 py-3 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-slate-900/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                New Game
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onStartNew}
              className="inline-flex min-h-[50px] items-center gap-2.5 rounded-xl bg-sky-400 px-9 py-3 font-display text-lg font-bold text-slate-950 shadow-xl shadow-sky-950/45 transition-transform duration-150 hover:bg-sky-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              Play Arcade
            </button>
          )}
        </div>

        {/* Secondary Progression & Preferences Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onOpenStats}
            className="hud-panel inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-900/90 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-sky-300" />
            Statistics
          </button>

          <button
            type="button"
            onClick={onOpenAchievements}
            className="hud-panel inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-900/90 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-300" />
            Achievements ({unlockedCount}/{totalAchievements})
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="hud-panel inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-900/90 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            Settings
          </button>
        </div>

        {/* Daily Challenges Panel */}
        {dailyChallenges && dailyChallenges.challenges.length > 0 && (
          <section
            aria-label="Daily Challenges"
            className="hud-panel mt-5 w-full rounded-2xl p-3.5 sm:p-4 text-left"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold tracking-tight text-white">
                  Daily Challenges
                </h2>
                <span className="text-xs text-slate-300 tabular-nums">
                  {Object.values(dailyChallenges.progressById).filter((p) => p.completed).length}/
                  {dailyChallenges.challenges.length} Done
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-sky-200/90 font-mono-num">
                <Clock className="w-3.5 h-3.5" />
                <span>Resets in {resetCountdown}</span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {dailyChallenges.challenges.map((ch) => {
                const prog = dailyChallenges.progressById[ch.id] ?? {
                  id: ch.id,
                  progress: 0,
                  completed: false,
                };
                const pct = Math.min(100, Math.round((prog.progress / ch.target) * 100));

                return (
                  <div
                    key={ch.id}
                    className={`rounded-xl border p-2.5 transition-colors ${
                      prog.completed
                        ? 'border-emerald-300/35 bg-emerald-400/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          {prog.completed && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          )}
                          <span className="truncate">{ch.title}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                          {ch.description}
                        </p>
                      </div>
                      <span className="font-mono-num text-[11px] font-semibold text-sky-300 shrink-0">
                        +{ch.xpReward} XP
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 tabular-nums">
                      <span>
                        {prog.completed
                          ? 'Completed'
                          : `${prog.progress.toLocaleString()} / ${ch.target.toLocaleString()}`}
                      </span>
                      <span className="font-mono-num">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prog.completed ? 'bg-emerald-300' : 'bg-sky-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Bottom Safe Margin: Flat, clean unboxed summary + controls hint */}
      <div className="relative flex flex-col items-center gap-1.5 text-center pt-2 shrink-0">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 via-slate-950/25 to-transparent -z-10"
        />
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-white hud-text-shadow tabular-nums">
          <span>{stats.totalBubblesPopped.toLocaleString()} Bubbles Popped</span>
          <span aria-hidden="true">·</span>
          <span>Best Streak {stats.highestCombo}x</span>
          <span aria-hidden="true">·</span>
          <span>{stats.gamesPlayed} Runs Played</span>
        </div>
        <div className="text-xs font-medium text-sky-50/95 hud-text-shadow">
          Click or Tap Bubbles · Keys 1–8 Power-Ups · P / Esc Pause
        </div>
      </div>
    </div>
  );
};
