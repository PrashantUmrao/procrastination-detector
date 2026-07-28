import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import FlowHistory from "@/models/FlowHistory";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { startedAt, endedAt, duration, sessions, averageFocusScore, maxContinuousFlow, reflection } = body;

    if (!startedAt || !endedAt || typeof duration !== "number" || typeof sessions !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const record = await FlowHistory.create({
      userId: user.clerkId,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      duration,
      sessions,
      averageFocusScore: averageFocusScore || 0,
      maxContinuousFlow: maxContinuousFlow || 0,
      reflection: reflection || "",
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Failed to save flow history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
