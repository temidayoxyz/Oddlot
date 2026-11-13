import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { GameSettings } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetAllData: () => Promise<void>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="hud-modal w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl text-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 id="settings-title" className="font-display text-2xl font-bold">
            Settings & Audio
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Audio Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">Sound Effects</div>
                <div className="text-xs text-slate-400">Bubble pops, combos, power-ups, alerts</div>
              </div>
              <input
                type="checkbox"
                checked={settings.sfxEnabled}
                onChange={(e) => onUpdateSettings({ sfxEnabled: e.target.checked })}
                className="h-5 w-5 accent-sky-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">Ambient Sky Music</div>
                <div className="text-xs text-slate-400">Adaptive chimes and weather soundscape</div>
              </div>
              <input
                type="checkbox"
                checked={settings.musicEnabled}
                onChange={(e) => onUpdateSettings({ musicEnabled: e.target.checked })}
                className="h-5 w-5 accent-sky-400 cursor-pointer"
              />
            </label>
          </div>

          {/* Volume Sliders */}
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="block">
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Master Volume</span>
                <span className="font-mono-num">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.masterVolume * 100)}
                onChange={(e) =>
                  onUpdateSettings({ masterVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>SFX Volume</span>
                <span className="font-mono-num">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) =>
                  onUpdateSettings({ sfxVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>Music Volume</span>
                <span className="font-mono-num">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) =>
                  onUpdateSettings({ musicVolume: Number(e.target.value) / 100 })
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </label>
          </div>

          {/* Visual & Motion Preferences */}
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">Screen Shake</div>
                <div className="text-xs text-slate-400">Impact feedback on bursts and storm hits</div>
              </div>
              <input
                type="checkbox"
                checked={settings.screenShake}
                onChange={(e) => onUpdateSettings({ screenShake: e.target.checked })}
                className="h-5 w-5 accent-sky-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">Reduced Motion</div>
                <div className="text-xs text-slate-400">Softens cloud drift, stars, and camera shake</div>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                className="h-5 w-5 accent-sky-400 cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Weather Effects</div>
                <div className="text-xs text-slate-400">Rain streaks and storm flash intensity</div>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-900/80 p-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ weatherEffectsIntensity: 'full' })}
                  className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    settings.weatherEffectsIntensity === 'full'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ weatherEffectsIntensity: 'subtle' })}
                  className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                    settings.weatherEffectsIntensity === 'subtle'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Subtle
                </button>
              </div>
            </div>
          </div>

          {/* Local Data Reset */}
          <div className="border-t border-white/10 pt-4">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Reset Local Progress
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/40 bg-rose-500/15 p-3.5">
                <span className="text-xs text-rose-100">
                  Erase all scores, XP, stats, and achievements?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetAllData();
                      setConfirmReset(false);
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
