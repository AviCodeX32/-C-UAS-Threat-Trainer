class TacticalAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted: boolean = false;

  // Persistent nodes for continuous hums
  private rotorOsc1: OscillatorNode | null = null;
  private rotorOsc2: OscillatorNode | null = null;
  private rotorGain: GainNode | null = null;

  private jammerNoiseNode: AudioBufferSourceNode | null = null;
  private jammerGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Procedural Radar Sweep Ping
   */
  public playRadarPing() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {}
  }

  /**
   * Procedural Kinetic Fire Burst (5 rounds rapid gunfire)
   */
  public playKineticBurst() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const roundCount = 5;
    const interval = 0.07; // 70ms between shots

    for (let i = 0; i < roundCount; i++) {
      const shotTime = this.ctx.currentTime + i * interval;

      // Low impact punch
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(140, shotTime);
      punchOsc.frequency.exponentialRampToValueAtTime(30, shotTime + 0.05);

      punchGain.gain.setValueAtTime(0.35, shotTime);
      punchGain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.06);

      punchOsc.connect(punchGain);
      punchGain.connect(this.masterGain);
      punchOsc.start(shotTime);
      punchOsc.stop(shotTime + 0.07);

      // Noise crack
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, shotTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, shotTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(shotTime);
      noise.stop(shotTime + 0.06);
    }
  }

  /**
   * Continuous Doppler Drone Rotor Hum (modulated by distance & speed)
   */
  public updateRotorHum(closestDistance: number, maxSpeed: number, hasActiveDrones: boolean) {
    if (this.isMuted || !hasActiveDrones) {
      if (this.rotorGain && this.ctx) {
        this.rotorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.rotorOsc1) {
      this.rotorOsc1 = this.ctx.createOscillator();
      this.rotorOsc2 = this.ctx.createOscillator();
      this.rotorGain = this.ctx.createGain();

      this.rotorOsc1.type = 'sawtooth';
      this.rotorOsc2.type = 'square';

      this.rotorGain.gain.setValueAtTime(0, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.rotorOsc1.connect(filter);
      this.rotorOsc2.connect(filter);
      filter.connect(this.rotorGain);
      this.rotorGain.connect(this.masterGain);

      this.rotorOsc1.start();
      this.rotorOsc2.start();
    }

    // Distance attenuation and Doppler pitch shift
    const normDist = Math.max(0, Math.min(1, closestDistance / 2000));
    const targetFreq = 110 + (1 - normDist) * 70 + (maxSpeed * 1.5);
    const targetVolume = (1 - normDist) * 0.18;

    if (this.rotorOsc1 && this.rotorOsc2 && this.rotorGain && this.ctx) {
      this.rotorOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      this.rotorOsc2.frequency.setTargetAtTime(targetFreq * 1.5, this.ctx.currentTime, 0.1);
      this.rotorGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Continuous Jammer Static / RF Emission Hum
   */
  public updateJammerNoise(active: boolean, wideband: boolean) {
    if (this.isMuted || !active) {
      if (this.jammerGain && this.ctx) {
        this.jammerGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.jammerGain) {
      this.jammerGain = this.ctx.createGain();
      this.jammerGain.gain.setValueAtTime(0, this.ctx.currentTime);

      // Procedural white noise loop
      const bufferLength = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferLength, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.jammerNoiseNode = this.ctx.createBufferSource();
      this.jammerNoiseNode.buffer = noiseBuffer;
      this.jammerNoiseNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.jammerNoiseNode.connect(filter);
      filter.connect(this.jammerGain);
      this.jammerGain.connect(this.masterGain);

      this.jammerNoiseNode.start();
    }

    const volume = wideband ? 0.35 : 0.22;
    this.jammerGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  /**
   * Take Cover Bunker Klaxon Alarm
   */
  public updateTakeCoverSiren(active: boolean) {
    if (this.isMuted || !active) {
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);

      this.sirenOsc.start();
    }

    // Oscillating two-tone siren
    const period = 0.8;
    const t = this.ctx.currentTime % period;
    const freq = t < period / 2 ? 880 : 660;

    if (this.sirenOsc && this.sirenGain && this.ctx) {
      this.sirenOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      this.sirenGain.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Target Acquisition Chime
   */
  public playTargetLocked() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {}
  }

  /**
   * Overheat Emergency Beep
   */
  public playOverheatAlarm() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {}
  }
}

export const audioEngine = new TacticalAudioEngine();
