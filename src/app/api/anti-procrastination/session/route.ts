import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import AntiProcrastinationSession from "@/models/AntiProcrastinationSession";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      sessionId,
      mission,
      focusDuration,
      remainingDuration,
      distractionCount,
      pauseCount,
      fullscreenExits,
      tabSwitches,
      windowBlurEvents,
      interruptionTimeline,
      sessionStatus,
      focusScore,
      antiProcrastinationScore,
      startedAt,
      endedAt,
    } = body;

    if (!sessionId || !mission || !startedAt || !endedAt || !sessionStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // Upsert the session record based on sessionId
    const record = await AntiProcrastinationSession.findOneAndUpdate(
      { sessionId, userId: user.clerkId },
      {
        mission,
        focusDuration,
        remainingDuration,
        distractionCount: distractionCount || 0,
        pauseCount: pauseCount || 0,
        fullscreenExits: fullscreenExits || 0,
        tabSwitches: tabSwitches || 0,
        windowBlurEvents: windowBlurEvents || 0,
        interruptionTimeline: interruptionTimeline || [],
        sessionStatus,
        focusScore: focusScore || 0,
        antiProcrastinationScore: antiProcrastinationScore || 0,
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
      },
      { returnDocument: "after", upsert: true }
    );

    // Invalidate cached analytics
    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to save anti-procrastination session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
