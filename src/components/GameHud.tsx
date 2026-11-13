import React from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import {
  getLevelFromXp,
  POWERUP_META,
  POWERUP_ORDER,
  WEATHER_CONFIGS,
} from '../game/progression';
import { PowerUpId, PowerUpSlotState, SessionCounters, WeatherId } from '../game/types';
import { PowerUpIcon, StabilityHeartIcon, WeatherBadgeIcon } from './GameIcons';

export interface HudSnapshot {
  session: SessionCounters;
  weather: WeatherId;
  powerUps: Record<PowerUpId, PowerUpSlotState>;
  totalLifetimeXpBeforeRun: number;
  highScore: number;
}

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  comboBarRef: React.RefObject<HTMLDivElement | null>;
  onToggleMute: () => void;
  onPause: () => void;
  onActivatePowerUp: (id: PowerUpId) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  comboBarRef,
  onToggleMute,
  onPause,
  onActivatePowerUp,
}) => {
  const { session, weather, powerUps, totalLifetimeXpBeforeRun } = hud;
  const weatherCfg = WEATHER_CONFIGS[weather];
  const shieldActive = powerUps.shield.activeRemaining > 0;
  const levelInfo = getLevelFromXp(totalLifetimeXpBeforeRun + session.xpEarned);
  const comboRatio =
    session.combo > 0 && session.comboMaxTime > 0
      ? Math.max(0, Math.min(1, session.comboTimer / session.comboMaxTime))
      : 0;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Clusters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          {/* Top-Left: Score, Multiplier, Combo & Level */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="hud-panel rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5">
              <div className="flex items-baseline gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-200/80">
                    Score
                  </div>
                  <div
                    data-testid="hud-score"
                    className="font-display text-2xl sm:text-3xl font-extrabold leading-none tabular-nums text-white"
                  >
                    {Math.round(session.score).toLocaleString()}
                  </div>
                </div>

                <div className="pl-2 border-l border-white/15">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/85">
                    Multi
                  </div>
                  <div
                    data-testid="hud-multiplier"
                    className={`font-display text-xl sm:text-2xl font-extrabold leading-none tabular-nums ${
                      session.multiplier >= 4
                        ? 'text-amber-300'
                        : session.multiplier > 1
                          ? 'text-sky-300'
                          : 'text-slate-200'
                    }`}
                  >
                    x{session.multiplier}
                  </div>
                </div>
              </div>

              {/* Combo streak & decay bar */}
              <div className="mt-1.5 flex items-center justify-between gap-3 text-xs whitespace-nowrap">
                <span className="font-medium text-slate-200 tabular-nums">
                  {session.combo > 0 ? `${session.combo} Streak` : 'No streak'}
                </span>
                <span className="font-mono-num text-[11px] text-sky-200/80">
                  Lv {levelInfo.level} · +{session.xpEarned} XP
                </span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-white/12 overflow-hidden">
                <div
                  ref={comboBarRef}
                  className="h-full rounded-full bg-amber-300 origin-left"
                  style={{ transform: `scaleX(${comboRatio})` }}
                />
              </div>
            </div>
          </div>

          {/* Top-Center (Desktop): Stability Sockets & Weather Phase */}
          <div className="hidden md:flex flex-col items-center gap-1.5">
            <div className="hud-panel rounded-xl px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-1" aria-label={`Stability ${session.stability} of ${session.maxStability}`}>
                {Array.from({ length: session.maxStability }, (_, i) => (
                  <StabilityHeartIcon
                    key={i}
                    filled={i < session.stability}
                    shielded={shieldActive}
                  />
                ))}
              </div>
              <div className="h-4 w-px bg-white/15" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100 whitespace-nowrap">
                <WeatherBadgeIcon weather={weather} className="w-4 h-4 text-sky-300" />
                <span>{weatherCfg.label}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono-num text-sky-200">Tier {session.difficultyLevel}</span>
              </div>
            </div>
          </div>

          {/* Top-Right: Utility Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
              title={muted ? 'Unmute (M)' : 'Mute (M)'}
              className="hud-panel flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-slate-800/90 active:scale-95 cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5 text-rose-300" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause game (P)"
              title="Pause (P)"
              className="hud-panel flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-slate-800/90 active:scale-95 cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Stability & Weather Strip */}
        <div className="flex md:hidden justify-center">
          <div className="hud-panel rounded-xl px-3 py-1.5 flex items-center gap-2.5">
            <div className="flex items-center gap-0.5" aria-label={`Stability ${session.stability} of ${session.maxStability}`}>
              {Array.from({ length: session.maxStability }, (_, i) => (
                <StabilityHeartIcon
                  key={i}
                  filled={i < session.stability}
                  shielded={shieldActive}
                />
              ))}
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-100 whitespace-nowrap">
              <WeatherBadgeIcon weather={weather} className="w-3.5 h-3.5 text-sky-300" />
              <span>{weatherCfg.label}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono-num text-sky-200">T{session.difficultyLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter: Power-Up Dock */}
      <div className="flex flex-col items-center gap-1.5">

        <div
          className="hud-panel pointer-events-auto grid grid-cols-4 sm:grid-cols-8 gap-1.5 rounded-2xl p-1.5 sm:p-2"
          role="toolbar"
          aria-label="Power-ups"
        >
          {POWERUP_ORDER.map((id) => {
            const slot = powerUps[id];
            const meta = POWERUP_META[id];
            const isActive = slot.activeRemaining > 0;
            const onCooldown = slot.cooldownRemaining > 0;
            const ready = slot.charges > 0 && !onCooldown;

            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                disabled={!ready}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onActivatePowerUp(id);
                }}
                aria-label={`${meta.name} (${slot.charges} charges, key ${meta.keyHint})`}
                title={`${meta.name} [${meta.keyHint}]: ${meta.description}`}
                className={`relative flex h-12 w-14 sm:h-13 sm:w-14 flex-col items-center justify-center rounded-xl border transition-all duration-150 ${
                  isActive
                    ? 'border-sky-300 bg-sky-400/25 text-white'
                    : ready
                      ? 'border-white/25 bg-white/10 text-white hover:bg-white/20 active:scale-95 cursor-pointer'
                      : 'border-white/10 bg-slate-950/45 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  className="absolute top-1 left-1.5 font-mono-num text-[9px] text-slate-300/80"
                  aria-hidden="true"
                >
                  {meta.keyHint}
                </span>
                <span
                  className="absolute top-1 right-1.5 font-mono-num text-[10px] font-bold"
                  style={{ color: slot.charges > 0 ? meta.accentColor : 'rgba(148,163,184,0.6)' }}
                >
                  {slot.charges}
                </span>
                <PowerUpIcon id={id} className="w-4 h-4 mt-1" />
                <span className="mt-0.5 text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap">
                  {isActive ? `${slot.activeRemaining.toFixed(1)}s` : onCooldown ? `${Math.ceil(slot.cooldownRemaining)}s` : meta.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
