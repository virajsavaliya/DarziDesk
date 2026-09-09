/**
 * Shared TypeScript types for DarziDesk.
 *
 * Phase 0: Minimal types to establish the shared-type pattern.
 * More types (Tenant, Ticket, Agent, etc.) will be added in Phase 1+.
 */

// ---------------------------------------------------------------------------
// API — Common response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
    /** Only present in development mode */
    stack?: string;
  };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}
