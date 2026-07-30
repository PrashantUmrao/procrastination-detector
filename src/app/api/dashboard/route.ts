import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAggregatedDashboardData } from "@/lib/dashboard-service";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAggregatedDashboardData(user.clerkId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch dashboard aggregated stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
