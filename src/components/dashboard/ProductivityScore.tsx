"use client";

import React, { useState, useEffect } from "react";

export default function ProductivityScore() {
  const [score, setScore] = useState(65); // default moderate risk
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"LOW" | "MODERATE" | "CRITICAL">("MODERATE");

  useEffect(() => {
    // Read from localStorage to evaluate dynamic score
    const updateScore = () => {
      const savedHabits = localStorage.getItem("pd_habits");
      const savedTasks = localStorage.getItem("pd_tasks");

      let habitsRate = 0;
      let tasksRate = 0;

      if (savedHabits) {
        try {
          const habits = JSON.parse(savedHabits);
          if (habits.length > 0) {
            habitsRate = habits.filter((h: any) => h.completedToday).length / habits.length;
          }
        } catch (e) {}
      }

      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          if (tasks.length > 0) {
            tasksRate = tasks.filter((t: any) => t.completed).length / tasks.length;
          }
        } catch (e) {}
      }

      // Procrastination Score is 100 minus completion rates (so high completion = low procrastination)
      const completionAverage = (habitsRate + tasksRate) / 2;
      const calculatedScore = Math.max(0, Math.min(100, Math.round(100 - (completionAverage * 100))));
      
      setScore(calculatedScore);

      if (calculatedScore <= 30) {
        setLevel("LOW");
        setDescription("FLOW STATE ACTIVE. WILLPOWER DISSOLVED. CONTINUE RHYTHMIC PROGRESSION.");
      } else if (calculatedScore <= 70) {
        setLevel("MODERATE");
        setDescription("FRICTION DETECTED. EGO SEEKING COMFORT. REDUCE SCOPE, DEFLECT DISTRACTIONS.");
      } else {
        setLevel("CRITICAL");
        setDescription("WARNING: CRITICAL AVOIDANCE. SLOTH IN THE FORTRESS. CHOOSE ONE SMALL DUEL NOW.");
      }
    };

    updateScore();
    // Listen for custom/local storage updates
    window.addEventListener("storage", updateScore);
    const interval = setInterval(updateScore, 2000); // Poll for fast local state synchronization

    return () => {
      window.removeEventListener("storage", updateScore);
      clearInterval(interval);
    };
  }, []);

  // SVG Gauge specifications
  const radius = 60;
  const strokeCircumference = Math.PI * radius; // half circle or custom arc
  const strokeOffset = strokeCircumference - (score / 100) * strokeCircumference;

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col items-center justify-between text-center w-full h-full relative group">
      <div className="flex justify-between items-center w-full mb-6">
        <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
          Procrastination Score
        </h3>
        <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
          Threat Level
        </span>
      </div>

      <div className="relative w-40 h-28 flex items-center justify-center">
        {/* Semi-circular gauge */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-180" viewBox="0 0 160 100">
          <path
            d="M 20,80 A 60,60 0 0,1 140,80"
            className="stroke-white/5 fill-none"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 20,80 A 60,60 0 0,1 140,80"
            className="stroke-white fill-none transition-all duration-500 ease-out"
            strokeWidth="4"
            strokeDasharray={strokeCircumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Text readout */}
        <div className="flex flex-col items-center z-10 mt-6">
          <span className="font-mono text-4xl tracking-widest text-white text-glow">
            {score}%
          </span>
          <span
            className={`font-orbitron uppercase text-[9px] tracking-wider mt-1.5 font-bold ${
              level === "LOW"
                ? "text-emerald-400"
                : level === "MODERATE"
                ? "text-white/60"
                : "text-red-500 text-glow animate-pulse"
            }`}
          >
            {level} RISK
          </span>
        </div>
      </div>

      <p className="font-inter text-[10px] leading-relaxed tracking-wider text-white/40 max-w-[220px] px-2 h-10 mt-2 flex items-center justify-center">
        {description}
      </p>
    </div>
  );
}
