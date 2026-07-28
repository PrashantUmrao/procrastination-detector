import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import LockInSession from "@/models/LockInSession";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      mission,
      lockDuration,
      focusTime,
      breakTime,
      completed,
      focusScore,
      distractionCount,
      interruptionEvents,
      fullscreenExits,
      tabSwitches,
      startedAt,
      endedAt,
    } = body;

    if (!mission || typeof lockDuration !== "number" || typeof focusTime !== "number" || !startedAt || !endedAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const record = await LockInSession.create({
      userId: user.clerkId,
      mission,
      lockDuration,
      focusTime,
      breakTime: breakTime || 0,
      completed: completed || false,
      focusScore: focusScore || 0,
      distractionCount: distractionCount || 0,
      interruptionEvents: interruptionEvents || [],
      fullscreenExits: fullscreenExits || 0,
      tabSwitches: tabSwitches || 0,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Failed to save lock-in session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
