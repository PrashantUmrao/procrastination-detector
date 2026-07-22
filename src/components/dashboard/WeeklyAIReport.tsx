"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export default function WeeklyAIReport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const triggerReanalysis = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
              Weekly AI Report
            </h3>
          </div>
          <button
            onClick={triggerReanalysis}
            className="p-1 text-white/20 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin text-white" : ""}`} />
          </button>
        </div>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-4 h-4 border border-t-white border-white/10 rounded-full animate-spin" />
            <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
              Analyzing avoidances...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40 block mb-1">
                Procrastination Forecast
              </span>
              <p className="font-inter text-xs text-white/70 leading-relaxed tracking-wide">
                Willpower leakage predicted for Friday evening. High probability of task avoidance starting after 17:00 due to mental depletion. Suggest schedule locking.
              </p>
            </div>

            <div>
              <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40 block mb-1">
                Tactical Directives
              </span>
              <ul className="font-inter text-xs text-white/60 flex flex-col gap-2 tracking-wide">
                <li className="flex gap-2">
                  <span className="font-mono text-white/30">01.</span>
                  <span>Break database refactoring into 3 small micro-duels.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-white/30">02.</span>
                  <span>Commit morning tasks before engaging in communication tools.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-white/30">03.</span>
                  <span>Shut down workspace completely once focus breaks twice.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <span>Forecast Integrity</span>
        <span className="text-white">94.2%</span>
      </div>
    </div>
  );
}
