"use client";

import React, { useState, useEffect } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  category: "DUEL" | "SYSTEM" | "REFLECT" | "BATTLE";
  completed: boolean;
}

const DEFAULT_TASKS: Task[] = [
  {
    id: "task_1",
    title: "Synthesize Web Audio oscillators for the sword descent",
    category: "DUEL",
    completed: true,
  },
  {
    id: "task_2",
    title: "Overhaul app layout to support dark luxury style values",
    category: "SYSTEM",
    completed: true,
  },
  {
    id: "task_3",
    title: "Review daily work timeline items and prune avoidances",
    category: "REFLECT",
    completed: false,
  },
  {
    id: "task_4",
    title: "Integrate the Recharts components inside workspace",
    category: "BATTLE",
    completed: false,
  },
];

export default function TaskTimeline() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Load tasks on mount
  useEffect(() => {
    const saved = localStorage.getItem("pd_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        setTasks(DEFAULT_TASKS);
      }
    } else {
      setTasks(DEFAULT_TASKS);
    }
  }, []);

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem("pd_tasks", JSON.stringify(updatedTasks));
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent toggle event
    const updated = tasks.filter((task) => task.id !== id);
    saveTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      category: "BATTLE",
      completed: false,
    };

    saveTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  return (
    <div className="bg-card border border-border p-6 rounded flex flex-col justify-between w-full h-full relative group">
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
            className="px-3 bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center rounded cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Task List in a vertical timeline style */}
        <div className="relative pl-6 flex flex-col gap-5">
          {/* Vertical line indicator */}
          <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-white/10" />

          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className="relative flex items-start justify-between cursor-pointer group/item"
            >
              {/* Bullet Node */}
              <div
                className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border transition-all ${
                  task.completed
                    ? "bg-white border-white scale-110 shadow-[0_0_8px_#ffffff]"
                    : "bg-black border-white/30 group-hover/item:border-white/60"
                }`}
              />

              <div className="flex flex-col gap-1 pr-6 flex-1 min-w-0">
                <span
                  className={`font-inter text-xs tracking-wide transition-all break-words truncate-none ${
                    task.completed ? "text-white/30 line-through" : "text-white"
                  }`}
                >
                  {task.title}
                </span>
                
                {/* Category Badge */}
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

              {/* Trash/delete action */}
              <button
                onClick={(e) => deleteTask(task.id, e)}
                className="opacity-0 group-hover/item:opacity-40 hover:opacity-100 hover:text-red-400 p-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {tasks.length === 0 && (
            <p className="text-white/20 text-xs italic py-2">
              Timeline is clear. Rest is preparation.
            </p>
          )}
        </div>
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
