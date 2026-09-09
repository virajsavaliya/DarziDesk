/**
 * Public Plans endpoint tests.
 *
 * GET /api/public/plans — unauthenticated endpoint for the marketing landing page.
 *
 * Tests:
 *  [P1] Returns 200 with NO auth header
 *  [P2] Returns 200 when an INVALID auth token is provided (truly auth-free)
 *  [P3] Response shape: each plan has exactly the 8 public fields
 *  [P4] LEAK TEST: Response does NOT contain _count, subscriptions count,
 *       isActive, maxSmsCredits, createdAt, updatedAt, or any field linking
 *       a plan to a specific tenant
 *  [P5] Plans are ordered cheapest-first (ascending priceMonthly)
 *  [P6] Only active plans are returned (inactive plans are hidden)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createApp } from '../app';
import { testPrisma } from './setup';

const app = createApp();

// The 8 exact public fields and ONLY those fields
const PUBLIC_FIELDS = new Set([
  'id',
  'name',
  'priceMonthly',
  'priceYearly',
  'maxStaffAccounts',
  'maxOrdersPerMonth',
  'features',
  'isDefault',
]);

// Fields that must NEVER appear in the public response
const FORBIDDEN_FIELDS = [
  '_count',          // Reveals tenant subscription counts
  'subscriptions',   // Same
  'maxSmsCredits',   // Internal operational metric
  'isActive',        // Internal admin concern
  'createdAt',       // Not relevant for marketing
  'updatedAt',       // Not relevant for marketing
  'tenantId',        // Would link plan to tenant (tenant-specific data)
];

async function seedPlan(overrides: {
  name: string;
  priceMonthly: number;
  isActive?: boolean;
}) {
  return testPrisma.subscriptionPlan.create({
    data: {
      name: overrides.name,
      priceMonthly: new Prisma.Decimal(overrides.priceMonthly),
      priceYearly: new Prisma.Decimal(overrides.priceMonthly * 10),
      maxStaffAccounts: 3,
      maxOrdersPerMonth: 50,
      maxSmsCredits: 100,
      features: ['Feature A', 'Feature B'],
      isActive: overrides.isActive ?? true,
      isDefault: false,
    },
  });
}

describe('[P1] GET /api/public/plans — no auth header', () => {
  it('returns 200 with no Authorization header', async () => {
    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('[P2] GET /api/public/plans — invalid token still succeeds', () => {
  it('returns 200 even when a malformed Bearer token is provided', async () => {
    const res = await request(app)
      .get('/api/public/plans')
      .set('Authorization', 'Bearer totally-invalid-token-xyz');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('[P3] Response shape — only public fields present', () => {
  beforeEach(async () => {
    await seedPlan({ name: `Shape Test Plan ${Date.now()}`, priceMonthly: 999 });
  });

  it('each plan contains exactly the 8 public fields and no others', async () => {
    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const plan of res.body.data) {
      const keys = Object.keys(plan);

      // Every key in the response must be in the allowed set
      for (const key of keys) {
        expect(PUBLIC_FIELDS.has(key)).toBe(true);
      }

      // All 8 public fields must be present
      for (const field of PUBLIC_FIELDS) {
        expect(keys).toContain(field);
      }
    }
  });
});

describe('[P4] LEAK TEST — forbidden fields are absent', () => {
  beforeEach(async () => {
    await seedPlan({ name: `Leak Test Plan ${Date.now()}`, priceMonthly: 1499 });
  });

  it('response does NOT contain any tenant-specific or internal-only fields', async () => {
    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const plan of res.body.data) {
      for (const forbidden of FORBIDDEN_FIELDS) {
        expect(plan).not.toHaveProperty(forbidden);
      }

      // _count must not exist at all (it would expose subscription counts)
      expect('_count' in plan).toBe(false);
    }
  });

  it('no plan in the response contains a tenantId or any tenant-referencing field', async () => {
    const res = await request(app).get('/api/public/plans');
    const rawText = JSON.stringify(res.body.data);

    // No field value or key should reference 'tenantId' anywhere
    expect(rawText).not.toMatch(/"tenantId"/);
    expect(rawText).not.toMatch(/"subscriptions"/);
    expect(rawText).not.toMatch(/"_count"/);
  });
});

describe('[P5] Ordering — cheapest plan first', () => {
  beforeEach(async () => {
    await seedPlan({ name: `Expensive Plan ${Date.now()}`, priceMonthly: 9999 });
    await seedPlan({ name: `Cheap Plan ${Date.now()}`, priceMonthly: 99 });
    await seedPlan({ name: `Mid Plan ${Date.now()}`, priceMonthly: 999 });
  });

  it('plans are ordered by priceMonthly ascending', async () => {
    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);

    const prices = res.body.data.map((p: any) => parseFloat(p.priceMonthly));
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});

describe('[P6] Only active plans are returned', () => {
  it('inactive plans are filtered out and do not appear in the public response', async () => {
    const inactivePlan = await seedPlan({
      name: `INACTIVE Plan ${Date.now()}`,
      priceMonthly: 5000,
      isActive: false,
    });

    const res = await request(app).get('/api/public/plans');
    expect(res.status).toBe(200);

    const ids = res.body.data.map((p: any) => p.id);
    expect(ids).not.toContain(inactivePlan.id);
  });
});
