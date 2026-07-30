import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// PATCH: Update properties of a single task (toggle completion, edit title/category)
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
    const { title, category, completed } = body;

    await dbConnect();

    // Verify ownership
    const task = await Task.findOne({ _id: id, userId: user.clerkId });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateFields: any = {};
    if (title !== undefined) updateFields.title = title;
    if (category !== undefined) updateFields.category = category;
    if (completed !== undefined) updateFields.completed = completed;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId: user.clerkId },
      { $set: updateFields },
      { new: true }
    );

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(updatedTask);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove a task from timeline
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

    const result = await Task.deleteOne({ _id: id, userId: user.clerkId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to delete task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
