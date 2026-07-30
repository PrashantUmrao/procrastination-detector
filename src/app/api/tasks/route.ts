import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Task from "@/models/Task";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const DEFAULT_TASKS_TEMPLATE = [
  {
    title: "Synthesize Web Audio oscillators for the sword descent",
    category: "DUEL",
    completed: true,
    displayOrder: 0,
  },
  {
    title: "Overhaul app layout to support dark luxury style values",
    category: "SYSTEM",
    completed: true,
    displayOrder: 1,
  },
  {
    title: "Review daily work timeline items and prune avoidances",
    category: "REFLECT",
    completed: false,
    displayOrder: 2,
  },
  {
    title: "Integrate the Recharts components inside workspace",
    category: "BATTLE",
    completed: false,
    displayOrder: 3,
  },
];

// GET: Fetch all tasks for the authenticated user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    let tasks = await Task.find({ userId: user.clerkId }).sort({ displayOrder: 1 });

    // Automatically seed default tasks if timeline is empty
    if (tasks.length === 0) {
      const recordsToInsert = DEFAULT_TASKS_TEMPLATE.map((t) => ({
        ...t,
        userId: user.clerkId,
      }));
      await Task.insertMany(recordsToInsert);
      tasks = await Task.find({ userId: user.clerkId }).sort({ displayOrder: 1 });
    }

    return NextResponse.json(tasks);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new task
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, category } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await dbConnect();

    // Determine displayOrder (max current displayOrder + 1)
    const lastTask = await Task.findOne({ userId: user.clerkId }).sort({ displayOrder: -1 });
    const displayOrder = lastTask ? lastTask.displayOrder + 1 : 0;

    const newTask = await Task.create({
      userId: user.clerkId,
      title,
      category: category || "BATTLE",
      completed: false,
      displayOrder,
    });

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(newTask);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Batch update tasks (primarily for reordering)
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tasks } = body;

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: "Invalid tasks list" }, { status: 400 });
    }

    await dbConnect();

    // Update each task in the batch (matching ID and user)
    const updatePromises = tasks.map((t: any) =>
      Task.updateOne(
        { _id: t._id || t.id, userId: user.clerkId },
        { $set: { displayOrder: t.displayOrder } }
      )
    );

    await Promise.all(updatePromises);

    const updatedList = await Task.find({ userId: user.clerkId }).sort({ displayOrder: 1 });
    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(updatedList);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to batch update tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
