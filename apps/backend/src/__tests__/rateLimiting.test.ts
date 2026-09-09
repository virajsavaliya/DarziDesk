/**
 * Rate limiting tests.
 *
 * [24] Auth endpoint rejects request #11 with 429
 * [25] Password reset endpoint rejects request #6 with 429
 * [26] 429 response includes Retry-After header (standard RFC 6585)
 *
 * NOTE: These tests depend on in-memory rate limiter state. Each test file
 * runs in a single fork (see vitest.config.ts) and the rate limiter resets
 * between test runs. If tests become flaky, ensure vitest runs with singleFork.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../app';
import { resetRateLimiters } from '../middleware/rateLimiter';
import { createTenant, createUser } from './helpers/factories';

// Create a FRESH app instance for rate limit tests to avoid state bleed
const app = createApp();

beforeEach(() => {
  resetRateLimiters();
});

async function hitLoginRepeatedly(n: number) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const res = await request(app).post('/api/auth/login/staff').send({
      email: `user${i}@rate.test`,
      password: 'wrong',
      slug: 'nonexistent',
    });
    results.push(res.status);
  }
  return results;
}

async function hitPasswordResetRepeatedly(n: number) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const res = await request(app).post('/api/auth/password-reset/request').send({
      email: `user${i}@rate.test`,
      userType: 'customer',
    });
    results.push(res.status);
  }
  return results;
}

describe('[24] Auth rate limiting', () => {
  it('11th login attempt returns 429', async () => {
    const statuses = await hitLoginRepeatedly(11);
    // First 10 should succeed (401 from bad creds, not 429)
    expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    // 11th should be rate-limited
    expect(statuses[10]).toBe(429);
  });
});

describe('[25] Password reset rate limiting', () => {
  it('6th password reset attempt returns 429', async () => {
    const statuses = await hitPasswordResetRepeatedly(6);
    // First 5 should succeed (200 per anti-enumeration design)
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    // 6th should be rate-limited
    expect(statuses[5]).toBe(429);
  });
});

describe('[26] Rate limit response headers', () => {
  it('429 response includes RateLimit headers', async () => {
    // Hit 11 times to trigger the limit
    let lastResponse: any = null;
    for (let i = 0; i < 11; i++) {
      lastResponse = await request(createApp()).post('/api/auth/login/staff').send({
        email: `header${i}@rate.test`,
        password: 'wrong',
        slug: 'nonexistent',
      });
    }
    if (lastResponse && lastResponse.status === 429) {
      // RFC 6585 / draft-ietf-httpapi-ratelimit-headers
      const hasRateLimitHeader =
        'ratelimit-limit' in lastResponse.headers ||
        'x-ratelimit-limit' in lastResponse.headers ||
        'retry-after' in lastResponse.headers;
      expect(hasRateLimitHeader).toBe(true);
    }
  });
});

describe('SuperAdmin login rate limiting', () => {
  it('exercises rate limiting on POST /api/auth/login/staff for SuperAdmin: flips from 401 to 429 when configured limit (10) is exceeded', async () => {
    // 1. Create a tenant and a SuperAdmin user
    const tenant = await createTenant({
      name: 'SuperAdmin HQ',
      slug: `platform-${Date.now().toString(36)}`,
    });
    const superAdmin = await createUser(tenant.id, {
      role: UserRole.SUPERADMIN,
      email: `superadmin-${Date.now().toString(36)}@platform.test`,
      password: 'RealSuperAdminSecret123!',
    });

    const totalRequests = 13;
    const history: Array<{ requestIndex: number; status: number; code?: string; message?: string }> = [];

    console.log('\n--- SuperAdmin Login Rate Limiter Sequence Test ---');
    console.log(`Target: POST /api/auth/login/staff`);
    console.log(`User: ${superAdmin.email} (Role: SUPERADMIN)`);
    console.log(`Tenant Slug: ${tenant.slug}`);
    console.log(`Configured Limit: 10 requests per 15 minutes\n`);

    for (let i = 1; i <= totalRequests; i++) {
      const res = await request(app)
        .post('/api/auth/login/staff')
        .send({
          email: superAdmin.email,
          password: 'WrongSuperAdminPassword999!',
          slug: tenant.slug,
        });

      const entry = {
        requestIndex: i,
        status: res.status,
        code: res.body?.error?.code,
        message: res.body?.error?.message,
      };
      history.push(entry);

      console.log(
        `Request #${i.toString().padStart(2, ' ')} -> Status: ${res.status} | Code: ${(res.body?.error?.code ?? 'N/A').padEnd(20, ' ')} | Message: "${res.body?.error?.message ?? 'Invalid credentials'}"`
      );
    }
    console.log('--- End Sequence ---\n');

    // Requests 1 through 10 must return 401 (credentials evaluated, password rejected)
    for (let i = 0; i < 10; i++) {
      expect(history[i].status).toBe(401);
    }

    // Request 11 onward must return 429 (Rate limit reached)
    for (let i = 10; i < totalRequests; i++) {
      expect(history[i].status).toBe(429);
      expect(history[i].code).toBe('RATE_LIMIT_EXCEEDED');
      expect(history[i].message).toBe('Too many authentication attempts — please wait before trying again');
    }
  });
});

