import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Next.js Edge Middleware – applies rate limiting to all /api/* routes.
 */
export function middleware(request: NextRequest) {
  const result = rateLimit(request);

  if (result.limited) {
    return rateLimitResponse(result);
  }

  // Attach informational rate-limit headers to successful responses.
  const response = NextResponse.next();
  if (result.limit !== undefined) {
    response.headers.set("X-RateLimit-Limit", String(result.limit));
  }
  if (result.remaining !== undefined) {
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  }
  return response;
}

/**
 * Only run this middleware on API routes.
 */
export const config = {
  matcher: "/api/:path*",
};
