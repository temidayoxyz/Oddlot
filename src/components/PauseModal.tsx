import React from 'react';
import { ArrowLeft, Home, Play, RotateCcw, Volume2, VolumeX, Music } from 'lucide-react';
import { GameSettings } from '../game/types';

interface PauseModalProps {
  score: number;
  combo: number;
  bubblesPopped: number;
  settings: GameSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onExitToPlatform?: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  combo,
  bubblesPopped,
  settings,
  onResume,
  onRestart,
  onMainMenu,
  onExitToPlatform,
  onUpdateSettings,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="hud-modal w-full max-w-md rounded-2xl p-6 text-white">
        <h2 id="pause-title" className="font-display text-2xl font-bold tracking-tight">
          Game Paused
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Your current sky run is saved automatically.
        </p>

        {/* Current Run Summary Strip */}
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-white/5 p-3.5 border border-white/10">
          <div>
            <div className="text-xs text-slate-400">Score</div>
            <div className="font-display text-lg font-bold tabular-nums">
              {score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Popped</div>
            <div className="font-display text-lg font-bold tabular-nums">{bubblesPopped}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Streak</div>
            <div className="font-display text-lg font-bold tabular-nums">{combo}x</div>
          </div>
        </div>

        {/* Quick Sound Toggles */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ sfxEnabled: !settings.sfxEnabled })}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              settings.sfxEnabled
                ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                : 'border-white/15 bg-white/5 text-slate-400'
            }`}
          >
            {settings.sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            SFX {settings.sfxEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              settings.musicEnabled
                ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                : 'border-white/15 bg-white/5 text-slate-400'
            }`}
          >
            <Music className="w-4 h-4" />
            Music {settings.musicEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Primary Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 font-display text-base font-bold text-slate-950 transition-colors hover:bg-sky-300 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Game
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </button>
          </div>

          {onExitToPlatform && (
            <button
              type="button"
              onClick={onExitToPlatform}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Oddlot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
