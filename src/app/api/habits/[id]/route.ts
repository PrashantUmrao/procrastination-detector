import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Habit from "@/models/Habit";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// PATCH: Update properties of a single habit (e.g. toggle completion or edit fields)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, time, category, completedToday } = body;

    await dbConnect();

    // Find the habit to verify ownership
    const habit = await Habit.findOne({ _id: id, userId: user.clerkId });
    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const updateFields: Record<string, string | number | boolean> = {};

    if (title !== undefined) updateFields.title = title;
    if (time !== undefined) updateFields.time = time;
    if (category !== undefined) updateFields.category = category;

    if (completedToday !== undefined) {
      updateFields.completedToday = completedToday;
      // Increment or decrement streak based on completion state
      const newStreak = completedToday ? habit.streak + 1 : Math.max(0, habit.streak - 1);
      updateFields.streak = newStreak;
      updateFields.maxStreak = Math.max(habit.maxStreak, newStreak);
    }

    const updatedHabit = await Habit.findOneAndUpdate(
      { _id: id, userId: user.clerkId },
      { $set: updateFields },
      { new: true }
    );

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(updatedHabit);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to update habit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove a habit
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const result = await Habit.deleteOne({ _id: id, userId: user.clerkId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to delete habit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
