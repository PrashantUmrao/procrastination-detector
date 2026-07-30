import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getFocusHeatmap } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getFocusHeatmap(user.clerkId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch focus heatmap:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
