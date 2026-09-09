/**
 * Tenant isolation tests — the most critical security test file.
 *
 * Verifies that:
 * [1] Shop A owner sees only Shop A staff (never Shop B)
 * [2] Shop A staff cannot access Shop B user by ID (returns 404)
 * [3] Shop A staff cannot write to Shop B (tenantId from JWT, not body)
 * [4] Passing tenantId in request body has no effect
 * [5] Passing X-Tenant-ID header has no effect
 * [6] RLS verified at DB level via direct set_config + raw query
 * [7] Customer can only see their own data + only tenant data for shops they have a ShopCustomerLink with
 * [8] tenantId in query param has no effect
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { type Tenant, type User } from '@prisma/client';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createTenant,
  createOwner,
  createUser,
  createCustomer,
  linkCustomerToTenant,
} from './helpers/factories';
import { staffToken, customerToken } from './helpers/tokens';

const app = createApp();

describe('Tenant Isolation', () => {
  let tenantA: Tenant, tenantB: Tenant;
  let ownerA: User, ownerB: User;
  let staffA: User;
  let tokenA: string;

  beforeEach(async () => {
    tenantA = await createTenant({ name: 'Shop A', slug: 'shop-a' });
    tenantB = await createTenant({ name: 'Shop B', slug: 'shop-b' });

    ownerA = await createOwner(tenantA.id, { email: 'owner@a.com' });
    ownerB = await createOwner(tenantB.id, { email: 'owner@b.com' });
    staffA = await createUser(tenantA.id, { email: 'staff@a.com' });

    tokenA = await staffToken(ownerA);
  });

  it('[1] Shop A owner sees only Shop A users — not Shop B', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: User) => u.id) as string[];

    expect(ids).toContain(ownerA.id);
    expect(ids).toContain(staffA.id);
    expect(ids).not.toContain(ownerB.id);
  });

  it('[2] Shop A staff cannot fetch Shop B user by ID — gets 404', async () => {
    const res = await request(app)
      .get(`/api/users/${ownerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Must be 404, not 403 — do not reveal the user exists in another tenant
    expect(res.status).toBe(404);
  });

  it('[3] Creating a user always lands in the JWT tenant, never an injected one', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: 'inject@test.com',
        password: 'TestPass1!',
        firstName: 'Inject',
        lastName: 'Test',
        // Attacker tries to plant a user in tenant B
        tenantId: tenantB.id,
      });

    expect(res.status).toBe(201);
    const created = await testPrisma.user.findFirst({
      where: { email: 'inject@test.com' },
    });
    expect(created).not.toBeNull();
    // Must be in tenant A — the injected tenantId in body is ignored
    expect(created!.tenantId).toBe(tenantA.id);
    expect(created!.tenantId).not.toBe(tenantB.id);
  });

  it('[4] tenantId in request body does not change tenant context', async () => {
    // This duplicates [3] but focuses specifically on body injection
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenA}`)
      // Trying to pass a different tenant in body (GET ignores body, but we test the principle)
      .send({ tenantId: tenantB.id });

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: User) => u.id) as string[];
    expect(ids).not.toContain(ownerB.id);
  });

  it('[5] X-Tenant-ID header does not change tenant context', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantB.id); // Attacker sets a different tenant header

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: User) => u.id) as string[];
    expect(ids).not.toContain(ownerB.id);
  });

  it('[6] RLS verified at DB level: set_config limits rows returned', async () => {
    // Directly verify that RLS works at the Postgres level for users
    const resultA = await testPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
      return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
        SELECT id, tenant_id FROM users
      `;
    });

    const resultB = await testPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantB.id}, true)`;
      return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
        SELECT id, tenant_id FROM users
      `;
    });

    // Every row returned under tenantA context must belong to tenantA
    expect(resultA.every((r) => r.tenant_id === tenantA.id)).toBe(true);
    // Shop B users must not appear under tenantA context
    expect(resultA.some((r) => r.id === ownerB.id)).toBe(false);

    // Every row returned under tenantB context must belong to tenantB
    expect(resultB.every((r) => r.tenant_id === tenantB.id)).toBe(true);
    expect(resultB.some((r) => r.id === ownerA.id)).toBe(false);

    // Also verify RLS on shop_customer_links
    const customer = await createCustomer({ email: 'rls-cust@test.com' });
    await linkCustomerToTenant(tenantA.id, customer.id);
    await linkCustomerToTenant(tenantB.id, customer.id);

    const linksA = await testPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
      return tx.$queryRaw<Array<{ tenant_id: string; customer_id: string }>>`
        SELECT tenant_id, customer_id FROM shop_customer_links
      `;
    });
    expect(linksA.every((l) => l.tenant_id === tenantA.id)).toBe(true);
    expect(linksA.some((l) => l.tenant_id === tenantB.id)).toBe(false);
  });

  it('[7] Customer can only see their own data and linked shop data', async () => {
    const customer1 = await createCustomer({ email: 'cust1@link.com' });
    const customer2 = await createCustomer({ email: 'cust2@link.com' });
    const cust1Token = await customerToken(customer1);

    // Link customer1 to Shop A only
    await linkCustomerToTenant(tenantA.id, customer1.id);
    // Link customer2 to Shop B
    await linkCustomerToTenant(tenantB.id, customer2.id);

    // customer1 sees own profile
    const profileRes = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${cust1Token}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.id).toBe(customer1.id);
    expect(profileRes.body.data.email).toBe('cust1@link.com');

    // customer1 lists linked shops: returns Shop A, NOT Shop B
    const shopsRes = await request(app)
      .get('/api/customers/me/shops')
      .set('Authorization', `Bearer ${cust1Token}`);
    expect(shopsRes.status).toBe(200);
    const tenantIds = shopsRes.body.data.map((s: { tenantId: string }) => s.tenantId);
    expect(tenantIds).toContain(tenantA.id);
    expect(tenantIds).not.toContain(tenantB.id);

    // customer1 directly requests Shop A details -> 200
    const shopARes = await request(app)
      .get(`/api/customers/me/shops/${tenantA.id}`)
      .set('Authorization', `Bearer ${cust1Token}`);
    expect(shopARes.status).toBe(200);
    expect(shopARes.body.data.name).toBe('Shop A');

    // customer1 attempts to access unlinked Shop B details -> 404
    const shopBRes = await request(app)
      .get(`/api/customers/me/shops/${tenantB.id}`)
      .set('Authorization', `Bearer ${cust1Token}`);
    expect(shopBRes.status).toBe(404);
  });

  it('[8] tenantId in query param does not change tenant context', async () => {
    const res = await request(app)
      .get(`/api/users?tenantId=${tenantB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((u: User) => u.id) as string[];
    expect(ids).not.toContain(ownerB.id);
  });

  it('PATCH activate by Shop A cannot affect Shop B user', async () => {
    const res = await request(app)
      .patch(`/api/users/${ownerB.id}/active`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ isActive: false });

    // 404 — Shop B's user is invisible to Shop A
    expect(res.status).toBe(404);

    // Verify ownerB is still active in the DB
    const ownerBRefreshed = await testPrisma.user.findUnique({ where: { id: ownerB.id } });
    expect(ownerBRefreshed!.isActive).toBe(true);
  });
});
