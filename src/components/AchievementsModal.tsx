import React from 'react';
import { Award, CheckCircle2, X } from 'lucide-react';
import { ACHIEVEMENT_DEFINITIONS, getAchievementMetricValue } from '../game/progression';
import { LifetimeStats, UnlockedAchievement } from '../game/types';

interface AchievementsModalProps {
  stats: LifetimeStats;
  unlocked: UnlockedAchievement[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  stats,
  unlocked,
  onClose,
}) => {
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
    >
      <div className="hud-modal w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl text-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-300" />
            <div>
              <h2 id="achievements-title" className="font-display text-2xl font-bold">
                Achievements
              </h2>
              <p className="text-xs text-slate-300">
                {unlocked.length} of {ACHIEVEMENT_DEFINITIONS.length} milestones unlocked
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievements"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const unlockedAt = unlockedMap.get(def.id);
            const isUnlocked = unlockedAt !== undefined;
            const currentVal = Math.min(def.target, getAchievementMetricValue(def.metric, stats));
            const pct = Math.round((currentVal / def.target) * 100);

            return (
              <div
                key={def.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isUnlocked
                    ? 'border-amber-300/35 bg-amber-400/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-display font-bold text-base">
                      {isUnlocked && <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />}
                      <span>{def.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{def.description}</p>
                  </div>
                  <span className="font-mono-num text-xs font-semibold text-sky-300 shrink-0">
                    +{def.xpReward} XP
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 tabular-nums">
                    <span>
                      {isUnlocked
                        ? `Unlocked ${new Date(unlockedAt).toLocaleDateString()}`
                        : `${currentVal.toLocaleString()} / ${def.target.toLocaleString()}`}
                    </span>
                    <span>{isUnlocked ? '100%' : `${pct}%`}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isUnlocked ? 'bg-amber-300' : 'bg-sky-400'
                      }`}
                      style={{ width: `${isUnlocked ? 100 : pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
