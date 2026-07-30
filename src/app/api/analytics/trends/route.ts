import { NextResponse } from "next/server";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { getProductivityTrends } from "@/lib/cached-analytics";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getProductivityTrends(user.clerkId);
    return NextResponse.json(stats);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to fetch productivity trends:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
