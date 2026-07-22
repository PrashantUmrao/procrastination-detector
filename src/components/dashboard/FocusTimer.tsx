"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { audioSynthesizer } from "@/lib/audio";

export default function FocusTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = mode === "focus" ? 25 * 60 : 5 * 60;
  const progress = (timeLeft / totalDuration) * 100;

  // SVG parameters for the circular timer
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            
            // Switch modes
            if (mode === "focus") {
              setMode("break");
              setTimeLeft(5 * 60);
              audioSynthesizer.playFocusEnd();
            } else {
              setMode("focus");
              setTimeLeft(25 * 60);
              audioSynthesizer.playFocusStart();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const toggleTimer = () => {
    if (!isRunning) {
      audioSynthesizer.playFocusStart();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: "focus" | "break") => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === "focus" ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col items-center justify-center relative overflow-hidden group">
      <div className="absolute top-4 left-6 flex gap-3 z-10">
        <button
          onClick={() => switchMode("focus")}
          className={`font-orbitron uppercase text-[9px] tracking-widest transition-all ${
            mode === "focus" ? "text-white underline underline-offset-4 font-bold" : "text-white/40 hover:text-white/70"
          }`}
        >
          Focus
        </button>
        <button
          onClick={() => switchMode("break")}
          className={`font-orbitron uppercase text-[9px] tracking-widest transition-all ${
            mode === "break" ? "text-white underline underline-offset-4 font-bold" : "text-white/40 hover:text-white/70"
          }`}
        >
          Break
        </button>
      </div>

      <div className="relative w-48 h-48 mt-4 flex items-center justify-center">
        {/* SVG Circular Ring */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            className="stroke-white/5 fill-none"
            strokeWidth="2"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            className="stroke-white fill-none transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Time Text */}
        <div className="flex flex-col items-center z-10">
          <span className="font-mono text-4xl tracking-widest text-white text-glow">
            {formatTime(timeLeft)}
          </span>
          <span className="font-orbitron uppercase text-[8px] tracking-[0.2em] text-white/30 mt-1">
            {mode === "focus" ? "Active Duel" : "Refueling"}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-6 mt-6 z-10">
        <button
          onClick={resetTimer}
          className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleTimer}
          className="w-10 h-10 bg-white hover:bg-neutral-200 text-black flex items-center justify-center rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 cursor-pointer"
        >
          {isRunning ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
        </button>

        <div className="w-7 h-7" /> {/* spacer to balance layout */}
      </div>
    </div>
  );
}
