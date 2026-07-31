"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

interface InsightsData {
  antiProcrastinationScore: number;
  mostProductiveDay: string;
  mostInterruptedDay: string;
  averageInterruptionTime: number; // in seconds
  longestUninterruptedFocus: number; // in seconds
  bestFocusStreak: number;
  mostCommonExitTime: string;
  totalCompleted: number;
  totalInterrupted: number;
}

interface WeeklyAIReportProps {
  insights?: InsightsData | null;
  onRefresh?: () => Promise<void> | void;
}

export default function WeeklyAIReport({ insights: propInsights, onRefresh }: WeeklyAIReportProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localInsights, setLocalInsights] = useState<InsightsData | null>(null);
  const [hasError, setHasError] = useState(false);

  const insights = propInsights !== undefined ? propInsights : localInsights;

  const fetchInsights = useCallback(async () => {
    setHasError(false);
    if (onRefresh) {
      try {
        await onRefresh();
      } catch {
        setHasError(true);
      }
      return;
    }
    try {
      const res = await fetch("/api/anti-procrastination/insights");
      if (res.ok) {
        const data = await res.json();
        setLocalInsights(data);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (propInsights === undefined) {
      let active = true;
      const load = async () => {
        setHasError(false);
        try {
          const res = await fetch("/api/anti-procrastination/insights");
          if (res.ok) {
            const data = await res.json();
            if (active) {
              setLocalInsights(data);
            }
          } else {
            if (active) setHasError(true);
          }
        } catch {
          if (active) setHasError(true);
        }
      };
      load();
      return () => {
        active = false;
      };
    } else if (propInsights === null) {
      // Parent load returned null/empty
      const timer = setTimeout(() => {
        setHasError(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [propInsights]);

  const triggerReanalysis = async () => {
    setIsGenerating(true);
    await fetchInsights();
    setTimeout(() => {
      setIsGenerating(false);
    }, 800);
  };

  const formatSecsToMins = (secs: number) => {
    const mins = Math.round(secs / 60);
    return mins > 0 ? `${mins}m` : `${secs}s`;
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
              Weekly AI Insights
            </h3>
          </div>
          <button
            onClick={triggerReanalysis}
            className="p-1 text-white/20 hover:text-white transition-all cursor-pointer"
            title="Refresh Insights"
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin text-white" : ""}`} />
          </button>
        </div>

        {hasError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/5 rounded bg-black/20 text-center">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.2em] text-white/40 mb-2">
              Unavailable
            </span>
            <p className="font-inter text-[10px] text-white/20 leading-relaxed max-w-[200px]">
              Unable to load insights. Complete more Focus Sessions to generate analytics.
            </p>
          </div>
        ) : isGenerating || !insights ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-4 h-4 border border-t-white border-white/10 rounded-full animate-spin" />
            <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
              Analyzing avoidances...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Anti-Procrastination Score */}
            <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-4 rounded-lg">
              <div className="flex flex-col">
                <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40 mb-0.5">
                  Anti-Procrastination
                </span>
                <span className="font-mono text-[8px] text-white/30 uppercase">Willpower Metric</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold text-white text-glow">
                  {insights.antiProcrastinationScore}
                </span>
                <span className="font-mono text-xs text-white/30">/ 100</span>
              </div>
            </div>

            {/* AI Focus Insights */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="flex flex-col p-2.5 bg-white/[0.01] border border-white/[0.02] rounded">
                <span className="text-[8px] text-white/30 uppercase mb-1">Productive Peak</span>
                <span className="text-white font-bold">{insights.mostProductiveDay}</span>
              </div>
              <div className="flex flex-col p-2.5 bg-white/[0.01] border border-white/[0.02] rounded">
                <span className="text-[8px] text-white/30 uppercase mb-1">Leak Risk Peak</span>
                <span className="text-red-400 font-bold">{insights.mostInterruptedDay}</span>
              </div>
              <div className="flex flex-col p-2.5 bg-white/[0.01] border border-white/[0.02] rounded">
                <span className="text-[8px] text-white/30 uppercase mb-1">Streak Record</span>
                <span className="text-white font-bold">{insights.bestFocusStreak} sessions</span>
              </div>
              <div className="flex flex-col p-2.5 bg-white/[0.01] border border-white/[0.02] rounded">
                <span className="text-[8px] text-white/30 uppercase mb-1">Exit Time Risk</span>
                <span className="text-white font-bold">{insights.mostCommonExitTime}</span>
              </div>
            </div>

            {/* Directive Guidance */}
            <div>
              <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/40 block mb-1">
                Willpower Guidance
              </span>
              <p className="font-inter text-xs text-white/70 leading-relaxed tracking-wide">
                {insights.totalInterrupted > 0
                  ? `You had ${insights.totalInterrupted} interrupted sessions this week. Exits happened mostly around ${formatSecsToMins(insights.averageInterruptionTime)} elapsed. Keep using Lock-In commit routines to stabilize deep focus.`
                  : "Excellent focus stability! Your mind shows perfect composure with zero avoidances recorded. Keep maintaining this deep rhythm."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-t-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <span>Forecast Integrity</span>
        <span className="text-white">96.8%</span>
      </div>
    </div>
  );
}
