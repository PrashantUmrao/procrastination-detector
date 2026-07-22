"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, ShieldAlert } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@/components/providers/AuthProvider";

import FocusTimer from "@/components/dashboard/FocusTimer";
import HabitTracker from "@/components/dashboard/HabitTracker";
import TaskTimeline from "@/components/dashboard/TaskTimeline";
import ProductivityScore from "@/components/dashboard/ProductivityScore";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import WeeklyAIReport from "@/components/dashboard/WeeklyAIReport";

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const [currentTime, setCurrentTime] = useState("");

  // Update clock in real-time
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(
        date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase() +
        " // " +
        date.toLocaleTimeString("en-US", { hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border border-t-white border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  // Cinematic Access Denied Gate
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        {/* Background grid details */}
        <div className="absolute inset-0 noise-bg opacity-[0.015]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

        <div className="relative z-10 max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 border border-white/10 flex items-center justify-center rounded-full mb-6 text-white/40">
            <Lock className="w-4 h-4" />
          </div>

          <span className="font-orbitron uppercase text-[9px] tracking-[0.3em] text-white/40 block mb-2">
            Sanctuary Restricted
          </span>
          <h2 className="font-orbitron uppercase text-2xl tracking-widest font-bold text-white mb-4">
            Identity Required
          </h2>
          <p className="font-inter text-xs text-white/50 leading-relaxed mb-8">
            This dashboard is reserved for disciplined warriors tracking focus timelines. Please register or establish auth credentials to proceed.
          </p>

          <div className="flex flex-col gap-4 w-full">
            <SignInButton>
              <button className="w-full px-6 py-3 bg-white text-black font-orbitron text-xs tracking-widest uppercase hover:bg-black hover:text-white border border-white transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer">
                Establish Mock Identity
              </button>
            </SignInButton>

            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-3 border border-white/10 text-white font-orbitron text-xs tracking-widest uppercase hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Chapters
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col pb-20 select-none">
      {/* Background visual detail */}
      <div className="absolute inset-0 noise-bg opacity-[0.015] pointer-events-none" />

      {/* LUXURY HEADER */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-white/5 border border-transparent hover:border-white/10 rounded transition-all mr-2 group cursor-pointer"
              title="Return to Intro"
            >
              <ArrowLeft className="w-4 h-4 text-white/40 group-hover:text-white" />
            </button>
            <div className="w-[1px] h-6 bg-white/20 mr-2" />
            <h1 className="font-orbitron uppercase text-xs tracking-[0.3em] font-extrabold text-white text-glow">
              Procrastination Detector
            </h1>
            <span className="font-mono text-[9px] tracking-widest text-white/30 hidden sm:inline-block">
              / SANCTUARY
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span className="font-mono text-[9px] tracking-widest text-white/40 hidden md:inline-block">
              {currentTime}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 w-full mt-10 flex-1 flex flex-col gap-8">
        
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
          <div>
            <span className="font-mono text-[9px] tracking-widest text-white/30 block mb-1">
              DESCENT CHAPTER 10 // ACTIVE OPERATION
            </span>
            <h2 className="font-orbitron uppercase text-2xl tracking-[0.1em] font-extrabold text-white">
              WELCOME BACK, {user?.fullName?.toUpperCase() || "WARRIOR"}.
            </h2>
            <p className="font-inter italic text-[11px] tracking-wide text-white/40 mt-1">
              &quot;The enemy is silent. The battle is now.&quot;
            </p>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">Combat Index</span>
              <span className="font-mono text-lg text-white font-bold tracking-wider">ACTIVE</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">Threat Level</span>
              <span className="font-mono text-lg text-white font-bold tracking-wider">MODERATE</span>
            </div>
          </div>
        </section>

        {/* CORE GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Productivity Score */}
          <div className="h-full">
            <ProductivityScore />
          </div>

          {/* Column 2: Focus Timer */}
          <div className="h-full">
            <FocusTimer />
          </div>

          {/* Column 3: Weekly AI Report */}
          <div className="h-full">
            <WeeklyAIReport />
          </div>

          {/* Column 4: Habit Tracker */}
          <div className="h-full">
            <HabitTracker />
          </div>

          {/* Column 5: Task Timeline */}
          <div className="h-full lg:col-span-2">
            <TaskTimeline />
          </div>

          {/* Column 6: Analytics Charts (Full width on smaller, grid fit on large) */}
          <div className="h-full md:col-span-2 lg:col-span-3">
            <AnalyticsCharts />
          </div>

        </section>
      </main>
    </div>
  );
}
