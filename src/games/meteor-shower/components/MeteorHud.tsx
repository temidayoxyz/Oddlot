import React from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import { POWERUP_META, POWERUP_ORDER } from '../progression';
import { PowerUpId, PowerUpSlotState, SessionState } from '../types';
import { PowerUpSvgIcon } from './MeteorIcons';

export interface MeteorHudSnapshot {
  session: SessionState;
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  highScore: number;
}

interface MeteorHudProps {
  hud: MeteorHudSnapshot;
  muted: boolean;
  comboBarRef: React.RefObject<HTMLDivElement | null>;
  onToggleMute: () => void;
  onPause: () => void;
  onActivatePowerUp: (id: PowerUpId) => void;
}

export const MeteorHud: React.FC<MeteorHudProps> = ({
  hud,
  muted,
  comboBarRef,
  onToggleMute,
  onPause,
  onActivatePowerUp,
}) => {
  const { session, powerUps } = hud;
  const hpPct = Math.max(0, Math.min(100, (session.planetHp / session.maxPlanetHp) * 100));
  const criticalHp = hpPct <= 30;
  const shieldActive = powerUps.shield.activeRemaining > 0;
  const timeSlowActive = powerUps.time_dilation.activeRemaining > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Subtle critical hull screen border cue */}
      {criticalHp && (
        <div
          className="pointer-events-none fixed inset-0 border-4 border-rose-500/35"
          aria-hidden="true"
        />
      )}

      {/* Top Perimeter Clusters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          {/* Top-Left: Planetary Integrity */}
          <div className="min-w-[156px] rounded-xl border border-white/12 bg-[#060B18]/82 px-3.5 py-2.5 shadow-lg sm:min-w-[215px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Earth Integrity
              </span>
              <span
                className={`text-lg font-black tabular-nums leading-none ${
                  shieldActive
                    ? 'text-sky-300'
                    : criticalHp
                      ? 'text-rose-400'
                      : 'text-emerald-300'
                }`}
              >
                {Math.round(session.planetHp)}%
              </span>
            </div>
            <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  shieldActive
                    ? 'bg-sky-400'
                    : criticalHp
                      ? 'bg-rose-500'
                      : hpPct <= 60
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            {shieldActive && (
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300 tabular-nums">
                Shield Active · {powerUps.shield.activeRemaining.toFixed(1)}s
              </div>
            )}
          </div>

          {/* Top-Center: Wave & Phase Readout (Desktop) */}
          <div className="hidden flex-col items-center sm:flex">
            <div className="rounded-xl border border-white/12 bg-[#060B18]/82 px-4 py-2 text-center shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Wave <span className="tabular-nums text-white">{session.wave}</span> ·{' '}
                <span className="tabular-nums text-sky-300">
                  {Math.ceil(session.waveRemainingSeconds)}s
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-100">{session.waveLabel}</div>
            </div>

            {session.waveBannerTimer > 0 && (
              <div className="mt-2 rounded-lg border border-amber-400/35 bg-[#090F20]/90 px-4 py-1.5 text-center shadow-xl">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  {session.wavePhase === 'breathing'
                    ? `Wave ${session.wave} Cleared`
                    : `Wave ${session.wave} Incoming`}
                </div>
                <div className="text-sm font-bold text-white">{session.waveLabel}</div>
              </div>
            )}
          </div>

          {/* Top-Right: Score, Multiplier & Utility Controls */}
          <div className="flex items-start gap-2">
            <div className="rounded-xl border border-white/12 bg-[#060B18]/82 px-3.5 py-2 text-right shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Score
              </div>
              <div
                data-testid="hud-score"
                className="text-xl font-black tabular-nums leading-tight text-white sm:text-2xl"
              >
                {Math.round(session.score).toLocaleString()}
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-[11px] font-bold tabular-nums">
                <span className="text-amber-300">x{session.multiplier}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sky-300">{session.combo} streak</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  ref={comboBarRef}
                  className="h-full origin-left bg-amber-400"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
            </div>

            <div className="pointer-events-auto flex flex-col gap-1.5 sm:flex-row">
              <button
                type="button"
                tabIndex={-1}
                aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-[#060B18]/85 text-slate-200 transition hover:border-sky-400/50 hover:text-white"
              >
                {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Pause game (P)"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-[#060B18]/85 text-slate-200 transition hover:border-sky-400/50 hover:text-white"
              >
                <Pause className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Compact Wave Strip pinned near top so Earth remains unobstructed */}
        <div className="flex justify-center sm:hidden">
          <div className="rounded-lg border border-white/12 bg-[#060B18]/82 px-3 py-1 text-center text-[11px] font-semibold text-slate-100">
            <span className="font-bold uppercase tracking-wider text-amber-300 tabular-nums">
              Wave {session.wave}
            </span>{' '}
            · {session.waveLabel}{' '}
            <span className="tabular-nums text-sky-300">
              ({Math.ceil(session.waveRemainingSeconds)}s)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-Center Power-Up Dock */}
      <div className="flex flex-col items-center gap-1.5">
        {timeSlowActive && (
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300 tabular-nums">
            Time Dilation Active · {powerUps.time_dilation.activeRemaining.toFixed(1)}s
          </div>
        )}
        <div className="pointer-events-auto grid w-full max-w-[580px] grid-cols-8 gap-1 rounded-2xl border border-white/12 bg-[#060B18]/88 p-1.5 shadow-2xl sm:gap-2 sm:px-2.5">
          {POWERUP_ORDER.map((id) => {
            const meta = POWERUP_META[id];
            const slot = powerUps[id];
            const isActive = slot.activeRemaining > 0;
            const onCooldown = slot.cooldownRemaining > 0;
            const disabled = !slot.unlocked || slot.charges <= 0 || onCooldown;

            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                disabled={disabled}
                title={`${meta.name} [${meta.hotkey}] — ${meta.description}`}
                aria-label={`${meta.name}, key ${meta.hotkey}, ${
                  slot.unlocked ? `${slot.charges} charges` : `unlocks level ${meta.unlockLevel}`
                }`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onActivatePowerUp(id);
                }}
                className={`relative flex h-12 min-w-0 flex-col items-center justify-center rounded-xl border px-0.5 transition sm:h-14 sm:px-2 ${
                  isActive
                    ? 'border-sky-400 bg-sky-500/25 text-white'
                    : !slot.unlocked
                      ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
                      : disabled
                        ? 'cursor-not-allowed border-white/8 bg-white/[0.03] text-slate-500'
                        : 'border-white/15 bg-white/[0.06] text-slate-100 hover:border-sky-400/60 hover:bg-white/[0.11] active:scale-95'
                }`}
              >
                <span className="absolute left-1 top-0.5 text-[9px] font-bold tabular-nums text-slate-400 sm:left-1.5 sm:top-1">
                  {meta.hotkey}
                </span>
                {slot.unlocked && (
                  <span
                    className="absolute right-1 top-0.5 text-[9px] font-extrabold tabular-nums sm:right-1.5 sm:top-1 sm:text-[10px]"
                    style={{ color: slot.charges > 0 ? meta.accentColor : '#64748B' }}
                  >
                    {slot.charges}
                  </span>
                )}
                <div style={{ color: slot.unlocked && slot.charges > 0 ? meta.accentColor : undefined }}>
                  <PowerUpSvgIcon id={id} className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="mt-0.5 truncate text-[8px] font-semibold tracking-tight sm:text-[9px]">
                  {!slot.unlocked
                    ? `Lv${slot.unlockLevel}`
                    : isActive
                      ? `${slot.activeRemaining.toFixed(1)}s`
                      : onCooldown
                        ? `${Math.ceil(slot.cooldownRemaining)}s`
                        : meta.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
