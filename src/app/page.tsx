"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HeroSection from "@/components/cinematic/HeroSection";
import ScrollStory from "@/components/cinematic/ScrollStory";
import CinematicIntro from "@/components/cinematic/CinematicIntro";

export default function Home() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const played = sessionStorage.getItem("intro_played");
      if (played === "true") {
        setShowIntro(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterDashboard = () => {
    router.push("/dashboard");
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem("intro_played", "true");
    setShowIntro(false);
  };

  return (
    <main className="bg-black text-white relative">
      {/* Cinematic Intro Overlay */}
      {(!mounted || showIntro) && (
        <CinematicIntro onComplete={handleIntroComplete} />
      )}

      {/* Main Home Page Content with gentle fade-in */}
      <div
        className={`transition-opacity duration-500 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* 1. Widescreen Cinematic Hero Poster Section (Centerpiece embedded sword) */}
        <section className="min-h-screen w-full relative">
          <HeroSection />
        </section>

        {/* 2. Chronicles Chapters Scroll Story */}
        <ScrollStory onEnterDashboard={handleEnterDashboard} />
      </div>
    </main>
  );
}

