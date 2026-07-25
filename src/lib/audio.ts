"use client";

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  constructor() {
    // Audio Context is initialized on demand after user gesture
  }

  init() {
    // Audio is silenced for now per cinematic transition design guidelines
    return;
  }

  startWind() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const ctx = this.ctx;
    
    // Create white noise buffer
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter to shape wind sound (lowpass filter)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 250; // Low hum
    filter.Q.value = 1.5;

    // Gain node to control volume
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2.0); // Smooth fade in

    // Connect nodes
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start();

    // Modulate filter frequency to simulate gusting wind
    let gustTime = ctx.currentTime;
    const modulateWind = () => {
      if (!this.ctx) return;
      // Randomly change lowpass frequency to create wind gusts
      const nextFreq = 120 + Math.random() * 280;
      const nextTime = gustTime + 1 + Math.random() * 2;
      filter.frequency.exponentialRampToValueAtTime(nextFreq, nextTime);
      
      // Randomly adjust gain slightly for gusts
      const nextVol = 0.08 + Math.random() * 0.08;
      gain.gain.linearRampToValueAtTime(nextVol, nextTime);
      
      gustTime = nextTime;
      // Schedule next gust change
      setTimeout(modulateWind, (nextTime - ctx.currentTime) * 1000);
    };

    modulateWind();

    this.windGain = gain;
    this.windNode = noiseSource; // Store node reference
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

    // 1. Sub Bass Thump (Deep impact shockwave)
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

    // 2. High Resonance Metal Ring (Sword Clang)
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.35, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5); // long ring
    ringGain.connect(ctx.destination);

    const metalFreqs = [380, 520, 840, 1200, 1650, 2100];
    metalFreqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const individualGain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.value = freq;
      
      // Add slight detune for metallic friction
      osc.detune.value = (Math.random() - 0.5) * 20;

      // Higher frequencies decay faster
      const decay = 2.5 / (index * 0.4 + 1);
      individualGain.gain.setValueAtTime(0.15, now);
      individualGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

      osc.connect(individualGain);
      individualGain.connect(ringGain);
      
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });

    // 3. Debris Blast (White noise explosion)
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
    osc.frequency.setValueAtTime(220, now); // A3 note
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.4); // slide up to A4
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
    
    // High double chime
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
