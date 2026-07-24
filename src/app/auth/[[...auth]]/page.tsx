"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { SignIn, SignUp } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Left-side Background Canvas Loop (Fog, twinkling stars, drifting dust)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const dustCount = 25;
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
        size: Math.random() * 0.9 + 0.3,
        vx: (Math.random() - 0.5) * 0.04,
        vy: -0.03 - Math.random() * 0.05,
        opacity: Math.random() * 0.15 + 0.05,
        phase: Math.random() * Math.PI * 2,
        freq: 0.0005 + Math.random() * 0.0015,
      });
    }

    const starCount = 15;
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
        maxOpacity: Math.random() * 0.2 + 0.03,
        speed: 0.01 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    let frameId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Vignette
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.3,
        width / 2,
        height / 2,
        Math.sqrt((width / 2) ** 2 + (height / 2) ** 2)
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.4)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.85)");
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

        const alpha = p.opacity * (0.8 + 0.2 * Math.sin(p.phase * 15));
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

  return (
    <main className="min-h-screen w-full bg-black flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative">
      {/* LEFT SIDE: Cinematic Visual Background */}
      <div className="relative w-full lg:w-1/2 min-h-[35vh] sm:min-h-[40vh] lg:min-h-screen flex flex-col justify-end p-6 sm:p-12 md:p-16 border-b lg:border-b-0 lg:border-r border-white/5 overflow-hidden">
        
        {/* Cinematic Backdrop Image with gentle scale/fade entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <Image
            src="/potential.jpg"
            alt="Sanctuary Potential Backdrop"
            fill
            priority
            className="object-cover filter grayscale brightness-[0.4] contrast-[1.1]"
          />
          {/* Gradients to blend */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-black z-10" />
          <div className="absolute inset-0 bg-black/50 z-10 pointer-events-none" />
        </motion.div>

        {/* Floating Particles Canvas */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Narrative Headings with blur/fade/slide entrance */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="relative z-30 max-w-lg"
        >
          <span className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase block mb-3">
            IDENTITY DESCENT <span className="text-white/15">//</span> GATEWAY
          </span>
          <h1 className="font-orbitron uppercase text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.1em] leading-[1.1] text-glow mb-4 text-white">
            BEGIN YOUR JOURNEY
          </h1>
          <p className="font-inter font-light text-xs sm:text-sm tracking-wide text-neutral-400 leading-relaxed max-w-sm">
            Every transformation begins with a decision.
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE: Authentication Card Area */}
      <div className="w-full lg:w-1/2 min-h-[65vh] sm:min-h-[60vh] lg:min-h-screen flex items-center justify-center p-4 sm:p-12 relative z-30">
        {/* Background micro grid element */}
        <div className="absolute inset-0 noise-bg opacity-[0.015] pointer-events-none" />

        {/* Glassmorphic Auth Card Container with scale/fade/slide entrance and top-light vertical gradient */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="w-full max-w-md bg-gradient-to-b from-white/[0.07] to-white/[0.01] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl px-5 py-8 sm:p-10 relative overflow-hidden"
        >
          {/* Subtle flare glow detail */}
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          {/* Suspended Clerk Form */}
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-6 h-6 border border-t-white border-white/10 rounded-full animate-spin" />
                <span className="font-orbitron text-[9px] tracking-[0.2em] text-white/40 uppercase">
                  Synchronizing Sanctuary Gates...
                </span>
              </div>
            }
          >
            <AuthFormContainer />
          </Suspense>
        </motion.div>
      </div>
    </main>
  );
}

// Sub-component that reads search parameters
function AuthFormContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  useEffect(() => {
    const currentMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
    setMode(currentMode);
  }, [searchParams]);

  const handleTabChange = (newMode: "signin" | "signup") => {
    setMode(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set("mode", newMode);
    router.replace(`/auth?${params.toString()}`, { scroll: false });
  };

  // Custom luxury monochrome Clerk appearance with focus glows and hover transitions (optimized for fluid responsiveness)
  const clerkAppearance = {
    variables: {
      colorPrimary: "#ffffff",
      colorBackground: "transparent",
      colorText: "#ffffff",
      colorTextSecondary: "#b3b3b3",
      colorInputBackground: "rgba(255, 255, 255, 0.02)",
      colorInputText: "#ffffff",
      colorBorder: "rgba(255, 255, 255, 0.08)",
      fontFamily: "var(--font-inter)",
    },
    elements: {
      cardBox: "shadow-none border-0 w-full max-w-full m-0",
      card: "bg-transparent shadow-none border-0 p-0 m-0 w-full max-w-full",
      main: "w-full max-w-full m-0",
      form: "w-full max-w-full m-0",
      formField: "w-full max-w-full",
      formFieldRow: "w-full flex flex-col sm:flex-row gap-4",
      header: "mb-6 text-left w-full",
      headerTitle: "font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-2 text-left w-full",
      headerSubtitle: "font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full",
      socialButtons: "w-full flex flex-col gap-2.5",
      socialButtonsIconButton: "border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded transition-colors",
      
      // Social login buttons with lift hover animation, touch zones, and micro-press scale
      socialButtonsBlockButton: "border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] active:scale-[0.98] text-white rounded-none transition-all duration-300 font-orbitron text-[9px] tracking-[0.2em] uppercase py-3.5 hover:-translate-y-[1px] w-full flex justify-center items-center gap-2",
      
      // Submit buttons with lift, Apple-style glowing hover highlight, and 52px touch areas
      formButtonPrimary: "bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full",
      
      formFieldLabel: "font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block",
      
      // Input boxes with focus glows, hover border transitions, and fluid scaling
      formFieldInput: "bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full",
      
      footer: "mt-6 w-full text-center sm:text-left",
      footerActionText: "text-xs text-white/30 font-inter",
      footerActionLink: "text-[10px] text-white/60 hover:text-white no-underline hover:underline font-mono tracking-widest uppercase transition-colors duration-300",
      dividerLine: "bg-white/5",
      dividerText: "text-white/20 font-mono text-[9px] tracking-[0.25em] uppercase",
      identityPreviewText: "text-white",
      identityPreviewEditButton: "text-white hover:text-white/80",
    },
  };

  return (
    <div className="flex flex-col w-full">
      {/* Animated Framer Motion Sliding Tabs */}
      <div className="flex border-b border-white/10 mb-8 relative w-full">
        <button
          onClick={() => handleTabChange("signin")}
          className={`flex-1 pb-4 pt-2 font-orbitron text-[10px] sm:text-xs tracking-[0.2em] uppercase transition-all duration-300 relative cursor-pointer ${
            mode === "signin" ? "text-white font-bold" : "text-white/35 hover:text-white/75"
          }`}
        >
          Sign In
          {mode === "signin" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[1px] bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
        </button>
        <button
          onClick={() => handleTabChange("signup")}
          className={`flex-1 pb-4 pt-2 font-orbitron text-[10px] sm:text-xs tracking-[0.2em] uppercase transition-all duration-300 relative cursor-pointer ${
            mode === "signup" ? "text-white font-bold" : "text-white/35 hover:text-white/75"
          }`}
        >
          Sign Up
          {mode === "signup" && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[1px] bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
        </button>
      </div>

      {/* Embedded Clerk Form views wrapped in AnimatePresence crossfades */}
      <div className="w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="w-full"
          >
            {mode === "signup" ? (
              <SignUp
                path="/auth"
                signInUrl="/auth?mode=signin"
                fallbackRedirectUrl="/dashboard"
                forceRedirectUrl="/dashboard"
                appearance={clerkAppearance}
              />
            ) : (
              <SignIn
                path="/auth"
                signUpUrl="/auth?mode=signup"
                fallbackRedirectUrl="/dashboard"
                forceRedirectUrl="/dashboard"
                appearance={clerkAppearance}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
