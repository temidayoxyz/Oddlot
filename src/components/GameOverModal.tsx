import React from 'react';
import { Award, Home, RotateCcw, Trophy } from 'lucide-react';
import { getLevelFromXp } from '../game/progression';
import { EndOfRunSummary } from '../game/types';

interface GameOverModalProps {
  summary: EndOfRunSummary;
  totalLifetimeXp: number;
  onReplay: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  totalLifetimeXp,
  onReplay,
  onMainMenu,
}) => {
  const levelInfo = getLevelFromXp(totalLifetimeXp);
  const leveledUp = summary.levelAfter > summary.levelBefore;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/68 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="hud-modal w-full max-w-lg rounded-2xl p-6 text-white my-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="gameover-title" className="font-display text-3xl font-extrabold tracking-tight">
              Run Complete
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Tier {summary.difficultyLevel} reached · {Math.round(summary.elapsedSeconds)}s in the sky
            </p>
          </div>
          {summary.isNewRecord && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-300/40 px-3 py-1.5 text-xs font-bold text-amber-200 whitespace-nowrap">
              <Trophy className="w-3.5 h-3.5" />
              New Record
            </div>
          )}
        </div>

        {/* Score & XP Headline */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs font-medium text-slate-400">Final Score</div>
            <div
              data-testid="gameover-score"
              className="mt-1 font-display text-3xl font-extrabold tabular-nums text-white"
            >
              {summary.score.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-400 tabular-nums">
              Best: {Math.max(summary.score, summary.previousHighScore).toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs font-medium text-slate-400">XP Earned</div>
            <div className="mt-1 font-display text-3xl font-extrabold tabular-nums text-sky-300">
              +{summary.xpEarned.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              {leveledUp
                ? `Level Up! Lv ${summary.levelBefore} → Lv ${summary.levelAfter}`
                : `Level ${levelInfo.level} · ${levelInfo.title}`}
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold">
              Level {levelInfo.level} · {levelInfo.title}
            </span>
            <span className="font-mono-num">
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400 transition-all duration-300"
              style={{ width: `${Math.round(levelInfo.progressRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Run Breakdown Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-slate-400">Bubbles Popped</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums">
              {summary.bubblesPopped}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
              S {summary.smallPopped} · M {summary.mediumPopped} · L {summary.largePopped}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-slate-400">Best Combo</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-amber-300">
              {summary.maxCombo}x
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Consecutive</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-slate-400">Top Multiplier</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-sky-300">
              x{summary.bestMultiplier}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Peak Rate</div>
          </div>
        </div>

        {/* Completed Daily Challenges */}
        {summary.completedDailyChallenges.length > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
              <Award className="w-4 h-4" />
              Daily Challenges Completed
            </div>
            <ul className="mt-2 space-y-1.5">
              {summary.completedDailyChallenges.map((ch) => (
                <li key={ch.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">
                    {ch.title} · <span className="font-normal text-slate-300">{ch.description}</span>
                  </span>
                  <span className="font-mono-num text-xs text-emerald-200 shrink-0 ml-2">
                    +{ch.xpReward} XP
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Newly Unlocked Achievements */}
        {summary.newlyUnlockedAchievements.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
              <Award className="w-4 h-4" />
              Achievements Unlocked
            </div>
            <ul className="mt-2 space-y-1.5">
              {summary.newlyUnlockedAchievements.map((ach) => (
                <li key={ach.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{ach.title}</span>
                  <span className="font-mono-num text-xs text-amber-200">+{ach.xpReward} XP</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onReplay}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 font-display text-base font-bold text-slate-950 transition-colors hover:bg-sky-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-display text-base font-semibold text-white transition-colors hover:bg-white/15 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
