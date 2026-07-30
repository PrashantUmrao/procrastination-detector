import { NextResponse } from "next/server";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { getDashboardAnalytics } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await getDashboardAnalytics(user.clerkId);
    return NextResponse.json(analytics.lockInStats);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to fetch lock-in stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
