import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import AntiProcrastinationSession from "@/models/AntiProcrastinationSession";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Query past 7 days of sessions for the user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await AntiProcrastinationSession.find({
      userId: user.clerkId,
      startedAt: { $gte: sevenDaysAgo }
    });

    if (sessions.length === 0) {
      return NextResponse.json({
        antiProcrastinationScore: 100,
        mostProductiveDay: "None",
        mostInterruptedDay: "None",
        averageInterruptionTime: 0,
        longestUninterruptedFocus: 0,
        bestFocusStreak: 0,
        mostCommonExitTime: "None",
        totalCompleted: 0,
        totalInterrupted: 0
      });
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

    const exitTimes: number[] = []; // hours
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
        if (t.event.toLowerCase().includes("exit") || t.event.toLowerCase().includes("switch") || t.event.toLowerCase().includes("blur")) {
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

    // Average Interruption Time (elapsed time at which user leaves)
    const averageInterruptionTime = interruptionElapseds.length > 0
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

    return NextResponse.json({
      antiProcrastinationScore,
      mostProductiveDay,
      mostInterruptedDay,
      averageInterruptionTime,
      longestUninterruptedFocus: longestUninterrupted,
      bestFocusStreak: bestStreak,
      mostCommonExitTime,
      totalCompleted,
      totalInterrupted
    });
  } catch (error) {
    console.error("Failed to fetch anti-procrastination insights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
