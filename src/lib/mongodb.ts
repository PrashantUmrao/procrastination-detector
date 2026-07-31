import dns from "dns";
import mongoose from "mongoose";

if (typeof dns.setServers === "function") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    console.log("[mongodb] DNS resolvers programmatically set to public servers: [8.8.8.8, 1.1.1.1]");
  } catch (err) {
    console.warn("[mongodb] Failed to override DNS resolvers:", err);
  }
}

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = (globalThis.mongooseCache || (globalThis.mongooseCache = { conn: null, promise: null })) as MongooseCache;

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      family: 4, // Force IPv4 connection to database
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => m);
  }

  try {
    console.log("[dbConnect] Resolving MongoDB connection...");
    const start = Date.now();
    cached.conn = await cached.promise;
    console.log(`[dbConnect] MongoDB resolved successfully in ${Date.now() - start}ms`);
  } catch (e) {
    console.error("[dbConnect] Failed to connect to MongoDB Atlas cluster. Error details:", e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
