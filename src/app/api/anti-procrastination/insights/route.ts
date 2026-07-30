import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAIWeeklyReport } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await getAIWeeklyReport(user.clerkId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to fetch anti-procrastination insights:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
