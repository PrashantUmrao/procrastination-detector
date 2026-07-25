"use client";

import React, { useState, useEffect } from "react";
import { Check, Flame } from "lucide-react";

interface Habit {
  id: string;
  name: string;
  streak: number;
  maxStreak: number;
  completedToday: boolean;
}

const DEFAULT_HABITS: Habit[] = [
  {
    id: "habit_1",
    name: "Rise Before Dawn (06:00 AM)",
    streak: 5,
    maxStreak: 12,
    completedToday: false,
  },
  {
    id: "habit_2",
    name: "Write Tasks Before Action",
    streak: 3,
    maxStreak: 8,
    completedToday: false,
  },
  {
    id: "habit_3",
    name: "Three Focus Duels (75m Total)",
    streak: 7,
    maxStreak: 15,
    completedToday: false,
  },
  {
    id: "habit_4",
    name: "Reflect On Today's Avoidances",
    streak: 0,
    maxStreak: 4,
    completedToday: false,
  },
];

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);

  // Load habits from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("pd_habits");
    const timer = setTimeout(() => {
      if (saved) {
        try {
          setHabits(JSON.parse(saved));
        } catch {
          setHabits(DEFAULT_HABITS);
        }
      } else {
        setHabits(DEFAULT_HABITS);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const saveHabits = (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);
    localStorage.setItem("pd_habits", JSON.stringify(updatedHabits));
  };

  const toggleHabit = (id: string) => {
    const updated = habits.map((habit) => {
      if (habit.id === id) {
        const completed = !habit.completedToday;
        const newStreak = completed ? habit.streak + 1 : Math.max(0, habit.streak - 1);
        const newMax = Math.max(habit.maxStreak, newStreak);
        return {
          ...habit,
          completedToday: completed,
          streak: newStreak,
          maxStreak: newMax,
        };
      }
      return habit;
    });
    saveHabits(updated);
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
            Daily Habits
          </h3>
          <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
            Discipline Loop
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className="flex items-center justify-between p-3.5 border border-white/5 hover:border-white/10 hover:bg-white/[0.01] rounded transition-all cursor-pointer group/item"
            >
              <div className="flex items-center gap-4 pr-4 flex-1 min-w-0">
                {/* Custom Checkbox */}
                <div
                  className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-all shrink-0 ${
                    habit.completedToday
                      ? "bg-white border-white text-black"
                      : "border-white/20 group-hover/item:border-white/50"
                  }`}
                >
                  {habit.completedToday && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <span
                  className={`font-inter text-xs tracking-wide transition-all break-words truncate-none flex-1 min-w-0 ${
                    habit.completedToday ? "text-white/40 line-through" : "text-white"
                  }`}
                >
                  {habit.name}
                </span>
              </div>

              {/* Streak info */}
              <div className="flex items-center gap-1.5 text-white/30 group-hover/item:text-white/60 transition-all select-none shrink-0">
                <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? "text-white" : ""}`} />
                <span className="font-mono text-[10px] tracking-wider">
                  {habit.streak}d
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <span>Completion Rate</span>
        <span className="text-white">
          {habits.length > 0
            ? Math.round((habits.filter((h) => h.completedToday).length / habits.length) * 100)
            : 0}
          %
        </span>
      </div>
    </div>
  );
}
