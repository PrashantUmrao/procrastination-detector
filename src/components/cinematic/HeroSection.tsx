"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, LogIn } from "lucide-react";
import { useUser, SignInButton, UserButton } from "@/components/providers/AuthProvider";
import { gsap } from "gsap";

export default function HeroSection() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isSignedIn } = useUser();

  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Animation values driven by GSAP and read by the Canvas loop
  const animValues = useRef({
    lightRayOpacity: 0.22,
    shimmerY: 0,
    shimmerOpacity: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    setDimensions({ width, height });

    // Setup coordinates for the blade shimmer centered in the correct column on desktop/tablet/mobile
    let shimmerX = width >= 1024 ? width * 0.75 : width >= 768 ? width * 0.81 : width * 0.5;

    // Drifting Fog Blobs
    const fogBlobs: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      opacity: number;
    }> = [];
    for (let i = 0; i < 7; i++) {
      fogBlobs.push({
        x: Math.random() * width,
        y: height * 0.6 + (Math.random() - 0.5) * 150,
        radius: 220 + Math.random() * 180,
        vx: 0.12 + Math.random() * 0.12,
        opacity: 0.04 + Math.random() * 0.04,
      });
    }

    // Volumetric Rays from top-left splaying down-right
    const lightRays = [
      { startX: width * 0.05, width: 100, angle: 56, swayFreq: 0.0003, maxSway: 3.5 },
      { startX: width * 0.2, width: 150, angle: 61, swayFreq: 0.00025, maxSway: 4.0 },
      { startX: width * 0.4, width: 190, angle: 64, swayFreq: 0.00035, maxSway: 2.5 },
    ];

    // Floating Dust
    const dustParticles: Array<{
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      amplitude: number;
      frequency: number;
      offset: number;
    }> = [];
    for (let i = 0; i < 65; i++) {
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.1 + 0.4,
        vx: 0.12 + Math.random() * 0.16,
        vy: -0.04 + Math.random() * 0.08,
        amplitude: 0.25 + Math.random() * 0.55,
        frequency: 0.001 + Math.random() * 0.002,
        offset: Math.random() * 100,
      });
    }

    // Rising Embers
    const embers: Array<{
      x: number;
      y: number;
      size: number;
      vy: number;
      vxOffset: number;
      vxSpeed: number;
      alpha: number;
      decay: number;
    }> = [];

    // 2.5. Ground Fog blobs around the base of the sword photo to hide the bottom edge
    const baseFogBlobs: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      opacity: number;
    }> = [];
    for (let i = 0; i < 8; i++) {
      baseFogBlobs.push({
        x: shimmerX + (Math.random() - 0.5) * 160,
        y: height * 0.69 + (Math.random() - 0.5) * 50,
        radius: 110 + Math.random() * 70,
        vx: 0.03 + Math.random() * 0.05, // drift slowly
        opacity: 0.08 + Math.random() * 0.06, // denser opacity to blend the image border
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      setDimensions({ width, height });
      shimmerX = width >= 1024 ? width * 0.75 : width >= 768 ? width * 0.81 : width * 0.5;
      
      baseFogBlobs.forEach((fog) => {
        fog.x = shimmerX + (Math.random() - 0.5) * 160;
        fog.y = height * 0.69 + (Math.random() - 0.5) * 50;
      });
    };
    window.addEventListener("resize", handleResize);

    // Setup periodic GSAP Shimmer Sweep on the blade (every 12 seconds)
    const triggerShimmer = () => {
      const startY = height * 0.28;
      const endY = height * 0.62;

      gsap.timeline()
        .fromTo(animValues.current,
          { shimmerY: startY, shimmerOpacity: 0.0 },
          { shimmerY: endY, shimmerOpacity: 0.75, duration: 1.8, ease: "power1.inOut" }
        )
        .to(animValues.current,
          { shimmerOpacity: 0.0, duration: 0.45, ease: "power1.out" },
          "-=0.45"
        );
    };

    // Trigger shimmer immediately, and schedule on an interval
    triggerShimmer();
    const shimmerInterval = setInterval(triggerShimmer, 12000);

    let animationFrameId: number;
    let startTime = Date.now();

    const renderLoop = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / 1000;

      // Camera breathing / handheld drift
      const camX = Math.sin(t * 0.6) * 1.5 + Math.cos(t * 1.2) * 0.5;
      const camY = Math.cos(t * 0.45) * 1.2 + Math.sin(t * 1.0) * 0.4;
      const camScale = 1.0 + Math.sin(t * 0.25) * 0.002;

      ctx.save();
      // Apply camera transform to splay the canvas
      ctx.translate(camX, camY);
      ctx.scale(camScale, camScale);

      // Clear Canvas (Transparency Fix)
      ctx.clearRect(-10, -10, width + 20, height + 20);

      // 1. DRAW VOLUMETRIC LIGHT BEAMS
      lightRays.forEach((ray) => {
        const currentAngle = ray.angle * (Math.PI / 180) + Math.sin(t * ray.swayFreq * 1000) * 0.045;
        const beamLength = height * 1.6;
        const endX = ray.startX + Math.cos(currentAngle) * beamLength;
        const endY = Math.sin(currentAngle) * beamLength;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ray.startX, 0);
        ctx.lineTo(ray.startX + ray.width, 0);
        ctx.lineTo(endX + ray.width * 2, endY);
        ctx.lineTo(endX, endY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(ray.startX + ray.width / 2, 0, endX + ray.width, endY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${animValues.current.lightRayOpacity * 0.09})`);
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${animValues.current.lightRayOpacity * 0.025})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // 2. DRIFTING FOG
      fogBlobs.forEach((fog) => {
        fog.x += fog.vx;
        if (fog.x - fog.radius > width) fog.x = -fog.radius;

        const grad = ctx.createRadialGradient(fog.x, fog.y, 5, fog.x, fog.y, fog.radius);
        grad.addColorStop(0, `rgba(100, 100, 100, ${fog.opacity})`);
        grad.addColorStop(0.6, `rgba(50, 50, 50, ${fog.opacity * 0.25})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2.5 DENSE BASE GROUND FOG
      baseFogBlobs.forEach((fog) => {
        fog.x += fog.vx;
        // wrap around the sword base horizontal boundaries
        if (fog.x - fog.radius > shimmerX + 200) {
          fog.x = shimmerX - 200 - fog.radius;
        }

        const grad = ctx.createRadialGradient(fog.x, fog.y, 2, fog.x, fog.y, fog.radius);
        grad.addColorStop(0, `rgba(80, 80, 80, ${fog.opacity})`);
        grad.addColorStop(0.6, `rgba(40, 40, 40, ${fog.opacity * 0.3})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. AMBIENT DUST
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      dustParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy + Math.sin(t * p.frequency * 1000 + p.offset) * p.amplitude * 0.12;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // 4. FLOATING ORANGE EMBERS
      if (Math.random() < 0.1 && embers.length < 25) {
        embers.push({
          x: Math.random() * width,
          y: height + Math.random() * 20,
          size: Math.random() * 1.3 + 0.3,
          vy: -(Math.random() * 0.45 + 0.2),
          vxOffset: Math.random() * 100,
          vxSpeed: 0.025 + Math.random() * 0.025,
          alpha: 0.2 + Math.random() * 0.5,
          decay: 0.003 + Math.random() * 0.0035,
        });
      }
      embers.forEach((emb, index) => {
        emb.y += emb.vy;
        emb.x += Math.sin(t * emb.vxSpeed * 100 + emb.vxOffset) * 0.2;
        emb.alpha -= emb.decay;
        if (emb.alpha <= 0 || emb.y < 0) {
          embers.splice(index, 1);
          return;
        }
        ctx.save();
        ctx.globalAlpha = emb.alpha;
        ctx.fillStyle = "#FF7A30";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#FF7A30";
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. SHIMMER ON BLADE
      if (animValues.current.shimmerOpacity > 0.01) {
        ctx.save();
        ctx.globalAlpha = animValues.current.shimmerOpacity;
        // Drawing a vertical light flare capsule directly over the photographic blade coordinates
        const shimmerGrad = ctx.createLinearGradient(shimmerX - 4, 0, shimmerX + 4, 0);
        shimmerGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        shimmerGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
        shimmerGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        ctx.fillStyle = shimmerGrad;
        ctx.beginPath();
        ctx.ellipse(
          shimmerX,
          animValues.current.shimmerY,
          4,
          25,
          -0.08, // slightly tilt to match blade angle in photograph
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        // Blade light flare glow spot
        const flareGlow = ctx.createRadialGradient(
          shimmerX,
          animValues.current.shimmerY,
          1,
          shimmerX,
          animValues.current.shimmerY,
          20
        );
        flareGlow.addColorStop(0, "rgba(255, 255, 255, 0.45)");
        flareGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = flareGlow;
        ctx.beginPath();
        ctx.arc(shimmerX, animValues.current.shimmerY, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      // 6. SOFTER PULSING GLOW AT THE BASE OF EMBEDDED SWORD
      const basePulse = 0.12 + Math.sin(t * 1.5) * 0.04;
      const baseGlow = ctx.createRadialGradient(
        shimmerX,
        height * 0.69, // Center base glow on actual soil entry point (y = 0.69 * height)
        10,
        shimmerX,
        height * 0.69,
        140
      );
      baseGlow.addColorStop(0, `rgba(255, 255, 255, ${basePulse})`);
      baseGlow.addColorStop(0.5, `rgba(255, 255, 255, ${basePulse * 0.35})`);
      baseGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.arc(shimmerX, height * 0.69, 140, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      clearInterval(shimmerInterval);
    };
  }, []);

  // Framer Motion animation variants for staggered blur reveal
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.16,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const signatureVariants = {
    hidden: { opacity: 0, y: 9, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen bg-black overflow-hidden flex flex-col justify-between w-full"
    >
      {/* 1. BACKGROUND CANVAS (Fog, light beams, embers, base glow, shimmer) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      </div>

      {/* 2. THE EMBEDDED SWORD PHOTOGRAPH AS CENTERPIECE (Desktop: Right-centered, Mobile/Tablet: Centered background) */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center md:justify-end">
        <div 
          className="relative h-[95vh] w-full max-md:aspect-none md:w-[32vw] lg:w-[38vw] aspect-[9/16] md:mr-[4%] lg:mr-[8%] opacity-[0.12] md:opacity-100 transition-opacity duration-1000"
        >
          {/* Main Visual Asset: next/image priority loaded */}
          <Image 
            src="/sword.jpg" 
            alt="Embedded Sword Piece" 
            fill 
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 32vw, 38vw"
            className="object-cover lg:object-contain object-center max-md:object-[center_60%] filter grayscale contrast-[1.12] brightness-[0.58] max-md:brightness-[0.45]"
          />
          
          {/* Custom Linear-Radial Dark Vignettes dissolving image margins to pure black background */}
          {/* Desktop Left-to-Right vignette */}
          <div className="absolute left-0 top-0 bottom-0 w-36 bg-gradient-to-r from-black to-transparent z-10 hidden lg:block" />
          {/* Desktop Right-to-Left vignette */}
          <div className="absolute right-0 top-0 bottom-0 w-36 bg-gradient-to-l from-black to-transparent z-10 hidden lg:block" />
          {/* Top splay vignette */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black to-transparent z-10" />
          {/* Bottom splay vignette */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent z-10" />
          
          {/* Radial overlay vignette for mobile center blending */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_20%,#000000_82%)] md:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,#000000_90%)] z-10" />
          <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none" />
        </div>
      </div>

      {/* 3. HERO CONTENT OVERLAY (LOGO, NAV, TITLE, DESCRIPTION, BUTTONS) */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 flex-1 flex flex-col justify-between py-6 sm:py-12 md:py-16">
        
        {/* Navigation links & Logo */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-between items-center w-full"
        >
          {/* Navigation links */}
          <motion.div variants={itemVariants} className="hidden md:flex items-center gap-8 order-last">
            <button
              onClick={() => {
                document.getElementById("chapter-enemy")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              The Chronicles
            </button>
            <a
              href="/dashboard"
              className="font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              Sanctuary
            </a>
            
            {isSignedIn ? (
              <UserButton />
            ) : (
              <>
                <a
                  href="/auth?mode=signin"
                  className="font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </a>
                <a
                  href="/auth?mode=signup"
                  className="font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  Sign Up
                </a>
              </>
            )}
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.div variants={itemVariants} className="flex md:hidden order-last">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="font-orbitron uppercase text-[9px] tracking-[0.25em] text-white/50 hover:text-white transition-colors cursor-pointer py-2 px-3 border border-white/10 hover:border-white/20 rounded bg-black/50 backdrop-blur-sm z-[60]"
            >
              {mobileMenuOpen ? "[ Close ]" : "[ Menu ]"}
            </button>
          </motion.div>

          {/* Site Logo */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-white shadow-[0_0_8px_#ffffff]" />
            <span className="font-orbitron uppercase text-[9px] tracking-[0.2em] min-[375px]:text-[10px] min-[375px]:tracking-[0.4em] font-extrabold text-white">
              Procrastination Detector
            </span>
          </motion.div>
        </motion.div>

        {/* Text Block - Grid alignment on desktop */}
        <div className="flex-grow flex items-center w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 w-full gap-8 md:gap-12">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="md:col-span-7 flex flex-col justify-center text-center md:text-left max-w-2xl mx-auto md:mx-0 relative z-20"
            >
              <motion.span 
                variants={itemVariants}
                className="font-orbitron uppercase text-[8px] xs:text-[9px] tracking-[0.25em] xs:tracking-[0.35em] text-white/40 block mb-3 md:mb-4"
              >
                A Journey of Discipline
              </motion.span>
              
              <motion.h1 
                variants={itemVariants}
                className="font-orbitron uppercase text-[clamp(1.4rem,6.5vw,2.4rem)] md:text-[clamp(2.5rem,5.5vw,3.8rem)] xl:text-7xl tracking-[0.1em] md:tracking-[0.16em] font-black leading-[1.1] text-glow mb-4 md:mb-5"
              >
                PROCRASTINATION DETECTOR
              </motion.h1>
              
              <div className="flex flex-col items-start w-fit self-center md:self-start text-left mb-5 md:mb-6">
                <motion.p 
                  variants={itemVariants}
                  transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.42
                  }}
                  className="font-inter italic text-[11px] xs:text-xs sm:text-sm tracking-widest text-white/60 mb-2 md:mb-[11px]"
                >
                  &quot;The End of &apos;I&apos;ll Do It Later.&apos;&quot;
                </motion.p>
                <motion.p
                  variants={signatureVariants}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    delay: 0.58
                  }}
                  className="font-inter italic text-[11px] xs:text-xs sm:text-sm md:text-[15px] font-medium tracking-[0.08em] text-white/50"
                >
                  — Prashant Umrao
                </motion.p>
              </div>
              
              <motion.p 
                variants={itemVariants}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.74
                }}
                className="font-inter text-[10px] xs:text-[11px] sm:text-xs leading-relaxed md:leading-relaxed tracking-wider text-white/45 mb-8 md:mb-10 max-w-md mx-auto md:max-w-none md:mx-0 px-4 md:px-0"
              >
                A cinematic psychological journey translating reflection into combat productivity metrics. Your timeline is locked. Confront the inertia, engage the focus duels, and claim victory over avoidance.
              </motion.p>

              <motion.div 
                variants={itemVariants}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.90
                }}
                className="flex flex-col md:flex-row gap-4 w-full md:w-fit justify-center md:justify-start px-4 md:px-0"
              >
                <button
                  onClick={() => {
                    router.push("/auth");
                  }}
                  className="group flex items-center justify-center gap-3 px-7 w-full md:w-auto h-12 md:h-auto py-4 md:py-3.5 bg-white text-black font-orbitron text-[9px] tracking-[0.25em] uppercase hover:bg-black hover:text-white border border-white hover:border-white/20 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.06)] active:scale-95 cursor-pointer"
                >
                  Start Your Journey <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <a
                  href="/dashboard"
                  className="px-7 w-full md:w-auto h-12 md:h-auto py-4 md:py-3.5 border border-white/10 text-white font-orbitron text-[9px] tracking-[0.25em] uppercase hover:border-white hover:bg-white/5 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  Explore Dashboard
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom stats layout */}
        <div className="w-full flex justify-between items-center text-[8px] font-mono text-white/25 uppercase tracking-widest">
          <span>Sanctuary status: operational</span>
          <span>Timeline: locked</span>
        </div>

      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-center items-center p-6 md:hidden"
          >
            <div className="flex flex-col items-center gap-8 w-full max-w-xs">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("chapter-enemy")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="font-orbitron uppercase text-[10px] tracking-[0.25em] text-white/70 hover:text-white transition-colors py-3 w-full text-center border-b border-white/5 cursor-pointer"
              >
                The Chronicles
              </button>
              <a
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="font-orbitron uppercase text-[10px] tracking-[0.25em] text-white/70 hover:text-white transition-colors py-3 w-full text-center border-b border-white/5 cursor-pointer"
              >
                Sanctuary
              </a>
              
              {isSignedIn ? (
                <>
                  <a
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-orbitron uppercase text-[10px] tracking-[0.25em] text-white/70 hover:text-white transition-colors py-3 w-full text-center border-b border-white/5 cursor-pointer"
                  >
                    Dashboard
                  </a>
                  <div className="py-3 flex justify-center items-center w-full z-[70]">
                    <UserButton />
                  </div>
                </>
              ) : (
                <>
                  <a
                    href="/auth?mode=signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-orbitron uppercase text-[10px] tracking-[0.25em] text-white/70 hover:text-white transition-colors py-3 w-full text-center border-b border-white/5 cursor-pointer"
                  >
                    Sign In
                  </a>
                  <a
                    href="/auth?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-orbitron uppercase text-[10px] tracking-[0.25em] text-white/70 hover:text-white transition-colors py-3 w-full text-center cursor-pointer"
                  >
                    Sign Up
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
