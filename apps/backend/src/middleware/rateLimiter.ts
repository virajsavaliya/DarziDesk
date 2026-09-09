/**
 * Rate limiting middleware.
 *
 * Three tiers, each stricter than the last:
 *
 * apiLimiter          — General API: 100 req / 15 min per IP
 * authLimiter         — Auth endpoints: 10 req / 15 min per IP
 * passwordResetLimiter— Password reset: 5 req / 60 min per IP
 *
 * All limiters:
 * - Use `standardHeaders: true`  — sends RateLimit-* headers (RFC 6585)
 * - Use `legacyHeaders: false`   — disables X-RateLimit-* (deprecated)
 * - Return structured JSON on 429 (overrides express-rate-limit default HTML)
 *
 * Known limitation: rate limit state is in-memory. For multi-process or
 * multi-pod deployments, replace the default `store` with a Redis store
 * (e.g. `rate-limit-redis`). The store can be swapped without changing
 * any other code — that is the only file to update in Phase 2.
 */

import { rateLimit, MemoryStore } from 'express-rate-limit';

export const apiStore = new MemoryStore();
export const authStore = new MemoryStore();
export const passwordResetStore = new MemoryStore();

export function resetRateLimiters(): void {
  void apiStore.resetAll();
  void authStore.resetAll();
  void passwordResetStore.resetAll();
}

/** General API protection — 100 requests per 15 minutes per IP. */
export const apiLimiter = rateLimit({
  store: apiStore,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests — please slow down',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/** Auth endpoint protection — 10 requests per 15 minutes per IP. */
export const authLimiter = rateLimit({
  store: authStore,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication attempts — please wait before trying again',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/** Password reset protection — 5 requests per 60 minutes per IP. */
export const passwordResetLimiter = rateLimit({
  store: passwordResetStore,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many password reset attempts — please try again in an hour',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});
