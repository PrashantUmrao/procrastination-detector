import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Habit from "@/models/Habit";
import { getAuthUser, isDynamicError } from "@/lib/auth";
import { revalidateTag } from "next/cache";

const DEFAULT_HABITS_TEMPLATE = [
  {
    title: "Wake Before 6:00 AM",
    time: "6:00 AM",
    category: "Morning",
    displayOrder: 0,
    isDefault: true,
  },
  {
    title: "Plan Your Day Before Starting",
    time: "",
    category: "Work",
    displayOrder: 1,
    isDefault: true,
  },
  {
    title: "Complete Three Focus Duels",
    time: "",
    category: "Work",
    displayOrder: 2,
    isDefault: true,
  },
  {
    title: "Review Today's Progress",
    time: "8:30 PM",
    category: "Personal",
    displayOrder: 3,
    isDefault: true,
  },
];

// GET: Fetch all habits for the authenticated user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    let habits = await Habit.find({ userId: user.clerkId }).sort({ displayOrder: 1 });

    // Automatically create default habits if none exist
    if (habits.length === 0) {
      const recordsToInsert = DEFAULT_HABITS_TEMPLATE.map((h) => ({
        ...h,
        userId: user.clerkId,
      }));
      await Habit.insertMany(recordsToInsert);
      habits = await Habit.find({ userId: user.clerkId }).sort({ displayOrder: 1 });
    }

    return NextResponse.json(habits);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to fetch habits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new custom habit
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, time, category } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await dbConnect();

    // Determine displayOrder (max current displayOrder + 1)
    const lastHabit = await Habit.findOne({ userId: user.clerkId }).sort({ displayOrder: -1 });
    const displayOrder = lastHabit ? lastHabit.displayOrder + 1 : 0;

    const newHabit = await Habit.create({
      userId: user.clerkId,
      title,
      time: time || "",
      category: category || "Personal",
      completedToday: false,
      streak: 0,
      maxStreak: 0,
      displayOrder,
      isDefault: false,
    });

    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(newHabit);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to create habit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Batch update habits (primarily for reordering)
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { habits } = body;

    if (!Array.isArray(habits)) {
      return NextResponse.json({ error: "Invalid habits list" }, { status: 400 });
    }

    await dbConnect();

    // Update each habit in the batch (matching ID and user)
    const updatePromises = habits.map((h: any) =>
      Habit.updateOne(
        { _id: h._id || h.id, userId: user.clerkId },
        { $set: { displayOrder: h.displayOrder } }
      )
    );

    await Promise.all(updatePromises);

    const updatedList = await Habit.find({ userId: user.clerkId }).sort({ displayOrder: 1 });
    revalidateTag(`analytics-${user.clerkId}`, { expire: 0 });
    return NextResponse.json(updatedList);
  } catch (error) {
    if (isDynamicError(error)) {
      throw error;
    }
    console.error("Failed to batch update habits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
