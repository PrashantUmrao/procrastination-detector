"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Task {
  _id: string;
  title: string;
  category: "DUEL" | "SYSTEM" | "REFLECT" | "BATTLE";
  completed: boolean;
}

export default function TaskTimeline() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Edit Inline States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<"DUEL" | "SYSTEM" | "REFLECT" | "BATTLE">("BATTLE");

  // Fetch all tasks from MongoDB
  const fetchTasksList = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasksList();
  }, [fetchTasksList]);

  // Toggle completion status (Optimistic Update)
  const toggleTask = async (id: string, currentCompleted: boolean) => {
    if (editingTaskId === id) return; // Disable toggle click when editing

    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, completed: !currentCompleted } : t))
      );

      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted }),
      });

      if (!res.ok) {
        await fetchTasksList();
      } else {
        // Broadcast change event to trigger Procrastination Score and Combat Analytics update
        window.dispatchEvent(new Event("taskUpdated"));
      }
    } catch (e) {
      console.error("Failed to toggle task:", e);
      await fetchTasksList();
    }
  };

  // Delete task from timeline
  const deleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setTasks((prev) => prev.filter((t) => t._id !== id));

      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        await fetchTasksList();
      } else {
        window.dispatchEvent(new Event("taskUpdated"));
      }
    } catch (e) {
      console.error("Failed to delete task:", e);
      await fetchTasksList();
    }
  };

  // Add new task to timeline
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          category: "BATTLE",
        }),
      });

      if (res.ok) {
        setNewTaskTitle("");
        await fetchTasksList();
        window.dispatchEvent(new Event("taskUpdated"));
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Enable edit mode
  const startEditing = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task._id);
    setEditTitle(task.title);
    setEditCategory(task.category);
  };

  // Cancel edit mode
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(null);
  };

  // Save task modifications
  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          category: editCategory,
        }),
      });

      if (res.ok) {
        setEditingTaskId(null);
        await fetchTasksList();
        window.dispatchEvent(new Event("taskUpdated"));
      }
    } catch (err) {
      console.error("Failed to edit task:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group select-none">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-orbitron uppercase text-xs tracking-widest text-white/50">
            Task Timeline
          </h3>
          <span className="font-mono text-[9px] text-white/30 tracking-widest uppercase">
            Active Combat
          </span>
        </div>

        {/* Form to add a new task */}
        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Add to timeline..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-black border border-white/10 px-3 py-2 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center rounded cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Task List in vertical timeline */}
        {isLoading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-4 h-4 border border-t-white border-white/10 rounded-full animate-spin" />
            <span className="font-mono text-[9px] tracking-widest text-white/20 uppercase">
              Loading Timeline...
            </span>
          </div>
        ) : (
          <div className="relative pl-6 flex flex-col gap-5">
            {/* Vertical line indicator */}
            <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-white/10" />

            {tasks.map((task) => {
              const isEditingThis = editingTaskId === task._id;

              return (
                <div
                  key={task._id}
                  onClick={() => toggleTask(task._id, task.completed)}
                  className="relative flex items-center justify-between cursor-pointer group/item min-h-12"
                >
                  {/* Bullet Node */}
                  <div
                    className={`absolute -left-6 top-[18px] w-2.5 h-2.5 rounded-full border transition-all ${
                      task.completed
                        ? "bg-white border-white scale-110 shadow-[0_0_8px_#ffffff]"
                        : "bg-black border-white/30 group-hover/item:border-white/60"
                    }`}
                  />

                  {isEditingThis ? (
                    /* Inline Editing Form */
                    <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 pr-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-black border border-white/10 px-2 py-1 text-xs font-inter text-white placeholder-white/20 focus:outline-none focus:border-white/30 rounded flex-1 min-w-0"
                      />
                      <div className="flex gap-2 items-center shrink-0">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as any)}
                          className="bg-black border border-white/10 px-2 py-1 text-[10px] font-mono text-white/50 focus:outline-none focus:border-white/30 rounded cursor-pointer h-7"
                        >
                          <option value="BATTLE">BATTLE</option>
                          <option value="DUEL">DUEL</option>
                          <option value="SYSTEM">SYSTEM</option>
                          <option value="REFLECT">REFLECT</option>
                        </select>
                        <button
                          onClick={(e) => handleSaveEdit(task._id, e)}
                          className="px-2.5 py-1 border border-white/30 hover:border-white/60 text-white font-orbitron text-[9px] tracking-wider uppercase rounded cursor-pointer h-7 bg-white/5"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/60 font-orbitron text-[9px] tracking-wider uppercase rounded cursor-pointer h-7"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Static Render Box */
                    <>
                      <div className="flex flex-col gap-1 pr-6 flex-1 min-w-0 py-1">
                        <span
                          className={`font-inter text-xs tracking-wide transition-all break-words truncate-none ${
                            task.completed ? "text-white/30 line-through" : "text-white"
                          }`}
                        >
                          {task.title}
                        </span>
                        <span
                          className={`font-mono text-[8px] tracking-widest w-fit uppercase ${
                            task.completed
                              ? "text-white/15"
                              : task.category === "DUEL"
                              ? "text-white/40"
                              : "text-white/25"
                          }`}
                        >
                          {task.category}
                        </span>
                      </div>

                      {/* Hover/Mobile Action Buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {/* Edit pencil icon */}
                        <button
                          onClick={(e) => startEditing(task, e)}
                          className="opacity-55 hover:opacity-100 md:opacity-0 md:group-hover/item:opacity-40 md:hover:opacity-100 hover:text-white p-1 transition-all cursor-pointer"
                          title="Edit Task"
                        >
                          <Pencil className="w-3 h-3 text-white/40 hover:text-white" />
                        </button>
                        {/* Delete trash icon */}
                        <button
                          onClick={(e) => deleteTask(task._id, e)}
                          className="opacity-55 hover:opacity-100 md:opacity-0 md:group-hover/item:opacity-40 md:hover:opacity-100 hover:text-red-400 p-1 transition-all cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {tasks.length === 0 && !isLoading && (
              <p className="text-white/20 text-xs italic py-2">
                Timeline is clear. Rest is preparation.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/30 font-mono tracking-wider uppercase">
        <span>Completion Ratio</span>
        <span className="text-white">
          {tasks.length > 0
            ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
            : 0}
          %
        </span>
      </div>
    </div>
  );
}
