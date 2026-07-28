import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import LockInSession from "@/models/LockInSession";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const sessions = await LockInSession.find({ userId: user.clerkId });

    if (sessions.length === 0) {
      return NextResponse.json({
        averageLockDuration: 0,
        successfulLockSessions: 0,
        longestLock: 0,
        averageInterruptions: 0,
        lockCompletionRate: 0,
      });
    }

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.completed).length;
    
    let totalLockDuration = 0;
    let longest = 0;
    let totalInterruptions = 0;

    sessions.forEach((s) => {
      totalLockDuration += s.lockDuration;
      if (s.lockDuration > longest) {
        longest = s.lockDuration;
      }
      totalInterruptions += s.distractionCount;
    });

    const averageLockDuration = Math.round(totalLockDuration / totalSessions);
    const averageInterruptions = parseFloat((totalInterruptions / totalSessions).toFixed(1));
    const lockCompletionRate = Math.round((completedSessions / totalSessions) * 100);

    return NextResponse.json({
      averageLockDuration, // in seconds
      successfulLockSessions: completedSessions,
      longestLock: longest, // in seconds
      averageInterruptions,
      lockCompletionRate,
    });
  } catch (error) {
    console.error("Failed to fetch lock-in stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
