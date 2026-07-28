import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import FocusSession from "@/models/FocusSession";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mission, type, duration, startedAt, endedAt, completed, distractions } = body;

    // Validate fields
    if (!mission || !type || typeof duration !== "number" || !startedAt || !endedAt || typeof completed !== "boolean") {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    await dbConnect();

    const session = await FocusSession.create({
      userId: user.clerkId,
      mission,
      type,
      duration,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      completed,
      distractions: distractions || 0,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Failed to save focus session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
