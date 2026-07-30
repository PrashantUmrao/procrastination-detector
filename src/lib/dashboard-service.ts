import {
  getDashboardAnalytics,
  getProcrastinationScore,
  getWeeklyStatistics,
  getMonthlyStatistics,
  getStreakCalculations,
  getAIWeeklyReport,
  getProductivityTrends,
} from "./cached-analytics";

export interface DashboardData {
  focusStatistics: {
    todaysFocusTime: number;
    completedSessions: number;
    distractions: number;
  };
  lockInStatistics: {
    averageLockDuration: number;
    successfulLockSessions: number;
    longestLock: number;
    averageInterruptions: number;
    lockCompletionRate: number;
  };
  procrastinationScore: number;
  weeklyAnalytics: {
    totalFocusTime: number;
    completedFocusSessions: number;
    completedAntiProc: number;
    interruptedAntiProc: number;
    totalDistractions: number;
    averageFocusScore: number;
    lockSessionsCount: number;
    successfulLockSessionsCount: number;
  };
  monthlyAnalytics: {
    totalFocusTime: number;
    completedFocusSessions: number;
    completedAntiProc: number;
    interruptedAntiProc: number;
    totalDistractions: number;
    averageFocusScore: number;
    lockSessionsCount: number;
    successfulLockSessionsCount: number;
  };
  currentStreak: number;
  focusScore: number;
  todaysFocus: number;
  aiInsights: {
    antiProcrastinationScore: number;
    mostProductiveDay: string;
    mostInterruptedDay: string;
    averageInterruptionTime: number;
    longestUninterruptedFocus: number;
    bestFocusStreak: number;
    mostCommonExitTime: string;
    totalCompleted: number;
    totalInterrupted: number;
  };
  productivityTrends: Array<{
    date: string;
    focusMinutes: number;
    averageFocusScore: number;
    antiProcrastinationScore: number;
  }>;
}

/**
 * Single source of truth for aggregated dashboard metrics.
 * Runs individual cached calculators concurrently.
 */
export async function getAggregatedDashboardData(userId: string): Promise<DashboardData> {
  const [
    dashboardAnalytics,
    procrastinationScore,
    weeklyAnalytics,
    monthlyAnalytics,
    streaks,
    aiInsights,
    productivityTrends,
  ] = await Promise.all([
    getDashboardAnalytics(userId),
    getProcrastinationScore(userId),
    getWeeklyStatistics(userId),
    getMonthlyStatistics(userId),
    getStreakCalculations(userId),
    getAIWeeklyReport(userId),
    getProductivityTrends(userId),
  ]);

  return {
    focusStatistics: dashboardAnalytics.focusStats,
    lockInStatistics: dashboardAnalytics.lockInStats,
    procrastinationScore,
    weeklyAnalytics,
    monthlyAnalytics,
    currentStreak: streaks.currentFocusStreak,
    focusScore: weeklyAnalytics.averageFocusScore,
    todaysFocus: dashboardAnalytics.focusStats.todaysFocusTime,
    aiInsights,
    productivityTrends,
  };
}
