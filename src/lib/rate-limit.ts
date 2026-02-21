/**
 * In-memory rate limiter using the Token Bucket algorithm.
 *
 * Edge-compatible: uses only Map, Date.now(), and standard Web APIs.
 *
 * Token bucket works by:
 *  - Each IP gets a bucket that fills at a steady rate (tokens per interval).
 *  - Bursts are allowed up to the bucket capacity.
 *  - Each request consumes one token; if none remain the request is limited.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IS_DEV = process.env.NODE_ENV === "development";

/** Maximum tokens (burst capacity). */
const BUCKET_CAPACITY = IS_DEV ? 200 : 60;

/** Tokens added per second (sustained rate). */
const REFILL_RATE = BUCKET_CAPACITY / 60; // fills the bucket in 60 s

/** How many tokens a single request costs. */
const COST = 1;

/** Extra burst allowance on top of the sustained rate. */
const BURST = 10;

/** Effective max tokens = sustained capacity + burst headroom. */
const MAX_TOKENS = BUCKET_CAPACITY + BURST;

/** Interval (ms) between stale-entry cleanup sweeps. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Entries idle longer than this are considered stale. */
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

interface Bucket {
  tokens: number;
  lastRefill: number; // timestamp ms
}

const buckets = new Map<string, Bucket>();

// ---------------------------------------------------------------------------
// Cleanup – runs lazily on a timer so we never leak memory.
// ---------------------------------------------------------------------------

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of Array.from(buckets.entries())) {
      if (now - bucket.lastRefill > STALE_THRESHOLD_MS) {
        buckets.delete(key);
      }
    }
    // If map is empty, stop the timer to avoid unnecessary work.
    if (buckets.size === 0 && cleanupTimer !== null) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the Node/Edge process to exit even if the timer is still active.
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as NodeJS.Timeout).unref();
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function getClientIP(request: Request): string {
  // Standard headers set by reverse proxies / platforms.
  const forwarded =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  return forwarded;
}

function refillBucket(bucket: Bucket, now: number): void {
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const newTokens = elapsed * REFILL_RATE;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + newTokens);
  bucket.lastRefill = now;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  limited: boolean;
  retryAfter?: number; // seconds until a token is available
  remaining?: number;
  limit?: number;
}

/**
 * Check whether `request` should be rate-limited.
 *
 * Returns `{ limited: false }` when the request is allowed, or
 * `{ limited: true, retryAfter }` when the caller should back off.
 */
export function rateLimit(request: Request): RateLimitResult {
  ensureCleanup();

  const ip = getClientIP(request);
  const now = Date.now();

  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(ip, bucket);
  }

  refillBucket(bucket, now);

  if (bucket.tokens >= COST) {
    bucket.tokens -= COST;
    return {
      limited: false,
      remaining: Math.floor(bucket.tokens),
      limit: MAX_TOKENS,
    };
  }

  // Not enough tokens – compute how long until one token is available.
  const deficit = COST - bucket.tokens;
  const retryAfter = Math.ceil(deficit / REFILL_RATE);

  return {
    limited: true,
    retryAfter,
    remaining: 0,
    limit: MAX_TOKENS,
  };
}

/**
 * Build a 429 Too Many Requests response with standard rate-limit headers.
 */
export function rateLimitResponse(result?: RateLimitResult): NextResponse {
  const retryAfter = result?.retryAfter ?? 1;
  const limit = result?.limit ?? MAX_TOKENS;
  const remaining = result?.remaining ?? 0;

  return new NextResponse(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}
