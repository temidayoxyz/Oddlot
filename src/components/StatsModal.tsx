import React from 'react';
import { X } from 'lucide-react';
import { getLevelFromXp, WEATHER_CONFIGS } from '../game/progression';
import { EndOfRunSummary, LifetimeStats, SessionCounters } from '../game/types';

interface StatsModalProps {
  stats: LifetimeStats;
  lastSession: SessionCounters | null;
  recentRuns: EndOfRunSummary[];
  unlockedCount: number;
  totalAchievements: number;
  onClose: () => void;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${secs}s`;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  stats,
  lastSession,
  recentRuns,
  unlockedCount,
  totalAchievements,
  onClose,
}) => {
  const levelInfo = getLevelFromXp(stats.totalXp);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
    >
      <div className="hud-modal w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl text-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 id="stats-title" className="font-display text-2xl font-bold">
              Pilot Profile & Statistics
            </h2>
            <p className="text-xs text-slate-300">
              Level {levelInfo.level} · {levelInfo.title} · {stats.totalXp.toLocaleString()} Lifetime XP
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close statistics"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Personal Bests */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300 mb-3">
              Personal Bests
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="text-xs text-slate-400">High Score</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {stats.highScore.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="text-xs text-slate-400">Highest Combo</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-300">
                  {stats.highestCombo}x
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="text-xs text-slate-400">Best Multiplier</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums text-sky-300">
                  x{stats.bestMultiplier}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                <div className="text-xs text-slate-400">Achievements</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {unlockedCount}/{totalAchievements}
                </div>
              </div>
            </div>
          </section>

          {/* Latest / Current Session Breakdown */}
          {lastSession && lastSession.bubblesPopped > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3">
                Most Recent Session
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-emerald-400/5 border border-emerald-300/20 p-3.5">
                <div>
                  <div className="text-xs text-slate-400">Session Score</div>
                  <div className="font-display text-lg font-bold tabular-nums">
                    {lastSession.score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Session Popped</div>
                  <div className="font-display text-lg font-bold tabular-nums">
                    {lastSession.bubblesPopped}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Session XP</div>
                  <div className="font-display text-lg font-bold tabular-nums text-sky-300">
                    +{lastSession.xpEarned}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Session Combo</div>
                  <div className="font-display text-lg font-bold tabular-nums">
                    {lastSession.maxCombo}x
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Lifetime Totals */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Lifetime Statistics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Total Popped</span>
                <span className="font-mono-num font-bold">{stats.totalBubblesPopped.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Small Bubbles</span>
                <span className="font-mono-num font-bold">{stats.smallBubblesPopped.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Medium Bubbles</span>
                <span className="font-mono-num font-bold">{stats.mediumBubblesPopped.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Large Bubbles</span>
                <span className="font-mono-num font-bold">{stats.largeBubblesPopped.toLocaleString()}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Games Played</span>
                <span className="font-mono-num font-bold">{stats.gamesPlayed}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Play Time</span>
                <span className="font-mono-num font-bold">{formatDuration(stats.totalPlaySeconds)}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Power-Ups Used</span>
                <span className="font-mono-num font-bold">{stats.powerUpsActivated}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Golden Popped</span>
                <span className="font-mono-num font-bold">{stats.goldenBubblesPopped}</span>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex justify-between items-baseline">
                <span className="text-slate-300">Weathers Seen</span>
                <span className="font-mono-num font-bold">{stats.weathersSeen.length}/7</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Skies Explored:{' '}
              {stats.weathersSeen.map((w) => WEATHER_CONFIGS[w].label).join(' · ')}
            </div>
          </section>

          {/* Recent Runs */}
          {recentRuns.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Recent Runs
              </h3>
              <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
                {recentRuns.slice(0, 5).map((run, idx) => (
                  <div
                    key={`${run.runId}_${idx}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold tabular-nums text-white">
                        {run.score.toLocaleString()} pts
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {run.bubblesPopped} popped · {run.maxCombo}x combo
                      </span>
                    </div>
                    <span className="font-mono-num text-xs text-sky-300">+{run.xpEarned} XP</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
