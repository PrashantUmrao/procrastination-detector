import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWeeklyStatistics } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getWeeklyStatistics(user.clerkId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch weekly stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
