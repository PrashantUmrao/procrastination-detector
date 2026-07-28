"use client";

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  // Ambient sound properties
  private ambientNode: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientTimer: NodeJS.Timeout | null = null;
  private currentAmbientSound: string | null = null;

  constructor() {
    // Audio Context is initialized on demand after user gesture
  }

  init() {
    if (this.ctx) return;
    try {
      const WebkitAudioContext = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new (window.AudioContext || WebkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API not supported:", e);
    }
  }

  private createAmbientBuffer(sound: string): AudioBuffer | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;

    if (sound === "white") {
      const bufferSize = 2 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    if (sound === "brown") {
      const bufferSize = 5 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // 1st order filter approximation of brown noise (1/f^2)
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // boost volume
      }
      return buffer;
    }

    if (sound === "rain") {
      const bufferSize = 5 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pinkish/brownish filter
        const val = (lastOut + 0.12 * white) / 1.12;
        lastOut = val;
        data[i] = val * 1.5;

        // Random raindrop impact crackles
        if (Math.random() < 0.0003) {
          const spikeAmp = Math.random() * 0.4 + 0.1;
          for (let j = 0; j < 60 && i + j < bufferSize; j++) {
            data[i + j] += spikeAmp * Math.exp(-j / 15) * (Math.random() * 2 - 1);
          }
        }
      }
      return buffer;
    }

    if (sound === "fireplace") {
      const bufferSize = 5 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Deep low frequency rumble (flame roar)
        const val = (lastOut + 0.015 * white) / 1.015;
        lastOut = val;
        
        // Modulate amplitude slowly for the rising/falling flame sound
        const mod = 0.75 + 0.25 * Math.sin(2 * Math.PI * i / (sampleRate * 2.5));
        data[i] = val * mod * 4.0;

        // Wood pops and snaps
        if (Math.random() < 0.00015) {
          const snapAmp = Math.random() * 0.8 + 0.2;
          for (let j = 0; j < 100 && i + j < bufferSize; j++) {
            data[i + j] += snapAmp * Math.exp(-j / 10) * (Math.random() * 2 - 1);
          }
        }
      }
      return buffer;
    }

    if (sound === "forest") {
      const bufferSize = 5 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const val = (lastOut + 0.04 * white) / 1.04;
        lastOut = val;
        data[i] = val * 0.8;
      }
      return buffer;
    }

    if (sound === "cafe") {
      const bufferSize = 6 * sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const val = (lastOut + 0.18 * white) / 1.18;
        lastOut = val;
        data[i] = val * 0.5;
      }
      return buffer;
    }

    return null;
  }

  private scheduleOverlays(sound: string) {
    if (!this.ctx || !this.ambientGain) return;
    
    const playNext = () => {
      if (!this.ctx || this.currentAmbientSound !== sound) return;

      const now = this.ctx.currentTime;
      
      if (sound === "forest") {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = "sine";

        const startFreq = 2000 + Math.random() * 1000;
        const endFreq = 1200 + Math.random() * 500;
        const duration = 0.12 + Math.random() * 0.15;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gainNode.gain.setValueAtTime(0, now);
        const maxVol = 0.02 * (this.ambientGain ? this.ambientGain.gain.value : 0.5);
        gainNode.gain.linearRampToValueAtTime(maxVol, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.05);

        const nextTime = 4000 + Math.random() * 8000;
        this.ambientTimer = setTimeout(playNext, nextTime);
      } else if (sound === "cafe") {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = "sine";

        const freq = 1600 + Math.random() * 1400;
        const duration = 0.04 + Math.random() * 0.06;

        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        const maxVol = 0.015 * (this.ambientGain ? this.ambientGain.gain.value : 0.5);
        gainNode.gain.linearRampToValueAtTime(maxVol, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.05);

        const nextTime = 2000 + Math.random() * 6000;
        this.ambientTimer = setTimeout(playNext, nextTime);
      }
    };

    const initialDelay = 1000 + Math.random() * 4000;
    this.ambientTimer = setTimeout(playNext, initialDelay);
  }

  startAmbient(sound: string, volume: number) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.stopAmbient();

    const buffer = this.createAmbientBuffer(sound);
    if (!buffer) return;

    this.currentAmbientSound = sound;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    let lastNode: AudioNode = source;
    if (sound === "cafe" || sound === "brown") {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = sound === "cafe" ? 2200 : 800;
      source.connect(filter);
      lastNode = filter;
    } else if (sound === "rain") {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1600;
      source.connect(filter);
      lastNode = filter;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    
    lastNode.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(0);

    this.ambientNode = source;
    this.ambientGain = gain;

    if (sound === "forest" || sound === "cafe") {
      this.scheduleOverlays(sound);
    }
  }

  stopAmbient() {
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }

    if (this.ambientNode) {
      try {
        this.ambientNode.stop();
      } catch {}
      this.ambientNode = null;
    }
    this.ambientGain = null;
    this.currentAmbientSound = null;
  }

  setAmbientVolume(volume: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  startWind() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const ctx = this.ctx;
    
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 250;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2.0);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start();

    let gustTime = ctx.currentTime;
    const modulateWind = () => {
      if (!this.ctx) return;
      const nextFreq = 120 + Math.random() * 280;
      const nextTime = gustTime + 1 + Math.random() * 2;
      filter.frequency.exponentialRampToValueAtTime(nextFreq, nextTime);
      
      const nextVol = 0.08 + Math.random() * 0.08;
      gain.gain.linearRampToValueAtTime(nextVol, nextTime);
      
      gustTime = nextTime;
      setTimeout(modulateWind, (nextTime - ctx.currentTime) * 1000);
    };

    modulateWind();

    this.windGain = gain;
    this.windNode = noiseSource;
  }

  stopWind(fadeOutDuration = 1.5) {
    if (this.windGain && this.ctx) {
      this.windGain.gain.setValueAtTime(this.windGain.gain.value, this.ctx.currentTime);
      this.windGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + fadeOutDuration);
      setTimeout(() => {
        try {
          if (this.windNode) {
            this.windNode.stop();
          }
        } catch {}
      }, fadeOutDuration * 1000);
    }
  }

  playImpact() {
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(10, now + 0.4);
    
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.35, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    ringGain.connect(ctx.destination);

    const metalFreqs = [380, 520, 840, 1200, 1650, 2100];
    metalFreqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const individualGain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 20;

      const decay = 2.5 / (index * 0.4 + 1);
      individualGain.gain.setValueAtTime(0.15, now);
      individualGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

      osc.connect(individualGain);
      individualGain.connect(ringGain);
      
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });

    const bufferSize = 1 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 0.8);
    noiseFilter.Q.value = 1.0;

    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.6, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(blastGain);
    blastGain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.8);
  }

  playFocusStart() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playFocusEnd() {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  }
}

export const audioSynthesizer = new AudioSynthesizer();
