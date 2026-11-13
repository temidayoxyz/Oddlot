import { CosmicEnvironmentId, GameSettings, MeteorType, PowerUpId } from './types';

class MeteorAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ambientOscA: OscillatorNode | null = null;
  private ambientOscB: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientRunning = false;

  private sfxEnabled = true;
  private musicEnabled = true;
  private masterVolume = 0.85;
  private sfxVolume = 0.9;
  private musicVolume = 0.42;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.applyVolumes();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  configure(settings: GameSettings): void {
    this.sfxEnabled = settings.sfxEnabled;
    this.musicEnabled = settings.musicEnabled;
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.musicVolume = settings.musicVolume;
    this.applyVolumes();

    if (!this.musicEnabled && this.ambientRunning) {
      this.stopAmbient();
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, now, 0.08);
  }

  startAmbient(env: CosmicEnvironmentId): void {
    if (!this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    if (this.ambientRunning) {
      this.setEnvironment(env);
      return;
    }

    const baseFreq = this.getAmbientFrequency(env);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = baseFreq;

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = baseFreq * 1.5;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.09;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(padGain);
    padGain.connect(this.musicGain);

    oscA.start();
    oscB.start();

    this.ambientOscA = oscA;
    this.ambientOscB = oscB;
    this.ambientFilter = filter;
    this.ambientRunning = true;
  }

  setEnvironment(env: CosmicEnvironmentId): void {
    if (!this.ctx || !this.ambientRunning || !this.ambientOscA || !this.ambientOscB) return;
    const freq = this.getAmbientFrequency(env);
    const now = this.ctx.currentTime;
    this.ambientOscA.frequency.setTargetAtTime(freq, now, 0.6);
    this.ambientOscB.frequency.setTargetAtTime(freq * 1.5, now, 0.6);
    if (this.ambientFilter) {
      this.ambientFilter.frequency.setTargetAtTime(
        env === 'cosmic_storm' ? 460 : env === 'nebula' ? 390 : 310,
        now,
        0.5
      );
    }
  }

  stopAmbient(): void {
    if (!this.ambientRunning) return;
    try {
      this.ambientOscA?.stop();
      this.ambientOscB?.stop();
      this.ambientOscA?.disconnect();
      this.ambientOscB?.disconnect();
      this.ambientFilter?.disconnect();
    } catch {
      // ignore already stopped
    }
    this.ambientOscA = null;
    this.ambientOscB = null;
    this.ambientFilter = null;
    this.ambientRunning = false;
  }

  private getAmbientFrequency(env: CosmicEnvironmentId): number {
    switch (env) {
      case 'solar_system':
        return 73.42; // D2
      case 'nebula':
        return 69.3; // C#2
      case 'cosmic_storm':
        return 61.74; // B1
      case 'distant_galaxy':
        return 82.41; // E2
      case 'deep_space':
      default:
        return 65.41; // C2
    }
  }

  playMeteorHit(type: MeteorType, destroyed: boolean, combo: number): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const pitchBoost = 1 + Math.min(18, combo) * 0.018;

    if (!destroyed) {
      // Armored metallic clang or heavy rock thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'armored' ? 'triangle' : 'sawtooth';
      const f0 = type === 'armored' ? 540 : 210;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.45, now + 0.11);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    // Crisp debris noise burst
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(
        type === 'explosive' ? 320 : type === 'heavy' ? 480 : 920 * pitchBoost,
        now
      );
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(type === 'explosive' ? 0.28 : 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'explosive' ? 0.34 : 0.18));
      src.connect(filter).connect(gain).connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.35);
    }

    // Tonal body punch or cosmic harmonic chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === 'cosmic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660 * pitchBoost, now);
      osc.frequency.exponentialRampToValueAtTime(1320 * pitchBoost, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    } else {
      osc.type = 'triangle';
      const base = type === 'heavy' || type === 'armored' ? 140 : 240;
      osc.frequency.setValueAtTime(base * pitchBoost, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.19);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playSplit(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playExplosion(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.42);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playPowerUp(id: PowerUpId): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes: Record<PowerUpId, number[]> = {
      shield: [330, 495, 660],
      laser: [580, 880],
      time_dilation: [520, 390, 260],
      cosmic_blast: [220, 440, 110],
      gravity_field: [260, 320, 410],
      meteor_magnet: [440, 660, 880],
      repair_pulse: [392, 494, 587, 784],
      solar_flare: [300, 500, 760, 1020],
    };
    const seq = notes[id] ?? [440, 660];
    seq.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = id === 'time_dilation' ? 'sine' : 'triangle';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  playPlanetImpact(shieldBlocked: boolean): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (shieldBlocked) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.16);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    }
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playWaveTransition(phase: 'active' | 'breathing', perfectClear: boolean): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const seq =
      phase === 'breathing'
        ? perfectClear
          ? [523.25, 659.25, 783.99, 1046.5]
          : [440, 554.37, 659.25]
        : [330, 440, 587.33];
    seq.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playComboMilestone(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.05;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  playFanfare(kind: 'achievement' | 'levelup' | 'gameover'): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const seq =
      kind === 'levelup'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : kind === 'achievement'
          ? [587.33, 783.99, 987.77]
          : [293.66, 261.63, 220, 174.61];
    seq.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'gameover' ? 'triangle' : 'sine';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }
}

export const meteorAudio = new MeteorAudioEngine();
