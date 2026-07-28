"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Square, Volume2 } from "lucide-react";
import { audioSynthesizer } from "@/lib/audio";

export default function FocusTimer() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionDuration, setSessionDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mission, setMission] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const progress = (timeLeft / sessionDuration) * 100;

  // SVG parameters for the circular timer
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Save session helper
  const saveFocusSession = async (
    missionText: string,
    dur: number,
    start: Date,
    end: Date,
    isCompleted: boolean,
    distCount: number
  ) => {
    try {
      const response = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission: missionText,
          type: "focus",
          duration: dur,
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          completed: isCompleted,
          distractions: distCount,
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event("focusSessionSaved"));
      } else {
        console.error("Failed to save session:", await response.text());
      }
    } catch (err) {
      console.error("Error saving focus session:", err);
    }
  };

  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Load state on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedMode = localStorage.getItem("pd_timer_mode") as "focus" | "break" | null;
      const savedTimeLeft = localStorage.getItem("pd_timer_time_left");
      const savedDuration = localStorage.getItem("pd_timer_duration");
      const savedIsRunning = localStorage.getItem("pd_timer_is_running");
      const savedEndTime = localStorage.getItem("pd_timer_end_time");
      const savedMission = localStorage.getItem("pd_timer_mission");
      const savedLocked = localStorage.getItem("pd_timer_locked");
      const savedDistractions = localStorage.getItem("pd_timer_distractions");
      const savedSound = localStorage.getItem("pd_ambient_sound");
      const savedVol = localStorage.getItem("pd_ambient_volume");

      if (savedMode) setMode(savedMode);
      if (savedMission) setMission(savedMission);
      if (savedLocked === "true") setIsLocked(true);
      if (savedDistractions) setDistractions(parseInt(savedDistractions, 10));
      if (savedSound) setSelectedSound(savedSound === "none" ? null : savedSound);
      if (savedVol) setVolume(parseFloat(savedVol));

      const duration = savedDuration ? parseInt(savedDuration, 10) : (savedMode === "break" ? 5 * 60 : 25 * 60);
      setSessionDuration(duration);

      if (savedIsRunning === "true" && savedEndTime) {
        const endTime = parseInt(savedEndTime, 10);
        const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        if (remaining > 0) {
          setTimeLeft(remaining);
          setIsRunning(true);
          setIsLocked(true);
        } else {
          // Completed while away
          const nextMode = savedMode === "focus" ? "break" : "focus";
          setMode(nextMode);
          const nextDur = nextMode === "break" ? 5 * 60 : 25 * 60;
          setSessionDuration(nextDur);
          setTimeLeft(nextDur);
          setIsRunning(true);
          setIsLocked(nextMode === "focus");

          if (savedMode === "focus" && savedMission) {
            saveFocusSession(
              savedMission,
              duration,
              new Date(endTime - duration * 1000),
              new Date(endTime),
              true,
              parseInt(savedDistractions || "0", 10)
            );
          }
        }
      } else {
        if (savedTimeLeft) setTimeLeft(parseInt(savedTimeLeft, 10));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save state updates to localStorage
  useEffect(() => {
    localStorage.setItem("pd_timer_mode", mode);
    localStorage.setItem("pd_timer_time_left", timeLeft.toString());
    localStorage.setItem("pd_timer_duration", sessionDuration.toString());
    localStorage.setItem("pd_timer_is_running", isRunning.toString());
    localStorage.setItem("pd_timer_mission", mission);
    localStorage.setItem("pd_timer_locked", isLocked.toString());
    localStorage.setItem("pd_timer_distractions", distractions.toString());

    if (isRunning) {
      const endTime = Date.now() + timeLeft * 1000;
      localStorage.setItem("pd_timer_end_time", endTime.toString());
    } else {
      localStorage.removeItem("pd_timer_end_time");
    }
  }, [mode, timeLeft, sessionDuration, isRunning, mission, isLocked, distractions]);

  // Sync ambient sound
  useEffect(() => {
    if (isRunning && selectedSound) {
      audioSynthesizer.startAmbient(selectedSound, volumeRef.current);
    } else {
      audioSynthesizer.stopAmbient();
    }

    return () => {
      audioSynthesizer.stopAmbient();
    };
  }, [isRunning, selectedSound]);

  // Sync volume changes
  useEffect(() => {
    audioSynthesizer.setAmbientVolume(volume);
  }, [volume]);

  // Timer Tick Engine
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = new Date();
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);

            if (mode === "focus") {
              audioSynthesizer.playFocusEnd();
              const start = sessionStartRef.current || new Date(Date.now() - sessionDuration * 1000);
              saveFocusSession(mission, sessionDuration, start, new Date(), true, distractions);

              // Switch to Break
              setMode("break");
              const nextDur = 5 * 60;
              setSessionDuration(nextDur);
              setTimeLeft(nextDur);
              setIsLocked(false);
              setDistractions(0);
              sessionStartRef.current = null;

              setTimeout(() => {
                setIsRunning(true);
              }, 100);
            } else {
              audioSynthesizer.playFocusStart();

              // Switch to Focus
              setMode("focus");
              const nextDur = 25 * 60;
              setSessionDuration(nextDur);
              setTimeLeft(nextDur);
              setIsLocked(true);
              setDistractions(0);
              sessionStartRef.current = null;

              setTimeout(() => {
                setIsRunning(true);
              }, 100);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      sessionStartRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, mission, sessionDuration, distractions]);

  const toggleTimer = () => {
    if (!mission.trim()) return;

    if (!isRunning) {
      audioSynthesizer.playFocusStart();
      setIsLocked(true);
      setIsRunning(true);
    } else {
      if (mode === "focus") {
        setDistractions((prev) => prev + 1);
      }
      setIsRunning(false);
    }
  };

  const stopTimer = () => {
    setIsRunning(false);

    if (mode === "focus" && timeLeft < sessionDuration) {
      const elapsed = sessionDuration - timeLeft;
      const start = sessionStartRef.current || new Date(Date.now() - elapsed * 1000);
      saveFocusSession(mission, elapsed, start, new Date(), false, distractions);
    }

    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const resetTimer = () => {
    setIsRunning(false);
    const defaultDur = mode === "focus" ? 25 * 60 : 5 * 60;
    setTimeLeft(defaultDur);
    setSessionDuration(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const adjustTime = (minutes: number) => {
    const change = minutes * 60;
    setTimeLeft((prev) => {
      const next = prev + change;
      return next < 300 ? 300 : next;
    });
    setSessionDuration((prev) => {
      const next = prev + change;
      return next < 300 ? 300 : next;
    });
  };

  const switchMode = (newMode: "focus" | "break") => {
    setIsRunning(false);
    setMode(newMode);
    const defaultDur = newMode === "focus" ? 25 * 60 : 5 * 60;
    setSessionDuration(defaultDur);
    setTimeLeft(defaultDur);
    setIsLocked(false);
    setDistractions(0);
    sessionStartRef.current = null;
  };

  const skipBreak = () => {
    switchMode("focus");
    setTimeout(() => {
      audioSynthesizer.playFocusStart();
      setIsLocked(true);
      setIsRunning(true);
    }, 100);
  };

  const handleSoundSelect = (soundName: string) => {
    let nextSound: string | null = soundName;
    if (selectedSound === soundName) {
      nextSound = null;
      localStorage.setItem("pd_ambient_sound", "none");
    } else {
      localStorage.setItem("pd_ambient_sound", soundName);
    }
    setSelectedSound(nextSound);

    if (isRunning) {
      if (nextSound) {
        audioSynthesizer.startAmbient(nextSound, volume);
      } else {
        audioSynthesizer.stopAmbient();
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem("pd_ambient_volume", newVol.toString());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col items-center justify-center relative overflow-hidden group">
      {/* Mode Tabs */}
      <div className="absolute top-4 left-6 flex gap-3 z-10">
        <button
          onClick={() => switchMode("focus")}
          disabled={isLocked}
          className={`font-orbitron uppercase text-[9px] tracking-widest transition-all cursor-pointer ${
            mode === "focus" ? "text-glow text-white underline underline-offset-4 font-bold" : "text-white/40 hover:text-white/70"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          Focus
        </button>
        <button
          onClick={() => switchMode("break")}
          disabled={isLocked}
          className={`font-orbitron uppercase text-[9px] tracking-widest transition-all cursor-pointer ${
            mode === "break" ? "text-glow text-white underline underline-offset-4 font-bold" : "text-white/40 hover:text-white/70"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          Break
        </button>
      </div>

      {/* Skip Break */}
      {mode === "break" && (
        <button
          onClick={skipBreak}
          className="absolute top-4 right-6 font-orbitron uppercase text-[9px] tracking-widest text-white/50 hover:text-white transition-all underline underline-offset-4 cursor-pointer"
        >
          Skip Break
        </button>
      )}

      {/* Circular Progress Ring */}
      <div className="relative w-48 h-48 mt-4 flex items-center justify-center">
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

        {/* Time Readout */}
        <div className="flex flex-col items-center z-10">
          <span className="font-mono text-4xl tracking-widest text-white text-glow">
            {formatTime(timeLeft)}
          </span>
          <span className="font-orbitron uppercase text-[8px] tracking-[0.2em] text-white/30 mt-1">
            {mode === "focus" ? "Active Duel" : "Refueling"}
          </span>
        </div>
      </div>

      {/* Mission Input Field */}
      <div className="w-full mt-6 z-10 flex flex-col gap-2">
        <label className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">
          Current Mission
        </label>
        <input
          type="text"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          disabled={isLocked}
          placeholder="e.g. Build MongoDB Backend"
          className="w-full bg-black/40 border border-white/10 px-3 py-2 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        />
        <div className="flex justify-between items-center text-[9px] font-mono text-white/30 uppercase mt-0.5">
          <span>Estimated Time</span>
          <span className="text-white/60">{Math.ceil(sessionDuration / 60)} minutes</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4 mt-6 z-10 w-full justify-center">
        {/* Decrease Time */}
        <button
          onClick={() => adjustTime(-5)}
          disabled={timeLeft <= 300}
          className="px-2 py-1.5 border border-white/5 hover:border-white/20 text-[9px] font-mono text-white/40 hover:text-white transition-all rounded disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          title="Decrease 5 minutes"
        >
          -5M
        </button>

        {/* Reset */}
        <button
          onClick={resetTimer}
          className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Start/Pause */}
        <button
          onClick={toggleTimer}
          disabled={!mission.trim()}
          className="w-10 h-10 bg-white hover:bg-neutral-200 text-black flex items-center justify-center rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={isRunning ? "Pause" : "Start"}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
        </button>

        {/* Stop */}
        <button
          onClick={stopTimer}
          className="p-2 border border-white/5 hover:border-white/20 text-white/40 hover:text-white transition-all rounded-full cursor-pointer"
          title="Stop Session"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Increase Time */}
        <button
          onClick={() => adjustTime(5)}
          className="px-2 py-1.5 border border-white/5 hover:border-white/20 text-[9px] font-mono text-white/40 hover:text-white transition-all rounded cursor-pointer"
          title="Increase 5 minutes"
        >
          +5M
        </button>
      </div>

      {/* Ambient Sounds */}
      <div className="w-full mt-6 pt-4 border-t border-white/5 z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="font-orbitron uppercase text-[9px] tracking-widest text-white/40">
            Ambient Sound
          </label>
          {selectedSound && (
            <span className="font-mono text-[9px] text-white/60 uppercase">
              {selectedSound}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {["rain", "forest", "cafe", "brown", "white", "fireplace"].map((sound) => (
            <button
              key={sound}
              onClick={() => handleSoundSelect(sound)}
              className={`px-1 py-1.5 border text-[9px] font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                selectedSound === sound
                  ? "bg-white text-black border-white font-bold"
                  : "border-white/5 text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {sound === "brown" ? "Brown N." : sound === "white" ? "White N." : sound}
            </button>
          ))}
        </div>

        {selectedSound && (
          <div className="flex items-center gap-3 mt-1.5">
            <Volume2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <span className="font-mono text-[9px] text-white/40 w-6 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
