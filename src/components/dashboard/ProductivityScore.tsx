"use client";

import React, { useState, useEffect } from "react";

interface ProductivityScoreProps {
  score?: number;
}

export default function ProductivityScore({ score: propScore }: ProductivityScoreProps = {}) {
  const [localScore, setLocalScore] = useState(65); // default moderate risk
  const score = propScore !== undefined ? propScore : localScore;

  const [animatedScore, setAnimatedScore] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Eased dynamic gauge & score text animation
  useEffect(() => {
    let start = 0;
    const end = score;
    if (end === 0) {
      setAnimatedScore(0);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentVal = Math.round(start + easedProgress * (end - start));
      
      setAnimatedScore(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [score]);

  // Set mounted state for entrance animations
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sync with client-side localStorage as fallback if no prop is passed
  useEffect(() => {
    if (propScore !== undefined) return;

    const updateScore = () => {
      const savedHabits = localStorage.getItem("pd_habits");
      const savedTasks = localStorage.getItem("pd_tasks");

      let habitsRate = 0;
      let tasksRate = 0;

      if (savedHabits) {
        try {
          const habits = JSON.parse(savedHabits);
          if (habits.length > 0) {
            habitsRate = habits.filter((h: { completedToday: boolean }) => h.completedToday).length / habits.length;
          }
        } catch {
          // ignore
        }
      }

      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          if (tasks.length > 0) {
            tasksRate = tasks.filter((t: { completed: boolean }) => t.completed).length / tasks.length;
          }
        } catch {
          // ignore
        }
      }

      const completionAverage = (habitsRate + tasksRate) / 2;
      const calculatedScore = Math.max(0, Math.min(100, Math.round(100 - (completionAverage * 100))));
      
      setLocalScore(calculatedScore);
    };

    updateScore();
    window.addEventListener("storage", updateScore);
    const interval = setInterval(updateScore, 2000);

    return () => {
      window.removeEventListener("storage", updateScore);
      clearInterval(interval);
    };
  }, [propScore]);

  // Accent mappings based on actual procrastination score
  const getRiskDetails = (val: number) => {
    if (val <= 30) {
      return {
        level: "LOW RISK",
        message: "You're maintaining excellent consistency.",
        colorClass: "text-emerald-400",
        glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.08)]",
        strokeColor: "#10b981",
      };
    } else if (val <= 60) {
      return {
        level: "MODERATE RISK",
        message: "Stay consistent. One Focus Duel will keep you on track.",
        colorClass: "text-amber-400",
        glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.08)]",
        strokeColor: "#f59e0b",
      };
    } else if (val <= 80) {
      return {
        level: "HIGH RISK",
        message: "Avoidance detected. Complete one Focus Duel to regain momentum.",
        colorClass: "text-orange-400",
        glowClass: "shadow-[0_0_40px_rgba(249,115,22,0.08)]",
        strokeColor: "#f97316",
      };
    } else {
      return {
        level: "CRITICAL RISK",
        message: "You're losing momentum. Start a Focus Duel now.",
        colorClass: "text-red-500",
        glowClass: "shadow-[0_0_40px_rgba(239,68,68,0.12)]",
        strokeColor: "#ef4444",
      };
    }
  };

  const risk = getRiskDetails(score);

  // SVG parameters
  const radius = 54;
  const strokeCircumference = 2 * Math.PI * radius;
  const strokeOffset = strokeCircumference - (animatedScore / 100) * strokeCircumference;

  return (
    <div className="bg-card border border-border p-8 rounded flex flex-col items-center justify-center text-center w-full h-full relative overflow-hidden group select-none">
      {/* Dynamic breathing background glow */}
      <div className={`absolute -inset-px rounded transition-all duration-1000 opacity-[0.03] group-hover:opacity-[0.08] ${risk.glowClass} pointer-events-none`} />

      {/* Card Title Header */}
      <div className="mb-4">
        <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-white/40 block">
          Procrastination Score
        </span>
      </div>

      {/* Centerpiece Circular Progress Gauge */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 160 160">
          {/* Subtle track circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-white/[0.03] fill-none"
            strokeWidth="3.5"
          />
          {/* Colored progress circle with ease-out transition */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="fill-none transition-all duration-300 ease-out"
            strokeWidth="4.5"
            stroke={risk.strokeColor}
            strokeDasharray={strokeCircumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
        </svg>

        {/* Centered Score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-extrabold tracking-tight text-white select-none text-glow">
            {animatedScore}%
          </span>
        </div>
      </div>

      {/* Dynamic Risk Level (Fade In) */}
      <div className={`mt-4 transition-all duration-1000 transform ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <span className={`font-orbitron uppercase text-[10px] tracking-[0.25em] font-bold ${risk.colorClass} text-glow`}>
          {risk.level}
        </span>
      </div>

      {/* Elegant minimal line divider */}
      <div className="w-8 h-[1px] bg-white/10 my-3" />

      {/* Motivational Message (Fade In) */}
      <div className={`h-8 flex items-center justify-center transition-all duration-1000 delay-300 transform ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <p className="font-inter text-[11px] leading-relaxed tracking-wide text-neutral-400 max-w-[220px]">
          {risk.message}
        </p>
      </div>
    </div>
  );
}
