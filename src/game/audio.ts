import { BubbleSize, BubbleType, GameSettings, PowerUpId, WeatherId } from './types';

class ArcadeAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientTimer: number | null = null;
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private settings: GameSettings | null = null;
  private currentWeather: WeatherId = 'clear';
  private chordStep = 0;

  public configure(settings: GameSettings): void {
    this.settings = settings;
    this.applyVolumes();
    if (!settings.musicEnabled) {
      this.stopAmbient();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain.connect(this.ctx.destination);
        this.applyVolumes();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.sfxGain || !this.musicGain || !this.settings) return;
    const master = this.settings.masterVolume;
    const sfxVol = this.settings.sfxEnabled ? this.settings.sfxVolume * master : 0;
    const musicVol = this.settings.musicEnabled ? this.settings.musicVolume * master : 0;
    const now = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(sfxVol, now, 0.04);
    this.musicGain.gain.setTargetAtTime(musicVol * 0.35, now, 0.08);
  }

  public unlock(): void {
    this.ensureContext();
  }

  public startAmbient(weather: WeatherId): void {
    this.currentWeather = weather;
    if (!this.settings?.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    if (this.ambientTimer === null) {
      this.playAmbientNote();
      this.ambientTimer = window.setInterval(() => {
        this.playAmbientNote();
      }, 2400);
    }
    this.updateWeatherBed(weather);
  }

  public stopAmbient(): void {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.rainNoiseNode) {
      try {
        this.rainNoiseNode.stop();
      } catch {
        // ignore
      }
      this.rainNoiseNode = null;
    }
  }

  public setWeather(weather: WeatherId): void {
    this.currentWeather = weather;
    this.updateWeatherBed(weather);
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    // Soft airy transition swell
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.5);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  private updateWeatherBed(weather: WeatherId): void {
    if (!this.ctx || !this.musicGain) return;
    const isRain = weather === 'rain' || weather === 'storm';
    if (isRain && !this.rainNoiseNode && this.settings?.musicEnabled) {
      try {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = weather === 'storm' ? 750 : 1200;
        filter.Q.value = 0.7;
        const gain = this.ctx.createGain();
        gain.gain.value = weather === 'storm' ? 0.14 : 0.08;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        noise.start();
        this.rainNoiseNode = noise;
        this.rainFilter = filter;
        this.rainGain = gain;
      } catch {
        // ignore
      }
    } else if (this.rainGain && this.rainFilter) {
      const now = this.ctx.currentTime;
      if (isRain) {
        this.rainFilter.frequency.setTargetAtTime(weather === 'storm' ? 750 : 1200, now, 0.3);
        this.rainGain.gain.setTargetAtTime(weather === 'storm' ? 0.14 : 0.08, now, 0.3);
      } else {
        this.rainGain.gain.setTargetAtTime(0.0001, now, 0.4);
      }
    }
  }

  private playAmbientNote(): void {
    if (!this.ctx || !this.musicGain || !this.settings?.musicEnabled) return;
    const scales: Record<WeatherId, number[]> = {
      clear: [261.63, 329.63, 392.0, 493.88, 523.25],
      golden_hour: [293.66, 349.23, 440.0, 523.25, 587.33],
      overcast: [246.94, 293.66, 369.99, 440.0, 493.88],
      rain: [220.0, 261.63, 329.63, 392.0, 440.0],
      storm: [196.0, 233.08, 293.66, 349.23, 392.0],
      night: [261.63, 311.13, 392.0, 466.16, 523.25],
      aurora: [293.66, 369.99, 440.0, 554.37, 659.25],
    };
    const notes = scales[this.currentWeather] ?? scales.clear;
    const freq = notes[this.chordStep % notes.length];
    this.chordStep++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 2.25);
  }

  public playPop(type: BubbleType, size: BubbleSize, combo: number, crackOnly = false): void {
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    if (crackOnly) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    const basePitch = size === 'small' ? 560 : size === 'medium' ? 420 : 290;
    const comboLift = Math.min(240, combo * 6);
    const jitter = 0.93 + Math.random() * 0.14;
    const startFreq = (basePitch + comboLift) * jitter;

    // Bubble liquid pop
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 0.72, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.48, now + 0.065);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.095);

    // Special harmonic overtone
    if (type === 'golden' || type === 'heart' || type === 'powerup') {
      const chime = ctx.createOscillator();
      const cg = ctx.createGain();
      chime.type = 'sine';
      const tone = type === 'golden' ? 880 : type === 'heart' ? 660 : 740;
      chime.frequency.setValueAtTime(tone, now + 0.01);
      chime.frequency.exponentialRampToValueAtTime(tone * 1.5, now + 0.16);
      cg.gain.setValueAtTime(0.14, now + 0.01);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      chime.connect(cg);
      cg.connect(this.sfxGain);
      chime.start(now + 0.01);
      chime.stop(now + 0.22);
    } else if (type === 'chain') {
      const zap = ctx.createOscillator();
      const zg = ctx.createGain();
      zap.type = 'sawtooth';
      zap.frequency.setValueAtTime(920, now);
      zap.frequency.exponentialRampToValueAtTime(340, now + 0.11);
      zg.gain.setValueAtTime(0.1, now);
      zg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      zap.connect(zg);
      zg.connect(this.sfxGain);
      zap.start(now);
      zap.stop(now + 0.13);
    }
  }

  public playComboMilestone(): void {
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playPowerUp(id: PowerUpId): void {
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    if (id === 'lightning' || id === 'burst') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(id === 'lightning' ? 680 : 380, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.28);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    }

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playDamage(shieldBlocked: boolean): void {
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    if (shieldBlocked) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.12);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.22);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    }

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playFanfare(kind: 'levelup' | 'achievement' | 'gameover'): void {
    if (!this.settings?.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const seq =
      kind === 'levelup'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'achievement'
          ? [587.33, 739.99, 880, 1174.66]
          : [392.0, 349.23, 293.66, 220.0];

    seq.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = kind === 'gameover' ? 'triangle' : 'sine';
      const t = now + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }
}

export const audioEngine = new ArcadeAudioEngine();
