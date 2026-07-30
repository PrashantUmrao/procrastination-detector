import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { dbConnect } from "@/lib/mongodb";
import FocusSession from "@/models/FocusSession";
import AntiProcrastinationSession from "@/models/AntiProcrastinationSession";
import LockInSession from "@/models/LockInSession";
import Habit from "@/models/Habit";
import Task from "@/models/Task";

// ==========================================
// 0. Request-Scoped Memoized Fetch Helpers
// ==========================================

export const fetchRawFocusSessions = cache(async function fetchRawFocusSessions(userId: string) {
  await dbConnect();
  return FocusSession.find({ userId }).sort({ startedAt: -1 }).lean();
});

export const fetchRawAntiProcrastinationSessions = cache(async function fetchRawAntiProcrastinationSessions(userId: string) {
  await dbConnect();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  return AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  }).sort({ startedAt: -1 }).lean();
});

export const fetchRawLockInSessions = cache(async function fetchRawLockInSessions(userId: string) {
  await dbConnect();
  return LockInSession.find({ userId }).sort({ startedAt: -1 }).lean();
});

export const fetchRawHabits = cache(async function fetchRawHabits(userId: string) {
  await dbConnect();
  let habits = await Habit.find({ userId }).sort({ displayOrder: 1 }).lean();
  if (habits.length === 0) {
    const DEFAULT_HABITS_TEMPLATE = [
      { title: "Wake Before 6:00 AM", time: "6:00 AM", category: "Morning", displayOrder: 0, isDefault: true, completedToday: false, streak: 0, maxStreak: 0 },
      { title: "Plan Your Day Before Starting", time: "", category: "Work", displayOrder: 1, isDefault: true, completedToday: false, streak: 0, maxStreak: 0 },
      { title: "Complete Three Focus Duels", time: "", category: "Work", displayOrder: 2, isDefault: true, completedToday: false, streak: 0, maxStreak: 0 },
      { title: "Review Today's Progress", time: "8:30 PM", category: "Personal", displayOrder: 3, isDefault: true, completedToday: false, streak: 0, maxStreak: 0 },
    ];
    const recordsToInsert = DEFAULT_HABITS_TEMPLATE.map((h) => ({ ...h, userId }));
    await Habit.insertMany(recordsToInsert);
    habits = await Habit.find({ userId }).sort({ displayOrder: 1 }).lean();
  }
  return habits;
});

export const fetchRawTasks = cache(async function fetchRawTasks(userId: string) {
  await dbConnect();
  let tasks = await Task.find({ userId }).sort({ displayOrder: 1 }).lean();
  if (tasks.length === 0) {
    const DEFAULT_TASKS_TEMPLATE = [
      { title: "Synthesize Web Audio oscillators for the sword descent", category: "DUEL", completed: true, displayOrder: 0 },
      { title: "Overhaul app layout to support dark luxury style values", category: "SYSTEM", completed: true, displayOrder: 1 },
      { title: "Review daily work timeline items and prune avoidances", category: "REFLECT", completed: false, displayOrder: 2 },
      { title: "Integrate the Recharts components inside workspace", category: "BATTLE", completed: false, displayOrder: 3 },
    ];
    const recordsToInsert = DEFAULT_TASKS_TEMPLATE.map((t) => ({ ...t, userId }));
    await Task.insertMany(recordsToInsert);
    tasks = await Task.find({ userId }).sort({ displayOrder: 1 }).lean();
  }
  return tasks;
});

// ==========================================
// 1. Procrastination Score
// ==========================================
export const getProcrastinationScore = cache(async function getProcrastinationScore(userId: string): Promise<number> {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const [habits, tasks] = await Promise.all([
    fetchRawHabits(userId),
    fetchRawTasks(userId),
  ]);

  if (habits.length === 0 && tasks.length === 0) {
    return 0;
  }

  let habitsRate = 1.0;
  if (habits.length > 0) {
    const completed = habits.filter((h) => h.completedToday).length;
    habitsRate = completed / habits.length;
  }

  let tasksRate = 1.0;
  if (tasks.length > 0) {
    const completed = tasks.filter((t) => t.completed).length;
    tasksRate = completed / tasks.length;
  }

  const completionAverage = (habitsRate + tasksRate) / 2;
  const score = Math.max(0, Math.min(100, Math.round(100 - (completionAverage * 100))));
  return score;
});

// ==========================================
// 2. Dashboard Analytics (Caches Focus stats + Lock-in stats)
// ==========================================
export const getDashboardAnalytics = cache(async function getDashboardAnalytics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  // Focus Stats Calculations
  const sessions = await fetchRawFocusSessions(userId);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaysCompletedSessions = sessions.filter(
    (s) => s.type === "focus" && s.completed && new Date(s.startedAt) >= startOfToday
  );
  const todaysFocusTime = Math.round(todaysCompletedSessions.reduce((acc, s) => acc + s.duration, 0) / 60);
  const completedSessions = sessions.filter((s) => s.type === "focus" && s.completed).length;

  const totalPauses = sessions.reduce((acc, s) => acc + (s.distractions || 0), 0);
  const incompleteFocusSessions = sessions.filter((s) => s.type === "focus" && !s.completed).length;
  const distractions = totalPauses + incompleteFocusSessions;

  // Lock-In Stats Calculations
  const lockSessions = await fetchRawLockInSessions(userId);
  let averageLockDuration = 0;
  let successfulLockSessions = 0;
  let longestLock = 0;
  let averageInterruptions = 0;
  let lockCompletionRate = 0;

  if (lockSessions.length > 0) {
    const totalLockSessions = lockSessions.length;
    const completedLockSessions = lockSessions.filter((s) => s.completed).length;

    let totalLockDuration = 0;
    let totalLockInterruptions = 0;

    lockSessions.forEach((s) => {
      totalLockDuration += s.lockDuration;
      if (s.lockDuration > longestLock) {
        longestLock = s.lockDuration;
      }
      totalLockInterruptions += s.distractionCount;
    });

    averageLockDuration = Math.round(totalLockDuration / totalLockSessions);
    averageInterruptions = parseFloat((totalLockInterruptions / totalLockSessions).toFixed(1));
    lockCompletionRate = Math.round((completedLockSessions / totalLockSessions) * 100);
    successfulLockSessions = completedLockSessions;
  }

  return {
    focusStats: {
      todaysFocusTime,
      completedSessions,
      distractions,
    },
    lockInStats: {
      averageLockDuration,
      successfulLockSessions,
      longestLock,
      averageInterruptions,
      lockCompletionRate,
    },
  };
});

// ==========================================
// 3. Weekly Statistics
// ==========================================
export const getWeeklyStatistics = cache(async function getWeeklyStatistics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [rawFocus, rawAntiProc, rawLock, habits, tasks] = await Promise.all([
    fetchRawFocusSessions(userId),
    fetchRawAntiProcrastinationSessions(userId),
    fetchRawLockInSessions(userId),
    fetchRawHabits(userId),
    fetchRawTasks(userId),
  ]);

  const focusSessions = rawFocus.filter(
    (s) => new Date(s.startedAt) >= sevenDaysAgo
  );

  const antiProcSessions = rawAntiProc.filter(
    (s) => new Date(s.startedAt) >= sevenDaysAgo
  );

  const lockSessions = rawLock.filter(
    (s) => new Date(s.startedAt) >= sevenDaysAgo
  );

  const totalFocusTime = Math.round(
    focusSessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
  );

  const completedFocusSessions = focusSessions.filter((s) => s.completed).length;
  const interruptedAntiProc = antiProcSessions.filter((s) => s.sessionStatus === "interrupted").length;
  const completedAntiProc = antiProcSessions.filter((s) => s.sessionStatus === "completed").length;

  const totalPauses = focusSessions.reduce((acc, s) => acc + (s.distractions || 0), 0);
  const incompleteFocus = focusSessions.filter((s) => !s.completed).length;
  const totalDistractions = totalPauses + incompleteFocus + antiProcSessions.reduce((acc, s) => acc + s.distractionCount, 0);

  const avgFocusScore = focusSessions.length > 0
    ? Math.round(focusSessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / focusSessions.length)
    : 0;

  // Habit metrics integration
  const habitsCompleted = habits.filter((h) => h.completedToday).length;
  const habitsCompletionRate = habits.length > 0 ? Math.round((habitsCompleted / habits.length) * 100) : 100;
  const avgStreak = habits.length > 0 ? habits.reduce((acc, h) => acc + h.streak, 0) / habits.length : 0;
  const habitsConsistency = Math.round(avgStreak);
  const disciplineScore = Math.max(0, Math.min(100, Math.round(habitsCompletionRate * 0.7 + Math.min(avgStreak * 5, 30))));

  // Task metrics integration
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const tasksPending = tasks.filter((t) => !t.completed).length;
  const tasksCompletionRatio = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 100;

  return {
    totalFocusTime, // in minutes
    completedFocusSessions,
    completedAntiProc,
    interruptedAntiProc,
    totalDistractions,
    averageFocusScore: avgFocusScore,
    lockSessionsCount: lockSessions.length,
    successfulLockSessionsCount: lockSessions.filter((s) => s.completed).length,
    // Unified Combat Analytics Fields
    habitsCompletionRate,
    habitsConsistency,
    disciplineScore,
    tasksCompleted,
    tasksPending,
    tasksCompletionRatio,
  };
});

// ==========================================
// 4. Monthly Statistics
// ==========================================
export const getMonthlyStatistics = cache(async function getMonthlyStatistics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [rawFocus, rawAntiProc, rawLock, habits, tasks] = await Promise.all([
    fetchRawFocusSessions(userId),
    fetchRawAntiProcrastinationSessions(userId),
    fetchRawLockInSessions(userId),
    fetchRawHabits(userId),
    fetchRawTasks(userId),
  ]);

  const focusSessions = rawFocus.filter(
    (s) => new Date(s.startedAt) >= thirtyDaysAgo
  );

  const antiProcSessions = rawAntiProc.filter(
    (s) => new Date(s.startedAt) >= thirtyDaysAgo
  );

  const lockSessions = rawLock.filter(
    (s) => new Date(s.startedAt) >= thirtyDaysAgo
  );

  const totalFocusTime = Math.round(
    focusSessions.filter((s) => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
  );

  const completedFocusSessions = focusSessions.filter((s) => s.completed).length;
  const interruptedAntiProc = antiProcSessions.filter((s) => s.sessionStatus === "interrupted").length;
  const completedAntiProc = antiProcSessions.filter((s) => s.sessionStatus === "completed").length;

  const totalPauses = focusSessions.reduce((acc, s) => acc + (s.distractions || 0), 0);
  const incompleteFocus = focusSessions.filter((s) => !s.completed).length;
  const totalDistractions = totalPauses + incompleteFocus + antiProcSessions.reduce((acc, s) => acc + s.distractionCount, 0);

  const avgFocusScore = focusSessions.length > 0
    ? Math.round(focusSessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / focusSessions.length)
    : 0;

  // Habit metrics integration
  const habitsCompleted = habits.filter((h) => h.completedToday).length;
  const habitsCompletionRate = habits.length > 0 ? Math.round((habitsCompleted / habits.length) * 100) : 100;
  const avgStreak = habits.length > 0 ? habits.reduce((acc, h) => acc + h.streak, 0) / habits.length : 0;
  const habitsConsistency = Math.round(avgStreak);
  const disciplineScore = Math.max(0, Math.min(100, Math.round(habitsCompletionRate * 0.7 + Math.min(avgStreak * 5, 30))));

  // Task metrics integration
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const tasksPending = tasks.filter((t) => !t.completed).length;
  const tasksCompletionRatio = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 100;

  return {
    totalFocusTime, // in minutes
    completedFocusSessions,
    completedAntiProc,
    interruptedAntiProc,
    totalDistractions,
    averageFocusScore: avgFocusScore,
    lockSessionsCount: lockSessions.length,
    successfulLockSessionsCount: lockSessions.filter((s) => s.completed).length,
    // Unified Combat Analytics Fields
    habitsCompletionRate,
    habitsConsistency,
    disciplineScore,
    tasksCompleted,
    tasksPending,
    tasksCompletionRatio,
  };
});

// ==========================================
// 5. AI Weekly Report (Caches weekly insights)
// ==========================================
export const getAIWeeklyReport = cache(async function getAIWeeklyReport(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const rawSessions = await fetchRawAntiProcrastinationSessions(userId);
  const sessions = rawSessions.filter(
    (s) => new Date(s.startedAt) >= sevenDaysAgo
  );

  if (sessions.length === 0) {
    return {
      antiProcrastinationScore: 100,
      mostProductiveDay: "None",
      mostInterruptedDay: "None",
      averageInterruptionTime: 0,
      longestUninterruptedFocus: 0,
      bestFocusStreak: 0,
      mostCommonExitTime: "None",
      totalCompleted: 0,
      totalInterrupted: 0,
    };
  }

  // Days mapping
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const productiveDurations: { [day: string]: number } = {};
  const interruptedCounts: { [day: string]: number } = {};
  daysOfWeek.forEach((d) => {
    productiveDurations[d] = 0;
    interruptedCounts[d] = 0;
  });

  let totalCompleted = 0;
  let totalInterrupted = 0;
  let longestUninterrupted = 0;
  let totalDistractions = 0;
  let totalExits = 0;
  let totalSwitches = 0;
  let totalBlurs = 0;

  const exitTimes: number[] = [];
  let returnCount = 0;
  const interruptionElapseds: number[] = [];

  // Streak tracker
  let currentStreak = 0;
  let bestStreak = 0;
  const sorted = [...sessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  sorted.forEach((s) => {
    if (s.sessionStatus === "completed") {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (s.sessionStatus === "interrupted") {
      currentStreak = 0;
    }
  });

  sessions.forEach((s) => {
    const day = daysOfWeek[new Date(s.startedAt).getDay()];

    if (s.sessionStatus === "completed") {
      totalCompleted++;
      productiveDurations[day] += s.focusDuration;
      if (s.distractionCount === 0 && s.focusDuration > longestUninterrupted) {
        longestUninterrupted = s.focusDuration;
      }
    } else if (s.sessionStatus === "interrupted") {
      totalInterrupted++;
      interruptedCounts[day]++;
    }

    totalDistractions += s.distractionCount;
    totalExits += s.fullscreenExits;
    totalSwitches += s.tabSwitches;
    totalBlurs += s.windowBlurEvents;

    s.interruptionTimeline.forEach((t) => {
      if (
        t.event.toLowerCase().includes("exit") ||
        t.event.toLowerCase().includes("switch") ||
        t.event.toLowerCase().includes("blur")
      ) {
        interruptionElapseds.push(t.elapsed);
        exitTimes.push(new Date(t.timestamp).getHours());
      }
      if (t.event === "Returned") {
        returnCount++;
      }
    });
  });

  // Determine Productive Day
  let mostProductiveDay = "None";
  let maxProd = 0;
  daysOfWeek.forEach((d) => {
    if (productiveDurations[d] > maxProd) {
      maxProd = productiveDurations[d];
      mostProductiveDay = d;
    }
  });

  // Determine Interrupted Day
  let mostInterruptedDay = "None";
  let maxInt = 0;
  daysOfWeek.forEach((d) => {
    if (interruptedCounts[d] > maxInt) {
      maxInt = interruptedCounts[d];
      mostInterruptedDay = d;
    }
  });

  // Average Interruption Time
  const averageInterruptionTime =
    interruptionElapseds.length > 0
      ? Math.round(interruptionElapseds.reduce((a, b) => a + b, 0) / interruptionElapseds.length)
      : 0;

  // Most common exit hour
  let mostCommonExitTime = "None";
  if (exitTimes.length > 0) {
    const counts: { [hr: number]: number } = {};
    let maxHr = 0;
    let maxHrCount = 0;
    exitTimes.forEach((hr) => {
      counts[hr] = (counts[hr] || 0) + 1;
      if (counts[hr] > maxHrCount) {
        maxHrCount = counts[hr];
        maxHr = hr;
      }
    });
    const ampm = maxHr >= 12 ? "PM" : "AM";
    const displayHr = maxHr % 12 === 0 ? 12 : maxHr % 12;
    mostCommonExitTime = `${displayHr}:00 ${ampm}`;
  }

  // Compute Anti-Procrastination Score
  let score = 75;
  const totalSessions = totalCompleted + totalInterrupted;
  if (totalSessions > 0) {
    const completionRatio = totalCompleted / totalSessions;
    score += Math.round(completionRatio * 15);
  }

  score -= totalDistractions * 1.5;
  score -= totalInterrupted * 5;

  const interruptionsCount = totalExits + totalSwitches + totalBlurs;
  if (interruptionsCount > 0) {
    const returnRatio = returnCount / interruptionsCount;
    score += Math.round(returnRatio * 10);
  }

  const antiProcrastinationScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    antiProcrastinationScore,
    mostProductiveDay,
    mostInterruptedDay,
    averageInterruptionTime,
    longestUninterruptedFocus: longestUninterrupted,
    bestFocusStreak: bestStreak,
    mostCommonExitTime,
    totalCompleted,
    totalInterrupted,
  };
});

// ==========================================
// 6. Focus Heatmap (Focus minutes grouped by weekday and hour over past 30 days)
// ==========================================
export const getFocusHeatmap = cache(async function getFocusHeatmap(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rawSessions = await fetchRawFocusSessions(userId);
  const sessions = rawSessions.filter(
    (s) => s.type === "focus" && s.completed && new Date(s.startedAt) >= thirtyDaysAgo
  );

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Initialize matrix: 7 days x 24 hours
  const heatmap: { [day: string]: { [hour: number]: number } } = {};
  daysOfWeek.forEach((d) => {
    heatmap[d] = {};
    for (let h = 0; h < 24; h++) {
      heatmap[d][h] = 0;
    }
  });

  sessions.forEach((s) => {
    const date = new Date(s.startedAt);
    const dayName = daysOfWeek[date.getDay()];
    const hour = date.getHours();
    const durationMinutes = Math.round(s.duration / 60);
    heatmap[dayName][hour] += durationMinutes;
  });

  // Flatten the matrix into a list for easy charting/JSON responses
  const flatHeatmap: { day: string; hour: number; focusMinutes: number }[] = [];
  daysOfWeek.forEach((day) => {
    for (let hour = 0; hour < 24; hour++) {
      flatHeatmap.push({
        day,
        hour,
        focusMinutes: heatmap[day][hour],
      });
    }
  });

  return flatHeatmap;
});

// ==========================================
// 7. Productivity Trends (Daily focus score & focus duration over past 30 days)
// ==========================================
export const getProductivityTrends = cache(async function getProductivityTrends(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [rawFocus, rawAntiProc, currentProcScore] = await Promise.all([
    fetchRawFocusSessions(userId),
    fetchRawAntiProcrastinationSessions(userId),
    getProcrastinationScore(userId),
  ]);

  const focusSessions = rawFocus.filter(
    (s) => new Date(s.startedAt) >= thirtyDaysAgo
  );

  const antiProcSessions = rawAntiProc.filter(
    (s) => new Date(s.startedAt) >= thirtyDaysAgo
  );

  const trends: { [dateStr: string]: { focusMinutes: number; focusScores: number[]; antiProcScores: number[] } } = {};

  // Initialize past 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    trends[dateStr] = { focusMinutes: 0, focusScores: [], antiProcScores: [] };
  }

  const getLocalDateStr = (d: Date) => {
    const dateObj = new Date(d);
    return `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
  };

  focusSessions.forEach((s) => {
    const dateStr = getLocalDateStr(s.startedAt);
    if (trends[dateStr]) {
      if (s.completed && s.type === "focus") {
        trends[dateStr].focusMinutes += Math.round(s.duration / 60);
      }
      if (s.focusScore) {
        trends[dateStr].focusScores.push(s.focusScore);
      }
    }
  });

  antiProcSessions.forEach((s) => {
    const dateStr = getLocalDateStr(s.startedAt);
    if (trends[dateStr]) {
      if (s.antiProcrastinationScore) {
        trends[dateStr].antiProcScores.push(s.antiProcrastinationScore);
      }
    }
  });

  const currentAntiProcScore = 100 - currentProcScore;

  const formattedTrends = Object.keys(trends).map((date, idx, arr) => {
    const dayData = trends[date];
    const avgFocusScore = dayData.focusScores.length > 0
      ? Math.round(dayData.focusScores.reduce((a, b) => a + b, 0) / dayData.focusScores.length)
      : 80;

    let avgAntiProcScore = dayData.antiProcScores.length > 0
      ? Math.round(dayData.antiProcScores.reduce((a, b) => a + b, 0) / dayData.antiProcScores.length)
      : 100;

    // Override today's score on the trends with the actual habits+tasks score
    if (idx === arr.length - 1) {
      avgAntiProcScore = currentAntiProcScore;
    }

    return {
      date,
      focusMinutes: dayData.focusMinutes,
      averageFocusScore: avgFocusScore,
      antiProcrastinationScore: avgAntiProcScore,
    };
  });

  return formattedTrends;
});

// ==========================================
// 8. Streak Calculations
// ==========================================
export const getStreakCalculations = cache(async function getStreakCalculations(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  const rawFocus = await fetchRawFocusSessions(userId);
  // Focus Streak (consecutive days with at least one completed focus session)
  const focusSessions = rawFocus.filter((s) => s.type === "focus" && s.completed);

  let streak = 0;
  if (focusSessions.length > 0) {
    const completedDates = new Set(
      focusSessions.map((s) => {
        const d = new Date(s.startedAt);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      })
    );

    const getLocalDateStr = (d: Date) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    let checkDate = new Date();
    const todayStr = getLocalDateStr(checkDate);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    if (completedDates.has(todayStr)) {
      streak = 0;
      while (completedDates.has(getLocalDateStr(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (completedDates.has(yesterdayStr)) {
      streak = 0;
      checkDate = yesterday;
      while (completedDates.has(getLocalDateStr(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }

  // Best Streak from AntiProcrastinationSession (calculated over past 7 days of sessions)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const rawAntiProc = await fetchRawAntiProcrastinationSessions(userId);
  const antiProcSessions = [...rawAntiProc]
    .filter((s) => new Date(s.startedAt) >= sevenDaysAgo)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  let currentStreak = 0;
  let bestStreak = 0;
  antiProcSessions.forEach((s) => {
    if (s.sessionStatus === "completed") {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else if (s.sessionStatus === "interrupted") {
      currentStreak = 0;
    }
  });

  return {
    currentFocusStreak: streak,
    bestFocusStreak: bestStreak,
  };
});
