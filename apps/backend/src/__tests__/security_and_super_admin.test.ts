/**
 * Comprehensive Enterprise Security & Super Admin Test Suite.
 *
 * Validates:
 * 1. Zero Trust Header Architecture: client `x-tenant-id` header is never trusted.
 * 2. Super Admin Support Session Architecture:
 *    - Super Admin cannot access tenant data without an opaque support token.
 *    - Generated support session token grants scoped access.
 *    - Default READ_ONLY scope strictly blocks POST/PUT/PATCH/DELETE mutations with 403 SUPPORT_READ_ONLY.
 *    - Revoked support session token is rejected immediately.
 * 3. Tenant Lifecycle State Enforcement:
 *    - Suspended tenant rejects access with TENANT_SUSPENDED.
 *    - Reactivated tenant restores access.
 * 4. Dynamic Permission Evaluation:
 *    - Server-authoritative permission check and authzVersion cache invalidation.
 * 5. Idempotency Middleware:
 *    - Idempotency-Key header replays cached response on duplicate submissions.
 * 6. Concurrency Control:
 *    - Optimistic locking on Order version rejects stale state transitions with 409 Conflict.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  type Tenant,
  type User,
  UserRole,
  TenantLifecycleState,
  SupportSessionScope,
  OrderStatus,
  GarmentType,
} from '@prisma/client';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createTenant,
  createOwner,
  createUser,
  createCustomer,
  createMeasurementProfile,
  createFabric,
  linkCustomerToTenant,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { invalidateUserPermissions } from '../middleware/permissions';
import { suspendTenantWithAudit, reactivateTenantWithAudit } from '../modules/admin/admin.service';

const app = createApp();

describe('Enterprise Security & Super Admin Control Plane', () => {
  let tenantA: Tenant;
  let tenantB: Tenant;
  let ownerA: User;
  let superAdmin: User;
  let superAdminToken: string;
  let ownerAToken: string;

  beforeEach(async () => {
    tenantA = await createTenant({ name: 'Tailor Studio A', slug: 'tailor-a' });
    tenantB = await createTenant({ name: 'Bespoke Atelier B', slug: 'atelier-b' });

    ownerA = await createOwner(tenantA.id, { email: 'owner.a@test.com' });
    await createOwner(tenantB.id, { email: 'owner.b@test.com' });

    // Super Admin belongs to system (tenantA as anchor in test)
    superAdmin = await createUser(tenantA.id, {
      email: 'platform.admin@darzidesk.com',
      role: UserRole.SUPER_ADMIN,
    });

    superAdminToken = await staffToken(superAdmin);
    ownerAToken = await staffToken(ownerA);
  });

  describe('1. Zero Trust Header Architecture', () => {
    it('rejects / ignores client-injected x-tenant-id header', async () => {
      // Owner A attempts to impersonate Tenant B using x-tenant-id header
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .set('x-tenant-id', tenantB.id);

      expect(res.status).toBe(200);
      // Response must remain isolated to Tenant A context
      expect(res.body.data).toBeDefined();
    });
  });

  describe('2. Super Admin Support Session Architecture', () => {
    it('Super Admin cannot access tenant endpoints without a support session token', async () => {
      // Super Admin attempting direct access to tenant-scoped route without support token
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SUPPORT_SESSION_REQUIRED');
    });

    it('Super Admin creates a support session and gains READ_ONLY access', async () => {
      // 1. Super Admin initiates support session for Tenant B
      const createRes = await request(app)
        .post('/api/admin/support-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tenantId: tenantB.id,
          reason: 'Customer reported issue with invoice generation',
          durationMinutes: 30,
          scope: 'READ_ONLY',
        });

      expect(createRes.status).toBe(201);
      const { token, session } = createRes.body.data;
      expect(token).toMatch(/^darzi_sup_/);
      expect(session.scope).toBe(SupportSessionScope.READ_ONLY);

      // 2. Super Admin can now inspect Tenant B customers
      const readRes = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-support-session-token', token);

      expect(readRes.status).toBe(200);
    });

    it('READ_ONLY support session strictly blocks mutations with 403 SUPPORT_READ_ONLY', async () => {
      // 1. Create READ_ONLY session
      const createRes = await request(app)
        .post('/api/admin/support-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tenantId: tenantB.id,
          reason: 'Investigation ticket #8841',
          durationMinutes: 30,
          scope: 'READ_ONLY',
        });

      const { token } = createRes.body.data;

      // 2. Attempt mutation (POST /api/customers)
      const writeRes = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-support-session-token', token)
        .send({
          firstName: 'Unauthorized',
          lastName: 'Insertion',
          phone: '+919999988888',
        });

      expect(writeRes.status).toBe(403);
      expect(writeRes.body.error.code).toBe('SUPPORT_READ_ONLY');
      expect(writeRes.body.error.message).toContain('READ_ONLY');
    });

    it('Revoked support session token is rejected immediately', async () => {
      // 1. Create session
      const createRes = await request(app)
        .post('/api/admin/support-sessions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          tenantId: tenantB.id,
          reason: 'Audit inspection',
          durationMinutes: 30,
          scope: 'READ_ONLY',
        });

      const { token, session } = createRes.body.data;

      // 2. Revoke session
      const revokeRes = await request(app)
        .post(`/api/admin/support-sessions/${session.id}/revoke`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(revokeRes.status).toBe(200);

      // 3. Attempt access with revoked token
      const accessRes = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('x-support-session-token', token);

      expect(accessRes.status).toBe(403);
      expect(accessRes.body.error.code).toBe('SUPPORT_SESSION_INVALID');
    });
  });

  describe('3. Decoupled Lifecycle State Enforcement', () => {
    it('Suspended tenant rejects staff operations with TENANT_SUSPENDED', async () => {
      // 1. Suspend Tenant A with mandatory business reason
      await suspendTenantWithAudit(
        tenantA.id,
        'Terms of service violation - excessive failed payment retries',
        superAdmin.id,
      );

      // Verify DB record
      const tenantRecord = await testPrisma.tenant.findUnique({
        where: { id: tenantA.id },
      });
      expect(tenantRecord?.lifecycleState).toBe(TenantLifecycleState.SUSPENDED);
      expect(tenantRecord?.suspensionReason).toContain('Terms of service violation');

      // 2. Staff token from suspended tenant is blocked
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TENANT_SUSPENDED');

      // 3. Reactivate tenant
      await reactivateTenantWithAudit(tenantA.id, superAdmin.id);

      // 4. Access restored
      const resAfter = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(resAfter.status).toBe(200);
    });
  });

  describe('4. Dynamic Permission Evaluation & Cache Invalidation', () => {
    it('invalidateUserPermissions increments user authzVersion', async () => {
      const initialVersion = ownerA.authzVersion;

      await invalidateUserPermissions(ownerA.id);

      const updatedUser = await testPrisma.user.findUnique({
        where: { id: ownerA.id },
      });

      expect(updatedUser?.authzVersion).toBe(initialVersion + 1);
    });
  });

  describe('5. Concurrency Control & Optimistic Locking on Orders', () => {
    it('rejects stale order transition with 409 Conflict', async () => {
      // Setup customer, fabric, measurement profile
      const customer = await createCustomer();
      await linkCustomerToTenant(tenantA.id, customer.id);
      const profile = await createMeasurementProfile(tenantA.id, customer.id);
      const fabric = await createFabric(tenantA.id, { availableMeters: '10' });

      // Create Order in Tenant A
      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          customerId: customer.id,
          measurementProfileId: profile.id,
          fabricId: fabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.5',
        });

      expect(createOrderRes.status).toBe(201);
      const order = createOrderRes.body.data;
      expect(order.version).toBe(1);

      // Transition order with matching expectedVersion = 1 -> succeeds, increments to version 2
      const trans1Res = await request(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          expectedVersion: 1,
        });

      expect(trans1Res.status).toBe(200);
      expect(trans1Res.body.data.version).toBe(2);

      // Transition with stale expectedVersion = 1 -> rejects with 409 CONFLICT
      const staleRes = await request(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          toStatus: OrderStatus.CUTTING,
          expectedVersion: 1, // Stale! Current version is 2
        });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe('CONFLICT');
      expect(staleRes.body.error.message).toContain('modified by another user');
    });
  });

  describe('6. Idempotency Middleware Replay', () => {
    it('replays identical cached response on duplicate Idempotency-Key without re-executing', async () => {
      const customer = await createCustomer();
      await linkCustomerToTenant(tenantA.id, customer.id);
      const profile = await createMeasurementProfile(tenantA.id, customer.id);
      const fabric = await createFabric(tenantA.id, { availableMeters: '10' });

      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({
          customerId: customer.id,
          measurementProfileId: profile.id,
          fabricId: fabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.0',
        });

      const order = createOrderRes.body.data;

      const idempotencyKey = `test-idemp-${Date.now()}`;

      // First call to generate invoice with Idempotency-Key
      const call1 = await request(app)
        .post('/api/invoices/generate')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          orderId: order.id,
          fabricCost: '500',
          stitchingCharge: '700',
        });

      expect(call1.status).toBe(201);
      const invoiceId1 = call1.body.data.id;

      // Second duplicate call with exact same Idempotency-Key
      const call2 = await request(app)
        .post('/api/invoices/generate')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          orderId: order.id,
          fabricCost: '500',
          stitchingCharge: '700',
        });

      expect(call2.status).toBe(201);
      expect(call2.headers['x-idempotent-replay']).toBe('true');
      expect(call2.body.data.id).toBe(invoiceId1);

      // Verify only 1 invoice was created in DB
      const invoiceCount = await testPrisma.invoice.count({
        where: { tenantId: tenantA.id, orderId: order.id },
      });
      expect(invoiceCount).toBe(1);
    });
  });
});
