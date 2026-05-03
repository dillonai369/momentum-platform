import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Routes that DON'T require authentication.
 * Everything else (the portal, all API routes except webhooks) is protected.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)", // Meta Lead Ads, Clerk webhooks, GHL webhooks
  "/api/health",
]);

/**
 * Tenant resolution: map the request's host (e.g. momentummarketing.io,
 * bullpen.example.com, localhost:3000) to a tenant slug, then attach it as
 * a request header that server components / route handlers can read.
 *
 * For now, all hosts resolve to the default tenant (`momentum`) — we'll
 * extend this with a domain → tenant_id lookup once Bullpen is onboarded.
 */
function resolveTenantSlug(host: string | null): string {
  if (!host) return process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "momentum";

  // Strip port for comparison
  const hostname = host.split(":")[0].toLowerCase();

  // Hardcoded mapping — replace with DB lookup when 2nd tenant goes live
  const map: Record<string, string> = {
    "momentummarketing.io": "momentum",
    "www.momentummarketing.io": "momentum",
    "app.momentummarketing.io": "momentum",
    "localhost": "momentum",
    "127.0.0.1": "momentum",
  };

  return map[hostname] || process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || "momentum";
}

export default clerkMiddleware(async (auth, req) => {
  // 1. Tenant resolution — happens for every request
  const host = req.headers.get("host");
  const tenantSlug = resolveTenantSlug(host);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);

  // 2. Auth guard — protect everything that isn't public
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
