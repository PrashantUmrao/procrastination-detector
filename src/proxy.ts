import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;
  
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/auth");

  // If signed in and accessing the auth page, redirect directly to dashboard
  if (userId && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If not signed in and trying to access dashboard or private APIs, handle unauthorized
  if (!userId && isProtectedRoute) {
    if (pathname.startsWith("/api")) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return NextResponse.redirect(new URL("/auth", req.url));
  }
});

export const config = {
  // Match all request paths except for static files
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[\\w]+$|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy path
    '/__clerk/:path*',
  ],
};
