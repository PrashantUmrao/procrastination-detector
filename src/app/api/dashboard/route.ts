import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getDashboardAnalytics,
  getProcrastinationScore,
  getWeeklyStatistics,
  getMonthlyStatistics,
  getStreakCalculations,
  getAIWeeklyReport,
} from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve all cached statistics concurrently
    const [
      dashboardAnalytics,
      procrastinationScore,
      weeklyAnalytics,
      monthlyAnalytics,
      streaks,
      aiInsights,
    ] = await Promise.all([
      getDashboardAnalytics(user.clerkId),
      getProcrastinationScore(user.clerkId),
      getWeeklyStatistics(user.clerkId),
      getMonthlyStatistics(user.clerkId),
      getStreakCalculations(user.clerkId),
      getAIWeeklyReport(user.clerkId),
    ]);

    return NextResponse.json({
      focusStatistics: dashboardAnalytics.focusStats,
      lockInStatistics: dashboardAnalytics.lockInStats,
      procrastinationScore,
      weeklyAnalytics,
      monthlyAnalytics,
      currentStreak: streaks.currentFocusStreak,
      focusScore: weeklyAnalytics.averageFocusScore,
      todaysFocus: dashboardAnalytics.focusStats.todaysFocusTime,
      aiInsights,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard aggregated stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
