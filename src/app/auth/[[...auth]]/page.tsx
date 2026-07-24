"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useClerk, AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCallback, setIsCallback] = useState(false);

  // Left-side Background Canvas Loop (Fog, twinkling stars, drifting dust)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCallback(window.location.pathname.includes("sso-callback"));
    }

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

  if (isCallback) {
    return (
      <main className="min-h-screen w-full bg-black flex flex-col justify-center items-center relative">
        <div className="absolute inset-0 noise-bg opacity-[0.015] pointer-events-none" />
        <div className="flex flex-col items-center justify-center gap-4 text-center z-10">
          <div className="w-8 h-8 border-2 border-t-white border-white/10 rounded-full animate-spin" />
          <span className="font-orbitron text-xs tracking-[0.2em] text-white/60 uppercase">
            Completing sanctuary descent...
          </span>
        </div>
        <div className="hidden">
          <Suspense fallback={null}>
            <AuthenticateWithRedirectCallback />
          </Suspense>
        </div>
      </main>
    );
  }

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

          {/* Suspended Custom Form */}
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

// Custom hand-crafted form container utilizing Clerk's client hooks
function AuthFormContainer() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const clerk = useClerk();
  const isLoaded = !!clerk.client;
  const signIn = clerk.client?.signIn;
  const signUp = clerk.client?.signUp;
  const setActive = clerk.setActive;

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verification/Reset states
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verCode, setVerCode] = useState("");
  const [resetState, setResetState] = useState<"idle" | "forgot" | "code_sent">("idle");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Sync mode query parameters
  useEffect(() => {
    const currentMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
    setMode(currentMode);
  }, [searchParams]);

  const handleTabChange = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setVerCode("");
    setResetCode("");
    setNewPassword("");
    setError(null);
    setLoading(false);
    setPendingVerification(false);
    setResetState("idle");

    const params = new URLSearchParams(window.location.search);
    params.set("mode", newMode);
    router.replace(`/auth?${params.toString()}`, { scroll: false });
  };

  // Sign In custom submission handler
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Sign in is incomplete. Please check your inputs.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to sign in.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up custom submission handler (creates code challenge)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError(null);
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to create account.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification code submission
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError(null);
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verCode,
      });
      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Verification is incomplete. Please verify the code entered.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to verify code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to resend code.";
      setError(msg);
    }
  };

  // Forgot password request code submission
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);
    try {
      await signIn.create({
        identifier: email,
      });

      const resetFactor = signIn.supportedFirstFactors?.find(
        (f) => f.strategy === "reset_password_email_code"
      );

      if (resetFactor && "emailAddressId" in resetFactor) {
        await signIn.prepareFirstFactor({
          strategy: "reset_password_email_code",
          emailAddressId: resetFactor.emailAddressId as string,
        });
        setResetState("code_sent");
      } else {
        setError("Password reset is not supported for this account.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to request code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reset password verification and update submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Password reset is incomplete.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to reset password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // OAuth redirects using Clerk hooks
  const handleOAuthLogin = async (strategy: "oauth_google" | "oauth_github") => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin" && isLoaded && signIn) {
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/auth/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } else if (mode === "signup" && isLoaded && signUp) {
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: "/auth/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "OAuth redirect failed.";
      setError(msg);
      setLoading(false);
    }
  };

  // Build the active view key to sequence transitions
  const getActiveViewKey = () => {
    if (pendingVerification) return "verify";
    if (resetState === "forgot") return "forgot";
    if (resetState === "code_sent") return "reset";
    return mode;
  };

  const activeView = getActiveViewKey();

  return (
    <div className="flex flex-col w-full">
      {/* Hide Tabs during verification and password resets */}
      {activeView !== "verify" && activeView !== "forgot" && activeView !== "reset" && (
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
      )}

      {/* Error Message banner inside the card */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/15 text-red-400 text-[11px] py-3 px-4 rounded-none font-mono tracking-wide text-left mb-6 leading-relaxed">
          {error}
        </div>
      )}

      {/* Form views crossfades */}
      <div className="w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full"
          >
            {/* VIEW 1: SIGN IN */}
            {activeView === "signin" && (
              <form onSubmit={handleSignInSubmit} className="space-y-5">
                <div>
                  <h3 className="font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-1.5 text-left w-full">
                    Sanctuary Portal
                  </h3>
                  <p className="font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full mb-5">
                    Synchronize your focus metrics using your email credentials.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. warrior@sanctuary.com"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5 w-full">
                      <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 block">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setResetState("forgot");
                        }}
                        className="text-[9px] text-white/40 hover:text-white font-mono tracking-widest uppercase transition-colors"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-black border-black/20 rounded-full animate-spin" />
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-[1px] bg-white/5" />
                  <span className="text-white/20 font-mono text-[9px] tracking-[0.25em] uppercase">OR</span>
                  <div className="flex-1 h-[1px] bg-white/5" />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loading || !isLoaded}
                    onClick={() => handleOAuthLogin("oauth_google")}
                    className="border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] active:scale-[0.98] text-white rounded-none transition-all duration-300 font-orbitron text-[9px] tracking-[0.2em] uppercase py-3.5 hover:-translate-y-[1px] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    disabled={loading || !isLoaded}
                    onClick={() => handleOAuthLogin("oauth_github")}
                    className="border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] active:scale-[0.98] text-white rounded-none transition-all duration-300 font-orbitron text-[9px] tracking-[0.2em] uppercase py-3.5 hover:-translate-y-[1px] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 2: SIGN UP */}
            {activeView === "signup" && (
              <form onSubmit={handleSignUpSubmit} className="space-y-5">
                <div>
                  <h3 className="font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-1.5 text-left w-full">
                    Create Sanctuary account
                  </h3>
                  <p className="font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full mb-5">
                    Prepare your credentials to access focus timeline chapters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="warrior@sanctuary.com"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                    />
                  </div>
                  <div>
                    <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-black border-black/20 rounded-full animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-[1px] bg-white/5" />
                  <span className="text-white/20 font-mono text-[9px] tracking-[0.25em] uppercase">OR</span>
                  <div className="flex-1 h-[1px] bg-white/5" />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loading || !isLoaded}
                    onClick={() => handleOAuthLogin("oauth_google")}
                    className="border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] active:scale-[0.98] text-white rounded-none transition-all duration-300 font-orbitron text-[9px] tracking-[0.2em] uppercase py-3.5 hover:-translate-y-[1px] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    disabled={loading || !isLoaded}
                    onClick={() => handleOAuthLogin("oauth_github")}
                    className="border border-white/8 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] active:scale-[0.98] text-white rounded-none transition-all duration-300 font-orbitron text-[9px] tracking-[0.2em] uppercase py-3.5 hover:-translate-y-[1px] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: INLINE EMAIL CODE VERIFICATION (OTP) */}
            {activeView === "verify" && (
              <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div>
                  <h3 className="font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-1.5 text-left w-full">
                    Authorize Email Descent
                  </h3>
                  <p className="font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full">
                    We sent an authorization code to <strong className="text-white font-mono text-[11px]">{email}</strong>. Enter the verification code inline to verify your identity.
                  </p>
                </div>

                <div>
                  <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={verCode}
                    onChange={(e) => setVerCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full font-mono text-center tracking-[0.5em] text-lg"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-black border-black/20 rounded-full animate-spin" />
                    ) : (
                      "Verify Code"
                    )}
                  </button>

                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40 pt-2 px-1">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setPendingVerification(false);
                        setVerCode("");
                      }}
                      className="hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* VIEW 4: FORGOT PASSWORD REQUEST CODE */}
            {activeView === "forgot" && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                <div>
                  <h3 className="font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-1.5 text-left w-full">
                    Reset Authorization
                  </h3>
                  <p className="font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full">
                    Input your registered email below, and we will transmit a password reset code challenge.
                  </p>
                </div>

                <div>
                  <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="warrior@sanctuary.com"
                    className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-black border-black/20 rounded-full animate-spin" />
                    ) : (
                      "Send Reset Code"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetState("idle");
                      }}
                      className="text-[10px] text-white/60 hover:text-white no-underline hover:underline font-mono tracking-widest uppercase transition-colors duration-300 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* VIEW 5: RESET PASSWORD COMPLETION */}
            {activeView === "reset" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                <div>
                  <h3 className="font-orbitron uppercase text-[11px] sm:text-xs tracking-[0.2em] font-extrabold text-white mb-1.5 text-left w-full">
                    Enter New Password
                  </h3>
                  <p className="font-inter text-[10px] text-neutral-400 text-left leading-relaxed w-full mb-5">
                    We sent a code to <strong className="text-white font-mono text-[11px]">{email}</strong>. Enter it alongside your new password credentials.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                      Reset Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full font-mono text-center tracking-[0.5em]"
                    />
                  </div>
                  <div>
                    <label className="font-orbitron text-[9px] tracking-[0.2em] uppercase text-white/50 mb-1.5 w-full block">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-white/[0.02] border border-white/10 rounded-none px-3.5 py-3 text-sm text-white placeholder-white/20 hover:border-white/20 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/20 focus:shadow-[0_0_10px_rgba(255,255,255,0.12)] outline-none transition-all duration-300 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isLoaded}
                    className="bg-white text-black hover:bg-neutral-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-white hover:border-white transition-all duration-300 font-orbitron text-[10px] tracking-[0.25em] uppercase font-extrabold py-4 rounded-none hover:-translate-y-[1px] active:scale-[0.98] w-full flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-black border-black/20 rounded-full animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetState("idle");
                        setResetCode("");
                        setNewPassword("");
                      }}
                      className="text-[10px] text-white/60 hover:text-white no-underline hover:underline font-mono tracking-widest uppercase transition-colors duration-300 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
