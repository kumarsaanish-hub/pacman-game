/** AudioManager: synthesized sound effects via Web Audio API */
export class AudioManager {
  private ctx: AudioContext | null = null;
  enabled: boolean = false;

  constructor() {
    try {
      this.ctx = new AudioContext();
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  /** Short high-pitched beep — dot collected */
  playChomp(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      this._playTone(440, 440, 0.05, 0.08);
    } catch {
      this.enabled = false;
    }
  }

  /** Rising sweep — power pellet collected */
  playPowerPellet(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      this._playTone(300, 600, 0.2, 0.15);
    } catch {
      this.enabled = false;
    }
  }

  /** Descending sweep — Pac-Man death */
  playDeath(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      this._playTone(400, 100, 0.5, 0.2);
    } catch {
      this.enabled = false;
    }
  }

  /** Quick ascending blip — ghost eaten */
  playEatGhost(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      this._playTone(200, 800, 0.1, 0.12);
    } catch {
      this.enabled = false;
    }
  }

  /**
   * Play a tone that sweeps from startFreq to endFreq over durationSec.
   * Uses an OscillatorNode + GainNode for synthesis.
   */
  private _playTone(
    startFreq: number,
    endFreq: number,
    durationSec: number,
    volume: number
  ): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + durationSec);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0, now + durationSec);

    osc.start(now);
    osc.stop(now + durationSec);
  }
}
