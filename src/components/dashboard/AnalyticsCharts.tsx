"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface TooltipPayloadItem {
  value: number;
  payload: {
    day: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-white/10 p-3 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <p className="font-orbitron text-[9px] text-white/50 uppercase tracking-widest mb-1.5">
          {payload[0].payload.day} Battle
        </p>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-white">
            FOCUS: {payload[0].value}%
          </span>
          <span className="font-mono text-xs text-white/40">
            AVOID: {payload[1].value}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

interface AnalyticsChartsProps {
  weeklyAnalytics?: {
    totalFocusTime: number;
    completedFocusSessions: number;
    completedAntiProc: number;
    interruptedAntiProc: number;
    totalDistractions: number;
    averageFocusScore: number;
    lockSessionsCount: number;
    successfulLockSessionsCount: number;
    habitsCompletionRate?: number;
    habitsConsistency?: number;
    disciplineScore?: number;
    tasksCompleted?: number;
    tasksPending?: number;
    tasksCompletionRatio?: number;
  };
  monthlyAnalytics?: {
    totalFocusTime: number;
    completedFocusSessions: number;
    completedAntiProc: number;
    interruptedAntiProc: number;
    totalDistractions: number;
    averageFocusScore: number;
    lockSessionsCount: number;
    successfulLockSessionsCount: number;
    habitsCompletionRate?: number;
    habitsConsistency?: number;
    disciplineScore?: number;
    tasksCompleted?: number;
    tasksPending?: number;
    tasksCompletionRatio?: number;
  };
  productivityTrends?: Array<{
    date: string;
    focusMinutes: number;
    averageFocusScore: number;
    antiProcrastinationScore: number;
  }>;
}

export default function AnalyticsCharts({
  weeklyAnalytics,
  productivityTrends,
}: AnalyticsChartsProps = {}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-64 bg-card border border-border rounded flex items-center justify-center">
        <span className="font-orbitron uppercase text-[9px] tracking-widest text-white/20 animate-pulse">
          Calibrating Chronometers...
        </span>
      </div>
    );
  }

  const getDayName = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("en-US", { weekday: "short" });
      }
    } catch {}
    return dateStr;
  };

  const hasData = productivityTrends && productivityTrends.some(
    (item) => item.focusMinutes > 0 || (item.averageFocusScore > 0 && item.averageFocusScore !== 80) || item.antiProcrastinationScore < 100
  );

  const chartData = hasData && productivityTrends
    ? productivityTrends.slice(-7).map((item) => ({
        day: getDayName(item.date),
        focus: item.averageFocusScore,
        procrast: 100 - item.antiProcrastinationScore,
      }))
    : [];



  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
            Combat Analytics
          </h3>
          <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
            Focus Wave
          </span>
        </div>

        {hasData ? (
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.06} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.05)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#focusColor)"
                />
                <Area
                  type="monotone"
                  dataKey="procrast"
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full h-56 flex flex-col items-center justify-center border border-dashed border-white/5 rounded bg-black/20 px-4">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.2em] text-white/40 mb-2">
              No Combat Logs
            </span>
            <p className="font-inter text-[10px] text-white/20 text-center max-w-[240px] leading-relaxed">
              Establish focus timelines and complete tasks or daily habits to generate performance wave analytics.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <div className="flex justify-between items-center">
          <span>Weekly Focus</span>
          <span className="text-white">
            {weeklyAnalytics && weeklyAnalytics.totalFocusTime > 0 ? `${weeklyAnalytics.totalFocusTime}m` : "No data yet"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Discipline Score</span>
          <span className="text-white">
            {weeklyAnalytics && weeklyAnalytics.disciplineScore !== undefined && weeklyAnalytics.disciplineScore > 0 ? `${weeklyAnalytics.disciplineScore}%` : "No data yet"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Task Completion</span>
          <span className="text-white">
            {weeklyAnalytics && weeklyAnalytics.tasksCompletionRatio !== undefined && weeklyAnalytics.tasksCompletionRatio > 0 ? `${weeklyAnalytics.tasksCompletionRatio}%` : "No data yet"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Habit Rate</span>
          <span className="text-white">
            {weeklyAnalytics && weeklyAnalytics.habitsCompletionRate !== undefined && weeklyAnalytics.habitsCompletionRate > 0 ? `${weeklyAnalytics.habitsCompletionRate}%` : "No data yet"}
          </span>
        </div>
      </div>
    </div>
  );
}
