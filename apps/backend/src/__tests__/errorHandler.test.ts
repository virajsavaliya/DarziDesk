import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../middleware/errorHandler';
import { env } from '../config/env';

// Mock the environment variable config to allow overriding NODE_ENV
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'silent', // Required by pino logger
  },
}));

// We need a dummy express app to test the middleware
const app = express();

app.get('/trigger-error', (_req, _res, next) => {
  const error = new Error('This is a test internal error');
  // Add some fake internal details that might normally leak
  (error as any).internalDetails = 'database_password_123';
  next(error);
});

// Register the error handler LAST
app.use(errorHandler);

describe('errorHandler Middleware (Production Leak Test)', () => {
  const originalEnv = env.NODE_ENV;

  beforeEach(() => {
    // Reset env before each test
    env.NODE_ENV = originalEnv;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include stack traces in development mode', async () => {
    env.NODE_ENV = 'development';
    const response = await request(app).get('/trigger-error');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toBe('This is a test internal error');
    expect(response.body.error.stack).toBeDefined();
    expect(typeof response.body.error.stack).toBe('string');
  });

  it('should NEVER include stack traces or internal details in production mode', async () => {
    // Mock production environment
    env.NODE_ENV = 'production';

    const response = await request(app).get('/trigger-error');

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    
    // In production, a generic 500 should be mapped to "An internal error occurred"
    // to avoid leaking even the original error message if it contains sensitive DB info.
    expect(response.body.error.message).toBe('An internal error occurred');
    
    // The code should be INTERNAL_SERVER_ERROR
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');

    // CRITICAL SECURITY ASSERTIONS:
    expect(response.body.error.stack).toBeUndefined();
    expect(response.body.error.internalDetails).toBeUndefined();
    
    // Assert that the error object ONLY contains message and code
    expect(Object.keys(response.body.error)).toEqual(['message', 'code']);
  });
});
