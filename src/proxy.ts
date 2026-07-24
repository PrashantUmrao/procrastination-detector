import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api(.*)"]);
const isAuthRoute = createRouteMatcher(["/auth(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // If signed in and accessing the auth page, redirect directly to dashboard
  if (userId && isAuthRoute(req)) {
    return Response.redirect(new URL("/dashboard", req.url));
  }
  
  // If not signed in and trying to access dashboard or private APIs, handle unauthorized
  if (!userId && isProtectedRoute(req)) {
    if (req.nextUrl.pathname.startsWith("/api")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return Response.redirect(new URL("/auth", req.url));
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
