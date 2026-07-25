"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, motionValue, MotionValue } from "framer-motion";
import { ArrowRight, Lock, Eye } from "lucide-react";
import { useUser, SignInButton } from "@/components/providers/AuthProvider";

interface Chapter {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: "enemy",
    num: "01",
    title: "The Enemy",
    subtitle: "THE DECEPTIVE REFUGE",
    description: "Procrastination is not a failure of time management. It is a defense mechanism. An emotional avoidance strategy where the ego chooses immediate comfort over long-term realization, trading future regret for temporary relief.",
    imageUrl: "/the-enemy-suit.jpg",
  },
  {
    id: "potential",
    num: "02",
    title: "Your Potential",
    subtitle: "THE UNEXPLORED PATH",
    description: "Deep within you lies an unwritten legacy. Every hour spent avoiding the work is an hour you delete from your potential. The gap between who you are and who you could be is the cost of your procrastination.",
    imageUrl: "/potential.jpg",
  },
  {
    id: "fear",
    num: "03",
    title: "Face Your Fear",
    subtitle: "THE CORE OBSACLE",
    description: "We do not run from the task itself. We run from the judgment, the fear of failure, or the terrifying possibility of realizing our own limits. Facing the fear neutralizes the control it holds over your schedule.",
    imageUrl: "/fear.jpg",
  },
  {
    id: "ego",
    num: "04",
    title: "Dismantling Ego",
    subtitle: "THE ARROGANCE OF LATER",
    description: "Believing that 'tomorrow' you will feel more motivated is a delusion. It is the ego asserting control by creating a fictional, superior version of yourself that doesn't exist. Today is all you will ever have.",
    imageUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "strategy",
    num: "05",
    title: "System Over Will",
    subtitle: "THE METICULOUS DESIGN",
    description: "Willpower is a finite chemical. It decays as the day progresses. The disciplined do not rely on motivation; they design environments where procrastination is friction-heavy and action is default.",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "reflection",
    num: "06",
    title: "The Reflection",
    subtitle: "TAKING INVENTORY",
    description: "Look at your days with raw, unclouded objectivity. Stop measuring efforts by intentions. Measure them by output. The clock is indifferent to your excuses, ticking steadily towards the end.",
    imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "battle",
    num: "07",
    title: "The Daily Battle",
    subtitle: "THE CONTINUOUS CLASH",
    description: "Discipline is not a static achievement. It is a recurring battle fought every single morning. Each task is a duel; each completion is a victory that expands your empire of self-governance.",
    imageUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "victory",
    num: "08",
    title: "State of Flow",
    subtitle: "THE ULTIMATE ASCENT",
    description: "When the friction dissolves and action becomes rhythmic, you enter flow. You are no longer fighting yourself; you are simply creating. The End of 'I'll Do It Later' is the beginning of flow.",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "dashboard-lead",
    num: "09",
    title: "The Sanctuary",
    subtitle: "YOUR WEAPONRY DEPLOYED",
    description: "From psychology to utility. Transition from reflection into actions. The Procrastination Detector dashboard is now unlocked. Measure your analytics, track your focus, and build ironclad habits.",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop",
  }
];

export default function ScrollStory({ onEnterDashboard }: { onEnterDashboard: () => void }) {
  const [activeChapter, setActiveChapter] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isSignedIn } = useUser();

  // Highlight active side navigation item using Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-45% 0px -45% 0px", // Trigger when center of item is near center of viewport
      threshold: 0.1,
    };

    const observers = CHAPTERS.map((chapter, index) => {
      const el = document.getElementById(`chapter-${chapter.id}`);
      if (!el) return null;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(index);
          }
        });
      }, observerOptions);

      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="relative bg-black text-white w-full">
      {/* Side Chapter Tracker Indicator (Desktop Only) */}
      <div className="fixed right-8 lg:right-16 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-6 items-end">
        {CHAPTERS.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => {
              document.getElementById(`chapter-${ch.id}`)?.scrollIntoView({ behavior: "smooth" });
            }}
            className="group flex items-center gap-4 text-right cursor-pointer"
          >
            <span
              className={`font-mono text-[10px] tracking-wider transition-all duration-300 ${
                activeChapter === idx ? "text-white scale-110" : "text-white/20 group-hover:text-white/60"
              }`}
            >
              {ch.num}
            </span>
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span
                className={`absolute w-[1px] bg-white transition-all duration-500 ${
                  activeChapter === idx ? "h-6 opacity-100" : "h-1 opacity-20 group-hover:h-3 group-hover:opacity-60"
                }`}
              />
            </div>
          </button>
        ))}
      </div>



      {/* Chapter Sections */}
      <div className="relative z-10 flex flex-col w-full py-24">
        {CHAPTERS.map((ch, idx) => {
          const isOdd = idx % 2 === 1;
          return (
            <section
              key={ch.id}
              id={`chapter-${ch.id}`}
              className="min-h-screen flex items-center justify-center py-20 px-6 md:px-12 max-w-7xl mx-auto w-full relative"
            >
              <div
                className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center w-full ${
                  isOdd ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Chapter Image Layer */}
                <div
                  className={`lg:col-span-6 relative aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5] w-full overflow-hidden border border-white/5 rounded bg-neutral-900 group shadow-[0_0_40px_rgba(0,0,0,0.8)] ${
                    isOdd ? "lg:order-last" : ""
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10 pointer-events-none" />
                  <div className="absolute inset-0 noise-bg opacity-[0.03] z-20 pointer-events-none" />

                  {/* High contrast black-and-white images */}
                  <Image
                    src={ch.imageUrl}
                    alt={ch.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className={`w-full h-full object-cover filter grayscale contrast-[1.25] brightness-[0.7] transition-transform duration-1000 group-hover:scale-105 ${
                      ch.id === "enemy" ? "object-[center_35%]" : ""
                    } ${
                      ch.id === "potential" ? "object-[center_40%]" : ""
                    } ${
                      ch.id === "fear" ? "object-[center_35%]" : ""
                    }`}
                  />
                </div>

                {/* Chapter Text Content */}
                <div className="lg:col-span-6 flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-mono text-xs tracking-[0.2em] text-white/30">
                      CHAPTER {ch.num}
                    </span>
                    <div className="h-[1px] w-8 bg-white/20" />
                  </div>

                  <span className="font-orbitron uppercase text-[10px] tracking-[0.3em] text-white/50 block mb-2">
                    {ch.subtitle}
                  </span>

                  <h2 className="font-orbitron uppercase text-[clamp(1.5rem,5vw,2.5rem)] sm:text-5xl tracking-[0.1em] font-bold text-white mb-6 leading-tight">
                    {ch.title}
                  </h2>

                  <p className="font-inter text-xs xs:text-sm sm:text-base leading-relaxed tracking-wide text-white/60 mb-8 max-w-lg">
                    {ch.description}
                  </p>

                  {idx === CHAPTERS.length - 1 ? (
                    // Last chapter redirects to the dashboard
                    <div className="pt-4">
                      {isSignedIn ? (
                        <button
                          onClick={onEnterDashboard}
                          className="group inline-flex items-center gap-3 px-6 py-3 bg-white text-black font-orbitron text-[10px] tracking-widest uppercase hover:bg-black hover:text-white border border-white transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        >
                          Access Sanctuary <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                      ) : (
                        <SignInButton>
                          <button className="group inline-flex items-center gap-3 px-6 py-3 bg-white text-black font-orbitron text-[10px] tracking-widest uppercase hover:bg-black hover:text-white border border-white transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                            Begin Journey <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                          </button>
                        </SignInButton>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-16 px-6 md:px-12 relative z-10 text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="font-orbitron uppercase text-xs tracking-[0.4em] text-white/50 mb-2">
              Procrastination Detector
            </h3>
            <p className="font-inter text-[10px] text-white/30 tracking-wider">
              &copy; {new Date().getFullYear()} DISCIPLINE ACADEMY. ALL RIGHTS RESERVED.
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase">
              Latencies: Zero
            </span>
            <span className="font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase">
              Willpower: Inf.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
