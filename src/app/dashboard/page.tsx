"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";
import { useUser, UserButton, SignInButton } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showWelcome, setShowWelcome] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [greeting, setGreeting] = useState("WELCOME");

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
    
    const updateGreeting = () => {
      const hours = new Date().getHours();
      if (hours >= 5 && hours < 12) return "Good Morning";
      if (hours >= 12 && hours < 17) return "Good Afternoon";
      return "Good Evening";
    };

    updateTime();
    const timer = setTimeout(() => {
      setGreeting(updateGreeting());
    }, 0);

    const interval = setInterval(updateTime, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Welcome transition overlay session trigger
  useEffect(() => {
    if (isSignedIn && user && !sessionStorage.getItem("pd_welcome_shown")) {
      const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
      const isNew = Date.now() - createdTime < 45000;
      const timer = setTimeout(() => {
        setIsNewUser(isNew);
        setShowWelcome(true);
      }, 0);
      sessionStorage.setItem("pd_welcome_shown", "true");
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, user]);

  // Welcome transition auto-fadeout timer
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

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
                Sign In to Sanctuary
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
              className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded transition-all mr-2 group cursor-pointer active:scale-95"
              title="Return to Intro"
            >
              <ArrowLeft className="w-4 h-4 text-white/40 group-hover:text-white group-hover:-translate-x-[2px] transition-transform duration-300" />
            </button>
            <div className="w-[1px] h-6 bg-white/20 mr-2" />
            <h1 className="font-orbitron uppercase text-[9px] xs:text-[10px] sm:text-xs tracking-[0.15em] xs:tracking-[0.25em] sm:tracking-[0.3em] font-extrabold text-white text-glow">
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
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt={user.firstName || "Warrior"}
                className="w-12 h-12 rounded-full border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.04)] object-cover hover:border-white/20 transition-all duration-300"
              />
            )}
            <div>
              <span className="font-mono text-[9px] tracking-widest text-white/30 block mb-1">
                DESCENT CHAPTER 10 <span className="text-white/15">{"//"}</span> ACTIVE OPERATION
              </span>
              <h2 className="font-orbitron uppercase text-xl sm:text-2xl tracking-[0.08em] font-extrabold text-white leading-tight">
                {greeting}, <span className="text-glow">{user?.firstName || "WARRIOR"}</span>.
              </h2>
              <p className="font-inter font-light italic text-[11px] tracking-wide text-neutral-400 mt-1">
                &quot;The enemy is silent. The battle is now.&quot;
              </p>
            </div>
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

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-center select-none"
          >
            {/* Background micro grid element */}
            <div className="absolute inset-0 noise-bg opacity-[0.015] pointer-events-none" />

            {/* Narrative container */}
            <motion.div
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="max-w-md px-6 flex flex-col items-center gap-2"
            >
              <span className="font-mono text-[9px] tracking-[0.4em] text-white/40 uppercase block">
                IDENTITY VERIFIED
              </span>
              <h2 className="font-orbitron uppercase text-2xl sm:text-3xl font-black tracking-[0.25em] text-white text-glow">
                {isNewUser ? "WELCOME" : "WELCOME BACK"}
              </h2>
              <div className="w-8 h-[1px] bg-white/20 my-3" />
              <p className="font-inter italic text-[11px] tracking-wide text-white/50">
                {isNewUser ? "Your journey begins now." : "Continue your journey."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
