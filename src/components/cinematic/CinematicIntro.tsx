"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface CinematicIntroProps {
  onComplete: () => void;
}

interface ExtendedAudioContext extends AudioContext {
  masterGain?: GainNode;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  
  // Sword refs
  const swordImgRef = useRef<HTMLDivElement | null>(null);
  const swordLightRef = useRef<HTMLDivElement | null>(null);
  const swordShimmerRef = useRef<HTMLDivElement | null>(null);
  
  // Text refs
  const taglineRef = useRef<HTMLHeadingElement | null>(null);
  const taglineLightRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<HTMLHeadingElement | null>(null);
  const signatureLightRef = useRef<HTMLDivElement | null>(null);

  
  // Audio Web Synth refs
  const audioCtxRef = useRef<ExtendedAudioContext | null>(null);

  // GSAP animation values
  const animationState = useRef({
    taglineReveal: 0,     // 0 to 1
    swordReveal: 0,       // 0 to 1
    signatureReveal: 0,   // 0 to 1
  });


  // Clean up Audio Context on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Web Audio Synth functions
  const initAudio = () => {
    if (audioCtxRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass() as ExtendedAudioContext;
      audioCtxRef.current = ctx;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // 1. Deep Ambient Drone
      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.06, ctx.currentTime);
      
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(110, ctx.currentTime); // A2 note
      
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(100, ctx.currentTime);

      osc1.connect(lowpass);
      osc2.connect(lowpass);
      lowpass.connect(droneGain);
      droneGain.connect(masterGain);

      // 2. Subtle Wind Noise
      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.015, ctx.currentTime);

      const bufferSize = ctx.sampleRate * 4; // 4 seconds of noise
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(380, ctx.currentTime);
      bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

      noiseSource.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(masterGain);

      osc1.start();
      osc2.start();
      noiseSource.start();

      // Wind filter modulation
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.25, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(120, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();

      ctx.masterGain = masterGain;

      if (ctx.state === "suspended") {
        ctx.resume();
      }
      fadeSoundIn();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked: ", e);
    }
  };

  function fadeSoundIn() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const master = ctx.masterGain;
    if (master) {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.8);
    }
  }

  function fadeSoundOut() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const master = ctx.masterGain;
    if (master) {
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }
  }

  const playBladeShimmerSound = () => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    const frequencies = [600, 850, 1200, 1600, 2200, 2800];
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1100, now);
    
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 1.4);
    });
    
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
  };

  const playChimeSound = () => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2300, now);
    
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(3450, now);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 1.0);
    osc2.start(now);
    osc2.stop(now + 1.0);
  };

  // Particles & Vignette Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Floating Dust Particles
    const dustCount = 35;
    const dustParticles: Array<{
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      opacity: number;
      phase: number;
      freq: number;
    }> = [];
    
    for (let i = 0; i < dustCount; i++) {
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 0.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.06,
        vy: -0.04 - Math.random() * 0.06,
        opacity: Math.random() * 0.12 + 0.04,
        phase: Math.random() * Math.PI * 2,
        freq: 0.001 + Math.random() * 0.002,
      });
    }

    // Twinkling stars
    const starCount = 20;
    const starParticles: Array<{
      x: number;
      y: number;
      size: number;
      maxOpacity: number;
      speed: number;
      phase: number;
    }> = [];
    
    for (let i = 0; i < starCount; i++) {
      starParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 0.6 + 0.2,
        maxOpacity: Math.random() * 0.20 + 0.04,
        speed: 0.012 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let frameId: number;
    const loop = () => {

      ctx.clearRect(0, 0, width, height);

      // Vignette
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        Math.sqrt((width / 2) ** 2 + (height / 2) ** 2)
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.45)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.95)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Twinkling Stars
      starParticles.forEach((star) => {
        star.phase += star.speed;
        const currentOpacity = star.maxOpacity * (0.3 + 0.7 * Math.sin(star.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Floating Dust
      dustParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.freq;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const alpha = p.opacity * (0.85 + 0.15 * Math.sin(p.phase * 15));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      frameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // GSAP 3.0-second Timeline Animation
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (audioCtxRef.current) {
          fadeSoundOut();
        }
        onComplete();
      }
    });

    // Slow, cinematic zoom (scale from 1.0 to 1.01 over the timeline)
    tl.fromTo(contentWrapperRef.current,
      { scale: 1.0 },
      { scale: 1.01, duration: 2.8, ease: "sine.out" },
      0.0
    );

    // Set initial states (scanning lights transparent)
    gsap.set([taglineLightRef.current, swordLightRef.current, signatureLightRef.current], { opacity: 0 });

    // SCENE 1: Pure black (0.0s - 0.3s) - handled by timeline delay
    tl.to({}, { duration: 0.3 });

    // SCENE 2: Tagline Reveal (0.3s -> 1.0s)
    // 1. Fade in tagline scanning light
    tl.fromTo(taglineLightRef.current,
      { opacity: 0, left: "-5%" },
      { opacity: 1, left: "0%", duration: 0.08, ease: "power1.out" },
      0.3
    );
    // 2. Scan the tagline mask and light line
    tl.fromTo(animationState.current,
      { taglineReveal: 0 },
      {
        taglineReveal: 1,
        duration: 0.58,
        ease: "power2.inOut",
        onUpdate: () => {
          const val = animationState.current.taglineReveal;
          if (taglineRef.current) {
            const maskPosX = `${100 - val * 100}%`;
            taglineRef.current.style.maskPosition = `${maskPosX} 0%`;
            taglineRef.current.style.webkitMaskPosition = `${maskPosX} 0%`;
          }
          if (taglineLightRef.current) {
            taglineLightRef.current.style.left = `${val * 100}%`;
          }
        }
      },
      0.34
    );
    // 3. Fade out tagline light
    tl.to(taglineLightRef.current,
      { opacity: 0, left: "105%", duration: 0.08, ease: "power1.in" },
      0.92
    );
    // Sound chime triggers at 0.3s
    tl.call(playChimeSound, [], 0.3);

    // SCENE 3: Sword Reveal (1.0s -> 1.9s)
    // 1. Fade in sword scanning light
    tl.fromTo(swordLightRef.current,
      { opacity: 0, left: "-5%" },
      { opacity: 1, left: "0%", duration: 0.08, ease: "power1.out" },
      1.0
    );
    // 2. Scan sword mask and light line
    tl.fromTo(animationState.current,
      { swordReveal: 0 },
      {
        swordReveal: 1,
        duration: 0.74,
        ease: "power2.inOut",
        onUpdate: () => {
          const val = animationState.current.swordReveal;
          if (swordImgRef.current) {
            const maskPosX = `${100 - val * 100}%`;
            swordImgRef.current.style.maskPosition = `${maskPosX} 0%`;
            swordImgRef.current.style.webkitMaskPosition = `${maskPosX} 0%`;
          }
          if (swordLightRef.current) {
            swordLightRef.current.style.left = `${val * 100}%`;
          }
        }
      },
      1.08
    );
    // 3. Fade out sword light
    tl.to(swordLightRef.current,
      { opacity: 0, left: "105%", duration: 0.08, ease: "power1.in" },
      1.82
    );

    // SCENE 4: Metal Shimmer (1.9s -> 2.2s)
    // Shimmer element sweeps across the blade
    tl.fromTo(swordShimmerRef.current,
      { left: "-30%" },
      { left: "130%", duration: 0.3, ease: "power1.inOut" },
      1.9
    );
    // Play synthesis metallic ring sound at 1.9s
    tl.call(playBladeShimmerSound, [], 1.9);

    // SCENE 5: Signature Reveal (2.2s -> 2.6s)
    // 1. Fade in signature light
    tl.fromTo(signatureLightRef.current,
      { opacity: 0, left: "-5%" },
      { opacity: 1, left: "0%", duration: 0.06, ease: "power1.out" },
      2.2
    );
    // 2. Scan signature text mask and light
    tl.fromTo(animationState.current,
      { signatureReveal: 0 },
      {
        signatureReveal: 1,
        duration: 0.28,
        ease: "power2.inOut",
        onUpdate: () => {
          const val = animationState.current.signatureReveal;
          if (signatureRef.current) {
            const maskPosX = `${100 - val * 100}%`;
            signatureRef.current.style.maskPosition = `${maskPosX} 0%`;
            signatureRef.current.style.webkitMaskPosition = `${maskPosX} 0%`;
          }
          if (signatureLightRef.current) {
            signatureLightRef.current.style.left = `${val * 100}%`;
          }
        }
      },
      2.26
    );
    // 3. Fade out signature light
    tl.to(signatureLightRef.current,
      { opacity: 0, left: "105%", duration: 0.06, ease: "power1.in" },
      2.54
    );

    // SCENE 6: Hold (2.6s -> 2.8s) - delay built-in

    // SCENE 7: Smooth crossfade fadeout of the overlay container (2.8s -> 3.0s)
    tl.to(containerRef.current,
      { opacity: 0, duration: 0.2, ease: "power1.inOut" },
      2.8
    );

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  const handleInteraction = () => {
    initAudio();
  };


  return (
    <div
      ref={containerRef}
      onClick={handleInteraction}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >

      {/* Ambient Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Center Layout Stack */}
      <div
        ref={contentWrapperRef}
        className="relative flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl pointer-events-none"
      >
        {/* 1. TAGLINE */}
        <div className="relative w-fit flex items-center justify-center">
          {/* Tagline scanning light line */}
          <div
            ref={taglineLightRef}
            className="absolute top-0 bottom-0 w-[3px] -translate-x-1/2 z-20 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 5%, #ffffff 50%, transparent 95%)",
              boxShadow: "0 0 10px 2px rgba(255, 255, 255, 0.9)",
            }}
          />
          
          <h2
            ref={taglineRef}
            className="font-serif text-[clamp(9px,2.8vw,1.1rem)] sm:text-2xl font-light tracking-[0.1em] xs:tracking-[0.18em] sm:tracking-[0.25em] text-white"
            style={{
              maskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              maskSize: "300% 100%",
              WebkitMaskSize: "300% 100%",
              maskPosition: "100% 0%",
              WebkitMaskPosition: "100% 0%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              whiteSpace: "nowrap",
            }}
          >
            The End of &quot;I&apos;ll Do It Later.&quot;
          </h2>
        </div>

        {/* 2. ORIGINAL ELEGANT SILVER SWORD (Custom Vector SVG) */}
        {/* Gap is top: 10px, bottom: 8px (Mt-2.5 is 10px, Mb-2 is 8px) */}
        <div 
          className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] h-[24px] overflow-hidden flex items-center justify-center mt-2.5 mb-2"
        >
          {/* Sword scanning light line */}
          <div
            ref={swordLightRef}
            className="absolute top-0 bottom-0 w-[4px] -translate-x-1/2 z-20 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 10%, #ffffff 50%, transparent 90%)",
              boxShadow: "0 0 15px 3px rgba(255, 255, 255, 0.95)",
            }}
          />

          {/* Inline SVG Sword with Mask */}
          <div
            ref={swordImgRef}
            className="w-full h-full flex items-center justify-center"
            style={{
              maskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              maskSize: "300% 100%",
              WebkitMaskSize: "300% 100%",
              maskPosition: "100% 0%",
              WebkitMaskPosition: "100% 0%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 500 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto opacity-90"
            >
              <defs>
                <linearGradient id="blade-top" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#b5b5b5" />
                </linearGradient>
                <linearGradient id="blade-bottom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8c8c8c" />
                  <stop offset="100%" stopColor="#555555" />
                </linearGradient>
                <linearGradient id="metal-bright" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7a7a7a" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#7a7a7a" />
                </linearGradient>
                <linearGradient id="hilt-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dcdcdc" />
                  <stop offset="50%" stopColor="#aaaaaa" />
                  <stop offset="100%" stopColor="#444444" />
                </linearGradient>
              </defs>
              
              {/* Pommel */}
              <circle cx="20" cy="12" r="3.5" fill="url(#metal-bright)" stroke="#3a3a3a" strokeWidth="0.5" />
              
              {/* Grip / Handle */}
              <rect x="23.5" y="10.5" width="46.5" height="3" rx="1" fill="url(#hilt-grad)" />
              {/* Grip wire wraps */}
              <line x1="33" y1="10.5" x2="33" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
              <line x1="43" y1="10.5" x2="43" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
              <line x1="53" y1="10.5" x2="53" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
              <line x1="63" y1="10.5" x2="63" y2="13.5" stroke="#3a3a3a" strokeWidth="0.5" />
              
              {/* Crossguard */}
              <rect x="70" y="4" width="5" height="16" rx="1" fill="url(#metal-bright)" stroke="#3a3a3a" strokeWidth="0.5" />
              <rect x="71.5" y="10.5" width="2" height="3" fill="#ffffff" />

              {/* Blade Collar (Chape) */}
              <rect x="75" y="9.5" width="8" height="5" fill="url(#hilt-grad)" />

              {/* Blade Bevels (creating a 3D fuller ridge split down the center at y=12) */}
              {/* Top half of blade */}
              <path d="M83 9.5 L460 9.5 L480 12 L83 12 Z" fill="url(#blade-top)" />
              {/* Bottom half of blade */}
              <path d="M83 12 L480 12 L460 14.5 L83 14.5 Z" fill="url(#blade-bottom)" />
            </svg>
          </div>

          {/* Shimmer sweeping overlay (Metallic Shimmer) */}
          <div
            ref={swordShimmerRef}
            className="absolute top-0 bottom-0 w-[30%] -skew-x-[25deg] z-10 pointer-events-none mix-blend-overlay"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45) 50%, transparent)",
              left: "-30%",
            }}
          />
        </div>

        {/* 3. SIGNATURE */}
        <div className="relative w-fit flex items-center justify-center">
          {/* Signature scanning light line */}
          <div
            ref={signatureLightRef}
            className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 z-20 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 5%, #ffffff 50%, transparent 95%)",
              boxShadow: "0 0 8px 1px rgba(255, 255, 255, 0.85)",
            }}
          />
          
          <h3
            ref={signatureRef}
            className="font-sans italic text-[8px] sm:text-[10px] text-[#B5B5B5] tracking-[0.08em] uppercase font-light"
            style={{
              maskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 33%, transparent 66%, transparent 100%)",
              maskSize: "300% 100%",
              WebkitMaskSize: "300% 100%",
              maskPosition: "100% 0%",
              WebkitMaskPosition: "100% 0%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              whiteSpace: "nowrap",
            }}
          >
            — by Prashant Umrao
          </h3>
        </div>

      </div>
    </div>
  );
}
