import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { dbConnect } from "@/lib/mongodb";
import FocusSession from "@/models/FocusSession";
import AntiProcrastinationSession from "@/models/AntiProcrastinationSession";
import LockInSession from "@/models/LockInSession";

// 1. Procrastination Score
export const getProcrastinationScore = cache(async function getProcrastinationScore(userId: string): Promise<number> {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  });

  if (sessions.length === 0) return 100;

  // Days mapping
  let totalCompleted = 0;
  let totalInterrupted = 0;
  let totalDistractions = 0;
  let totalExits = 0;
  let totalSwitches = 0;
  let totalBlurs = 0;
  let returnCount = 0;

  sessions.forEach((s) => {
    if (s.sessionStatus === "completed") {
      totalCompleted++;
    } else if (s.sessionStatus === "interrupted") {
      totalInterrupted++;
    }

    totalDistractions += s.distractionCount;
    totalExits += s.fullscreenExits;
    totalSwitches += s.tabSwitches;
    totalBlurs += s.windowBlurEvents;

    s.interruptionTimeline.forEach((t) => {
      if (t.event === "Returned") {
        returnCount++;
      }
    });
  });

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

  return Math.max(10, Math.min(100, Math.round(score)));
});

// 2. Dashboard Analytics (Caches Focus stats + Lock-in stats)
export const getDashboardAnalytics = cache(async function getDashboardAnalytics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();

  // Focus Stats Calculations
  const sessions = await FocusSession.find({ userId }).sort({ startedAt: -1 });

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
  const lockSessions = await LockInSession.find({ userId });
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

// 3. Weekly Statistics
export const getWeeklyStatistics = cache(async function getWeeklyStatistics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const focusSessions = await FocusSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  });

  const antiProcSessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  });

  const lockSessions = await LockInSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  });

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

  return {
    totalFocusTime, // in minutes
    completedFocusSessions,
    completedAntiProc,
    interruptedAntiProc,
    totalDistractions,
    averageFocusScore: avgFocusScore,
    lockSessionsCount: lockSessions.length,
    successfulLockSessionsCount: lockSessions.filter((s) => s.completed).length,
  };
});

// 4. Monthly Statistics
export const getMonthlyStatistics = cache(async function getMonthlyStatistics(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const focusSessions = await FocusSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  });

  const antiProcSessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  });

  const lockSessions = await LockInSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  });

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

  return {
    totalFocusTime, // in minutes
    completedFocusSessions,
    completedAntiProc,
    interruptedAntiProc,
    totalDistractions,
    averageFocusScore: avgFocusScore,
    lockSessionsCount: lockSessions.length,
    successfulLockSessionsCount: lockSessions.filter((s) => s.completed).length,
  };
});

// 5. AI Weekly Report (Caches weekly insights)
export const getAIWeeklyReport = cache(async function getAIWeeklyReport(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  });

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
  const sorted = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
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
    const day = daysOfWeek[s.startedAt.getDay()];

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

// 6. Focus Heatmap (Focus minutes grouped by weekday and hour over past 30 days)
export const getFocusHeatmap = cache(async function getFocusHeatmap(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await FocusSession.find({
    userId,
    type: "focus",
    completed: true,
    startedAt: { $gte: thirtyDaysAgo },
  });

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

// 7. Productivity Trends (Daily focus score & focus duration over past 30 days)
export const getProductivityTrends = cache(async function getProductivityTrends(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Retrieve FocusSessions and AntiProcrastinationSessions for trends
  const focusSessions = await FocusSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  });

  const antiProcSessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: thirtyDaysAgo },
  });

  const trends: { [dateStr: string]: { focusMinutes: number; focusScores: number[]; antiProcScores: number[] } } = {};

  // Initialize past 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    trends[dateStr] = { focusMinutes: 0, focusScores: [], antiProcScores: [] };
  }

  const getLocalDateStr = (d: Date) => {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
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

  const formattedTrends = Object.keys(trends).map((date) => {
    const dayData = trends[date];
    const avgFocusScore = dayData.focusScores.length > 0
      ? Math.round(dayData.focusScores.reduce((a, b) => a + b, 0) / dayData.focusScores.length)
      : 80;

    const avgAntiProcScore = dayData.antiProcScores.length > 0
      ? Math.round(dayData.antiProcScores.reduce((a, b) => a + b, 0) / dayData.antiProcScores.length)
      : 100;

    return {
      date,
      focusMinutes: dayData.focusMinutes,
      averageFocusScore: avgFocusScore,
      antiProcrastinationScore: avgAntiProcScore,
    };
  });

  return formattedTrends;
});

// 8. Streak Calculations
export const getStreakCalculations = cache(async function getStreakCalculations(userId: string) {
  "use cache";
  cacheLife({ revalidate: 600 });
  cacheTag(`analytics-${userId}`);

  await dbConnect();

  // Focus Streak (consecutive days with at least one completed focus session)
  const focusSessions = await FocusSession.find({
    userId,
    type: "focus",
    completed: true,
  }).sort({ startedAt: -1 });

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
  const antiProcSessions = await AntiProcrastinationSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  }).sort({ startedAt: 1 });

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
