/**
 * Application error hierarchy.
 *
 * All domain errors extend AppError, which carries an HTTP status code and
 * a machine-readable code. The errorHandler middleware maps these to structured
 * JSON responses, keeping route handlers free of HTTP concern.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    // Restore prototype chain (needed when targeting ES5 with TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — Missing or invalid credentials / token. */
export class AuthenticationError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/** 403 — Authenticated but not permitted (wrong role, wrong audience). */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

/** 404 — Resource does not exist OR is hidden by tenant isolation. */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

/** 409 — Unique constraint violation (e.g. duplicate slug, duplicate email). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/** 422 — Request data is structurally valid but semantically invalid. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 422);
  }
}

/** 429 — Rate limit exceeded (thrown programmatically, not by middleware). */
export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests — please slow down', 'RATE_LIMIT_EXCEEDED', 429);
  }
}

/** 422 — Insufficient fabric stock or operation would result in negative stock. */
export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient fabric stock') {
    super(message, 'INSUFFICIENT_STOCK', 422);
  }
}

/** 403 — Plan limits exceeded or subscription past due/inactive. */
export class EntitlementError extends AppError {
  constructor(message: string, code = 'ENTITLEMENT_LIMIT_EXCEEDED', statusCode = 403) {
    super(message, code, statusCode);
  }
}

