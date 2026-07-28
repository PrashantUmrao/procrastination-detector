import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import FocusSession from "@/models/FocusSession";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Query all sessions for this user
    const sessions = await FocusSession.find({ userId: user.clerkId }).sort({ startedAt: -1 });

    // 1. Calculate Today's Focus Time (in minutes)
    // Find focus sessions starting from 12:00 AM local time today. We'll approximate this by checking the date string.
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaysCompletedSessions = sessions.filter(
      (s) => s.type === "focus" && s.completed && new Date(s.startedAt) >= startOfToday
    );
    const todaysFocusTime = Math.round(todaysCompletedSessions.reduce((acc, s) => acc + s.duration, 0) / 60);

    // 2. Completed Sessions (All-Time)
    const completedSessions = sessions.filter((s) => s.type === "focus" && s.completed).length;

    // 3. Current Focus Streak (consecutive days with at least one completed focus session)
    let streak = 0;
    
    // Group completed focus sessions by their calendar date (YYYY-MM-DD)
    const completedDates = new Set(
      sessions
        .filter((s) => s.type === "focus" && s.completed)
        .map((s) => {
          const d = new Date(s.startedAt);
          // Format as YYYY-MM-DD
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        })
    );

    const getLocalDateStr = (d: Date) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    let checkDate = new Date();
    const todayStr = getLocalDateStr(checkDate);
    
    // Check yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // If there's a session today, start checking from today.
    // If not, but there was one yesterday, start checking from yesterday.
    // Otherwise, streak is 0.
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

    // 4. Distractions: sum of distractions in all sessions + count of incomplete focus sessions (completed: false)
    const totalPauses = sessions.reduce((acc, s) => acc + (s.distractions || 0), 0);
    const incompleteFocusSessions = sessions.filter((s) => s.type === "focus" && !s.completed).length;
    const distractions = totalPauses + incompleteFocusSessions;

    return NextResponse.json({
      todaysFocusTime,
      completedSessions,
      focusStreak: streak,
      distractions,
    });
  } catch (error) {
    console.error("Failed to calculate focus stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
