"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, Flame, Trash2, GripVertical } from "lucide-react";

interface Habit {
  _id: string;
  title: string;
  time?: string;
  category?: string;
  completedToday: boolean;
  streak: number;
  maxStreak: number;
  displayOrder: number;
  isDefault: boolean;
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableHabits, setEditableHabits] = useState<Habit[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null);

  // Add Routine Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitTime, setNewHabitTime] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("Personal");

  const [hasError, setHasError] = useState(false);

  // Fetch habits list from MongoDB
  const fetchHabitsList = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch("/api/habits");
      if (res.ok) {
        const data = await res.json();
        setHabits(data);
      } else {
        setHasError(true);
      }
    } catch (e) {
      console.error("Failed to load habits:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHabitsList();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHabitsList]);

  // Start Edit Mode
  const startEditing = () => {
    setEditableHabits(JSON.parse(JSON.stringify(habits))); // deep clone
    setIsEditing(true);
  };

  // Cancel Edit Mode
  const cancelEditing = () => {
    setIsEditing(false);
    setEditableHabits([]);
  };

  // Save edits and reordered lists
  const saveReorderAndEdits = async () => {
    try {
      setIsLoading(true);

      // 1. Identify deleted habits and sync delete requests
      const currentIds = new Set(editableHabits.map((h) => h._id));
      const deletedHabits = habits.filter((h) => !currentIds.has(h._id));
      for (const h of deletedHabits) {
        await fetch(`/api/habits/${h._id}`, { method: "DELETE" });
      }

      // 2. Map displayOrder to array index for manual reordering
      const reorderedList = editableHabits.map((h, index) => ({
        ...h,
        displayOrder: index,
      }));

      // Update ordering batch-wise
      await fetch("/api/habits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habits: reorderedList }),
      });

      // 3. Update field modifications (title, time) for existing habits
      for (const h of reorderedList) {
        const original = habits.find((o) => o._id === h._id);
        if (original && (original.title !== h.title || original.time !== h.time)) {
          await fetch(`/api/habits/${h._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: h.title, time: h.time }),
          });
        }
      }

      await fetchHabitsList();
      setIsEditing(false);
      window.dispatchEvent(new Event("habitUpdated"));
    } catch (e) {
      console.error("Failed to save habits routine:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle habit completion status (Optimistic update)
  const toggleHabit = async (id: string, currentCompleted: boolean) => {
    try {
      setHabits((prev) =>
        prev.map((h) => {
          if (h._id === id) {
            const completed = !currentCompleted;
            const newStreak = completed ? h.streak + 1 : Math.max(0, h.streak - 1);
            return {
              ...h,
              completedToday: completed,
              streak: newStreak,
              maxStreak: Math.max(h.maxStreak, newStreak),
            };
          }
          return h;
        })
      );

      const res = await fetch(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedToday: !currentCompleted }),
      });

      if (!res.ok) {
        await fetchHabitsList();
      } else {
        window.dispatchEvent(new Event("habitUpdated"));
      }
    } catch (e) {
      console.error("Failed to toggle completion status:", e);
      await fetchHabitsList();
    }
  };

  // Add routine submit handler
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newHabitTitle.trim(),
          time: newHabitTime.trim(),
          category: newHabitCategory,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewHabitTitle("");
        setNewHabitTime("");
        setNewHabitCategory("Personal");
        await fetchHabitsList();
        window.dispatchEvent(new Event("habitUpdated"));
      }
    } catch (err) {
      console.error("Failed to add custom routine:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete habit from editable local list
  const deleteLocalHabit = (index: number) => {
    const updated = [...editableHabits];
    updated.splice(index, 1);
    setEditableHabits(updated);
  };

  // Inline inputs rename and time updates for edit mode
  const updateLocalTitle = (index: number, val: string) => {
    const updated = [...editableHabits];
    updated[index].title = val;
    setEditableHabits(updated);
  };

  const updateLocalTime = (index: number, val: string) => {
    const updated = [...editableHabits];
    updated[index].time = val;
    setEditableHabits(updated);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...editableHabits];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setEditableHabits(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
      <div>
        {/* Dynamic Responsive Header & Buttons Layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
              Daily Habits
            </h3>
            <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
              Discipline Loop
            </span>
          </div>

          <div className="flex gap-2 items-center">
            {!isEditing ? (
              <>
                <button
                  onClick={startEditing}
                  disabled={isLoading}
                  className="px-2.5 py-1 border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  Edit Routine
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  disabled={isLoading}
                  className="px-2.5 py-1 border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  + Add Routine
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveReorderAndEdits}
                  className="px-2.5 py-1 border border-white/30 hover:border-white/60 text-white font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded cursor-pointer bg-white/5 active:scale-95"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-2.5 py-1 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/60 font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Habits Render List */}
        {hasError ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/5 rounded bg-black/20 text-center">
            <span className="font-orbitron uppercase text-[9px] tracking-[0.2em] text-white/40 mb-2">
              Unavailable
            </span>
            <p className="font-inter text-[10px] text-white/20 leading-relaxed mb-4 max-w-[200px]">
              Unable to load habits.
            </p>
            <button
              onClick={fetchHabitsList}
              className="px-3 py-1.5 border border-white/20 hover:border-white/40 text-white font-orbitron text-[9px] tracking-wider uppercase rounded cursor-pointer hover:bg-white/5 transition-all active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : isLoading && habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-4 h-4 border border-t-white border-white/10 rounded-full animate-spin" />
            <span className="font-mono text-[9px] tracking-widest text-white/20 uppercase">
              Loading Loop...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(isEditing ? editableHabits : habits).map((habit, index) => {
              const isItemDragged = draggedIndex === index;

              return (
                <div
                  key={habit._id || index}
                  draggable={isEditing && dragActiveIndex === index}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => {
                    handleDragEnd();
                    setDragActiveIndex(null);
                  }}
                  onClick={() => !isEditing && toggleHabit(habit._id, habit.completedToday)}
                  className={`flex items-center justify-between p-3 border border-white/5 rounded transition-all select-none ${
                    isEditing
                      ? "border-dashed border-white/10 bg-white/[0.005] cursor-grab active:cursor-grabbing"
                      : "hover:border-white/10 hover:bg-white/[0.01] cursor-pointer"
                  } ${isItemDragged ? "opacity-40 border-white/20" : ""}`}
                >
                  {/* Left Controls & Rename Inputs */}
                  <div className="flex items-center gap-3 pr-4 flex-1 min-w-0">
                    {isEditing ? (
                      <>
                        <GripVertical
                          className="w-3.5 h-3.5 text-white/20 shrink-0 cursor-grab active:cursor-grabbing"
                          onMouseDown={() => setDragActiveIndex(index)}
                          onMouseUp={() => setDragActiveIndex(null)}
                          onMouseLeave={() => setDragActiveIndex(null)}
                        />
                        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            required
                            value={habit.title}
                            onChange={(e) => updateLocalTitle(index, e.target.value)}
                            className="bg-transparent border-b border-white/10 focus:border-white/30 focus:outline-none text-xs font-inter text-white flex-1 min-w-0 py-0.5"
                          />
                          <input
                            type="text"
                            placeholder="Optional Time"
                            value={habit.time || ""}
                            onChange={(e) => updateLocalTime(index, e.target.value)}
                            className="bg-transparent border-b border-white/10 focus:border-white/30 focus:outline-none text-[10px] font-mono text-white/40 w-24 py-0.5 shrink-0"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Interactive Checkbox */}
                        <div
                          className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-all shrink-0 ${
                            habit.completedToday
                              ? "bg-white border-white text-black"
                              : "border-white/20 group-hover:border-white/50"
                          }`}
                        >
                          {habit.completedToday && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Title & Optional Time */}
                        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                          <span
                            className={`font-inter text-xs tracking-wide transition-all truncate-none break-words ${
                              habit.completedToday ? "text-white/45 line-through" : "text-white"
                            }`}
                          >
                            {habit.title}
                          </span>
                          {habit.time && (
                            <span className="font-mono text-[8px] tracking-wider text-white/30">
                              {habit.time}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Actions & Streaks */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLocalHabit(index);
                        }}
                        className="text-white/25 hover:text-red-400 p-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-white/30 group-hover:text-white/60 transition-all select-none">
                        <Flame className={`w-3.5 h-3.5 ${habit.streak > 0 ? "text-white" : ""}`} />
                        <span className="font-mono text-[10px] tracking-wider">
                          {habit.streak}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {habits.length === 0 && !isLoading && (
              <p className="text-white/20 text-xs italic py-4 text-center">
                Discipline loop is empty. Let&apos;s add a routine!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Completion Rate Footer */}
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <span>Completion Rate</span>
        <span className="text-white">
          {habits.length > 0
            ? Math.round((habits.filter((h) => h.completedToday).length / habits.length) * 100)
            : 0}
          %
        </span>
      </div>

      {/* Light-weight Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-neutral-950 border border-white/10 p-6 rounded-lg w-full max-w-sm flex flex-col gap-4 shadow-2xl relative">
            <div>
              <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase block mb-1">
                DISCIPLINE LOOP
              </span>
              <h4 className="font-orbitron uppercase text-sm tracking-widest text-white font-bold">
                New Routine
              </h4>
            </div>

            <form onSubmit={handleAddHabit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                  Routine Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 20 Pages"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="bg-black border border-white/10 px-3 py-2 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                  Target Time (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6:00 AM"
                  value={newHabitTime}
                  onChange={(e) => setNewHabitTime(e.target.value)}
                  className="bg-black border border-white/10 px-3 py-2 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                  Category
                </label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                  className="bg-black border border-white/10 px-3 py-2 text-xs font-inter text-white focus:outline-none focus:border-white/30 rounded cursor-pointer"
                >
                  <option value="Personal">Personal</option>
                  <option value="Morning">Morning</option>
                  <option value="Work">Work</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Study">Study</option>
                  <option value="Health">Health</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewHabitTitle("");
                    setNewHabitTime("");
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/60 font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black hover:bg-neutral-200 font-orbitron text-[9px] tracking-wider uppercase transition-all duration-300 rounded font-bold cursor-pointer"
                >
                  Add Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
