import { currentUser } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { cache } from "react";

export function isDynamicError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as Record<string, unknown>;
  const message = (err.message as string) || "";
  const digest = (err.digest as string) || "";
  return (
    message.includes("Dynamic server usage") ||
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "HANGING_PROMISE_REJECTION" ||
    message.includes("headers()")
  );
}

/**
 * Reusable server helper that returns the currently authenticated MongoDB user.
 * 
 * Flow:
 * 1. Verify Clerk authentication by fetching the current user.
 * 2. Connect to MongoDB Atlas.
 * 3. Retrieve the MongoDB User document matching the Clerk ID.
 * 4. If the user doesn't exist, automatically create a new User document.
 * 5. Handle race conditions to prevent creating duplicate users.
 * 6. Return the MongoDB user document, or null if unauthenticated / database connection fails.
 */
export const getAuthUser = cache(async (): Promise<IUser | null> => {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  // Connect to database
  await dbConnect();

  // Search MongoDB using clerkId
  let dbUser = await User.findOne({ clerkId: clerkUser.id });

  // If the user does not exist, automatically create a new document
  if (!dbUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const firstName = clerkUser.firstName || "";
    const lastName = clerkUser.lastName || "";
    const imageUrl = clerkUser.imageUrl || "";

    try {
      dbUser = await User.create({
        clerkId: clerkUser.id,
        email,
        firstName,
        lastName,
        imageUrl,
      });
      console.log(`Successfully created new MongoDB user for clerkId: ${clerkUser.id}`);
    } catch (err) {
      // Handle concurrent user registration (duplicate key error code 11000)
      const mongoError = err as { code?: number };
      if (mongoError.code === 11000) {
        console.warn(`Duplicate creation attempt caught for clerkId: ${clerkUser.id}. Fetching existing document.`);
        dbUser = await User.findOne({ clerkId: clerkUser.id });
      } else {
        console.error("Error creating User document in database:", err);
        throw err;
      }
    }
  }

  return dbUser;
});
