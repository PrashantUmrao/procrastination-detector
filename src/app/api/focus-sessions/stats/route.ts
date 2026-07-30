import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getDashboardAnalytics, getStreakCalculations } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await getDashboardAnalytics(user.clerkId);
    const streaks = await getStreakCalculations(user.clerkId);

    return NextResponse.json({
      todaysFocusTime: analytics.focusStats.todaysFocusTime,
      completedSessions: analytics.focusStats.completedSessions,
      focusStreak: streaks.currentFocusStreak,
      distractions: analytics.focusStats.distractions,
    });
  } catch (error) {
    console.error("Failed to calculate focus stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
