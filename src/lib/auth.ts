import { currentUser } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";

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
export async function getAuthUser(): Promise<IUser | null> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    // Connect to database
    try {
      await dbConnect();
    } catch (dbError) {
      console.error("Failed to connect to MongoDB in getAuthUser helper:", dbError);
      return null;
    }

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
  } catch (error) {
    const err = error as { digest?: string; message?: string };
    if (
      err.message?.includes("Dynamic server usage") ||
      err.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }
    console.error("Unexpected error in getAuthUser helper:", error);
    return null;
  }
}
