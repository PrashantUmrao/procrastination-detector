"use client";

import React from "react";
import { useRouter } from "next/navigation";
import HeroSection from "@/components/cinematic/HeroSection";
import ScrollStory from "@/components/cinematic/ScrollStory";

export default function Home() {
  const router = useRouter();

  const handleEnterDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <main className="bg-black text-white relative">
      {/* 1. Widescreen Cinematic Hero Poster Section (Centerpiece embedded sword) */}
      <section className="min-h-screen w-full relative">
        <HeroSection />
      </section>

      {/* 2. Chronicles Chapters Scroll Story */}
      <ScrollStory onEnterDashboard={handleEnterDashboard} />
    </main>
  );
}
