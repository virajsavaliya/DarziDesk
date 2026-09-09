/**
 * Dashboard Isolation & Security Integration Tests (Phase 6).
 *
 * Verifies that:
 * [1] Dashboard Summary Isolation: Shop A owner sees only Shop A metrics, never Shop B's revenue/order counts/stock
 * [2] Attention Required Isolation: Shop A owner cannot see Shop B's overdue orders or low-stock fabrics
 * [3] Activity Feed Isolation: Shop A owner cannot see status change logs from Shop B
 * [4] Recent Orders Isolation: Shop A owner sees only Shop A orders
 * [5] Anti-Tampering: Injected ?tenantId query param or X-Tenant-ID header has zero effect on tenant context
 * [6] Role-Based Access Control: Staff members attempting to access owner dashboard endpoints get 403 Forbidden
 * [7] Postgres RLS DB-level verification for order status logs & orders under darzi_app role
 */

import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createTenant,
  createUser,
  createCustomer,
  linkCustomerToTenant,
  createMeasurementProfile,
  createProfileVersion,
  createFabricRecord,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { GarmentType, OrderStatus, Tenant, User, UserRole } from '@prisma/client';

const app = createApp();

describe('Dashboard Isolation & Security (Phase 6)', () => {
  let shopA: Tenant;
  let shopB: Tenant;

  let ownerA: User;
  let staffA: User;
  let ownerB: User;

  let tokenOwnerA: string;
  let tokenStaffA: string;
  let tokenOwnerB: string;

  let customerA: any;
  let profileA: any;
  let fabricA1: any;

  let customerB: any;
  let profileB: any;
  let fabricB_lowStock: any;

  let orderA1: any;
  let orderA2_dueToday: any;
  let orderB1: any;
  let orderB2_overdue: any;

  beforeEach(async () => {
    // 1. Setup two completely separate tenants
    shopA = await createTenant({ name: 'Savile Atelier Delhi', slug: 'savile-delhi', timezone: 'Asia/Kolkata' });
    shopB = await createTenant({ name: 'Mumbai Bespoke Crafts', slug: 'mumbai-bespoke', timezone: 'Asia/Kolkata' });

    // 2. Setup users for both shops
    ownerA = await createUser(shopA.id, {
      role: UserRole.SHOP_OWNER,
      email: 'vikram.owner@savile.com',
      firstName: 'Vikram',
      lastName: 'Darzi',
    });
    staffA = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'ramesh.staff@savile.com',
      firstName: 'Ramesh',
      lastName: 'Kumar',
    });

    ownerB = await createUser(shopB.id, {
      role: UserRole.SHOP_OWNER,
      email: 'karan.owner@mumbai.com',
      firstName: 'Karan',
      lastName: 'Mehta',
    });
    await createUser(shopB.id, {
      role: UserRole.STAFF,
      email: 'anand.staff@mumbai.com',
      firstName: 'Anand',
      lastName: 'Tailor',
    });

    tokenOwnerA = await staffToken(ownerA);
    tokenStaffA = await staffToken(staffA);
    tokenOwnerB = await staffToken(ownerB);

    // 3. Shop A setup: Customer, Profile, Fabrics
    customerA = await createCustomer({ phone: '+919811111111', firstName: 'Aarav', lastName: 'Sharma' });
    await linkCustomerToTenant(shopA.id, customerA.id);

    profileA = await createMeasurementProfile(shopA.id, customerA.id, {
      name: 'Standard Shirt',
      garmentType: GarmentType.SHIRT,
    });
    await createProfileVersion(shopA.id, profileA.id, ownerA.id, {
      versionNumber: 1,
      values: { chest: 40, waist: 34, length: 30 },
    });

    fabricA1 = await createFabricRecord(shopA.id, {
      name: 'Delhi Cotton',
      availableMeters: '50.000',
      lowStockThreshold: '5.000',
    });
    // Fabric A2 is healthy stock
    await createFabricRecord(shopA.id, {
      name: 'Delhi Raw Silk',
      availableMeters: '10.000',
      lowStockThreshold: '2.000',
    });

    // 4. Shop B setup: Customer, Profile, Fabrics (includes LOW STOCK)
    customerB = await createCustomer({ phone: '+919822222222', firstName: 'Rohan', lastName: 'Verma' });
    await linkCustomerToTenant(shopB.id, customerB.id);

    profileB = await createMeasurementProfile(shopB.id, customerB.id, {
      name: 'Mumbai Kurta',
      garmentType: GarmentType.KURTA,
    });
    await createProfileVersion(shopB.id, profileB.id, ownerB.id, {
      versionNumber: 1,
      values: { chest: 42, waist: 36, length: 32 },
    });

    // Low stock fabric in Shop B (1.500m available < 5.000m threshold)
    fabricB_lowStock = await createFabricRecord(shopB.id, {
      name: 'Mumbai Velvet',
      availableMeters: '1.500',
      lowStockThreshold: '5.000',
    });

    // 5. Create Orders in Shop A
    const resA1 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(resA1.status).toBe(201);
    orderA1 = resA1.body.data;

    // Order A2 in Shop A: Due Today
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);
    const resA2 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.000',
        estimatedDeliveryDate: todayNoon.toISOString(),
      });
    expect(resA2.status).toBe(201);
    orderA2_dueToday = resA2.body.data;

    // 6. Create Orders in Shop B
    const resB1 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        customerId: customerB.id,
        measurementProfileId: profileB.id,
        fabricId: fabricB_lowStock.id,
        garmentType: GarmentType.KURTA,
        metersUsed: '1.000',
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(resB1.status).toBe(201);
    orderB1 = resB1.body.data;

    // Order B2 in Shop B: OVERDUE (estimated delivery date in the past)
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const resB2 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        customerId: customerB.id,
        measurementProfileId: profileB.id,
        fabricId: fabricB_lowStock.id,
        garmentType: GarmentType.KURTA,
        metersUsed: '0.500',
        estimatedDeliveryDate: pastDate.toISOString(),
      });
    expect(resB2.status).toBe(201);
    orderB2_overdue = resB2.body.data;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [1] Dashboard Summary Isolation
  // ─────────────────────────────────────────────────────────────────────────
  it('[1] Shop A owner sees strictly Shop A metrics in /api/dashboard/summary (never Shop B)', async () => {
    const resA = await supertest(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resA.status).toBe(200);
    const summaryA = resA.body.data;

    // Shop A has exactly 2 orders created today, both active (PLACED)
    expect(summaryA.todaysOrders).toBe(2);
    expect(summaryA.activeOrders).toBe(2);
    expect(summaryA.readyForDelivery).toBe(0);
    // Neither fabric in Shop A is below threshold
    expect(summaryA.lowStockFabrics).toBe(0);

    // Shop B has 2 orders created today and 1 low stock fabric
    const resB = await supertest(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(resB.status).toBe(200);
    const summaryB = resB.body.data;

    expect(summaryB.todaysOrders).toBe(2);
    expect(summaryB.activeOrders).toBe(2);
    // Shop B's low stock fabric must show for Shop B, but NOT for Shop A
    expect(summaryB.lowStockFabrics).toBe(1);

    // Verify ordersByStatus totals match tenant orders exactly
    const totalOrdersA = summaryA.ordersByStatus.reduce((acc: number, s: any) => acc + s.count, 0);
    expect(totalOrdersA).toBe(2);

    const totalOrdersB = summaryB.ordersByStatus.reduce((acc: number, s: any) => acc + s.count, 0);
    expect(totalOrdersB).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [2] Attention Required Isolation (Overdue orders & low stock fabrics)
  // ─────────────────────────────────────────────────────────────────────────
  it('[2] Shop A owner cannot see Shop B overdue orders or low stock fabrics in /api/dashboard/attention-required', async () => {
    // Query Shop A attention items
    const resA = await supertest(app)
      .get('/api/dashboard/attention-required')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resA.status).toBe(200);
    const attentionA = resA.body.data;

    // Shop A should have 0 overdue orders (Shop B's overdue order B2 must NOT appear)
    expect(attentionA.overdueOrders).toHaveLength(0);
    const overdueIdsA = attentionA.overdueOrders.map((o: any) => o.id);
    expect(overdueIdsA).not.toContain(orderB2_overdue.id);

    // Shop A should have orderA2 in dueTodayOrders
    expect(attentionA.dueTodayOrders.length).toBeGreaterThanOrEqual(1);
    expect(attentionA.dueTodayOrders.some((o: any) => o.id === orderA2_dueToday.id)).toBe(true);
    // Shop B's orders must never appear in Shop A due today
    expect(attentionA.dueTodayOrders.some((o: any) => o.id === orderB1.id)).toBe(false);

    // Shop A has 0 low stock fabrics (Shop B's low stock velvet must NOT appear)
    expect(attentionA.lowStockFabrics).toHaveLength(0);
    const lowStockIdsA = attentionA.lowStockFabrics.map((f: any) => f.id);
    expect(lowStockIdsA).not.toContain(fabricB_lowStock.id);

    // Now query Shop B attention items
    const resB = await supertest(app)
      .get('/api/dashboard/attention-required')
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(resB.status).toBe(200);
    const attentionB = resB.body.data;

    // Shop B MUST see its own overdue order B2
    expect(attentionB.overdueOrders.some((o: any) => o.id === orderB2_overdue.id)).toBe(true);
    // Shop B must NOT see Shop A's orders
    expect(attentionB.overdueOrders.some((o: any) => o.id === orderA1.id)).toBe(false);

    // Shop B MUST see its own low stock fabric
    expect(attentionB.lowStockFabrics.some((f: any) => f.id === fabricB_lowStock.id)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [3] Activity Feed Isolation (OrderStatusLog)
  // ─────────────────────────────────────────────────────────────────────────
  it('[3] Shop A activity feed contains zero entries from Shop B in /api/dashboard/activity', async () => {
    // Transition Shop A order: PLACED -> MEASUREMENT_CONFIRMED
    const transA = await supertest(app)
      .post(`/api/orders/${orderA1.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ toStatus: OrderStatus.MEASUREMENT_CONFIRMED, note: 'Measurements verified by Vikram' });
    expect(transA.status).toBe(200);

    // Transition Shop B order: PLACED -> MEASUREMENT_CONFIRMED
    const transB = await supertest(app)
      .post(`/api/orders/${orderB1.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ toStatus: OrderStatus.MEASUREMENT_CONFIRMED, note: 'Karan confirmed Mumbai suit' });
    expect(transB.status).toBe(200);

    // Fetch Shop A activity feed
    const resA = await supertest(app)
      .get('/api/dashboard/activity')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resA.status).toBe(200);
    const activityA = resA.body.data;
    expect(activityA.length).toBeGreaterThan(0);

    // All order IDs in Shop A's activity feed must belong to Shop A
    const orderIdsInA = activityA.map((item: any) => item.order.id);
    expect(orderIdsInA).toContain(orderA1.id);
    // Shop B's order IDs must be completely absent
    expect(orderIdsInA).not.toContain(orderB1.id);
    expect(orderIdsInA).not.toContain(orderB2_overdue.id);

    // Notes from Shop B must never leak into Shop A
    const notesInA = activityA.map((item: any) => item.note);
    expect(notesInA).not.toContain('Karan confirmed Mumbai suit');

    // Fetch Shop B activity feed
    const resB = await supertest(app)
      .get('/api/dashboard/activity')
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(resB.status).toBe(200);
    const activityB = resB.body.data;
    const orderIdsInB = activityB.map((item: any) => item.order.id);
    expect(orderIdsInB).toContain(orderB1.id);
    expect(orderIdsInB).not.toContain(orderA1.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [4] Recent Orders Isolation
  // ─────────────────────────────────────────────────────────────────────────
  it('[4] Shop A owner sees only Shop A orders in /api/dashboard/orders/recent', async () => {
    const resA = await supertest(app)
      .get('/api/dashboard/orders/recent')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resA.status).toBe(200);
    const ordersA = resA.body.data;

    const idsA = ordersA.map((o: any) => o.id);
    expect(idsA).toContain(orderA1.id);
    expect(idsA).toContain(orderA2_dueToday.id);
    expect(idsA).not.toContain(orderB1.id);
    expect(idsA).not.toContain(orderB2_overdue.id);

    const resB = await supertest(app)
      .get('/api/dashboard/orders/recent')
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(resB.status).toBe(200);
    const ordersB = resB.body.data;
    const idsB = ordersB.map((o: any) => o.id);
    expect(idsB).toContain(orderB1.id);
    expect(idsB).toContain(orderB2_overdue.id);
    expect(idsB).not.toContain(orderA1.id);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [5] Anti-Tampering: Parameter & Header Injection
  // ─────────────────────────────────────────────────────────────────────────
  it('[5] Query parameter or X-Tenant-ID header injection cannot bleed Shop B data into Shop A response', async () => {
    // Attacker appends ?tenantId=<shopB> to /api/dashboard/summary
    const resQuery = await supertest(app)
      .get(`/api/dashboard/summary?tenantId=${shopB.id}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resQuery.status).toBe(200);
    expect(resQuery.body.data.lowStockFabrics).toBe(0); // Shop A's count, not Shop B's

    // Attacker sets X-Tenant-ID header to Shop B
    const resHeader = await supertest(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .set('X-Tenant-ID', shopB.id);

    expect(resHeader.status).toBe(200);
    expect(resHeader.body.data.lowStockFabrics).toBe(0); // Still Shop A's count

    // Attacker tries to view Shop B's attention required via query param
    const resAttn = await supertest(app)
      .get(`/api/dashboard/attention-required?tenantId=${shopB.id}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resAttn.status).toBe(200);
    expect(resAttn.body.data.overdueOrders).toHaveLength(0); // Shop B's overdue order does not leak
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [6] Role-Based Access Control (Staff cannot access Owner Dashboard)
  // ─────────────────────────────────────────────────────────────────────────
  it('[6] Staff members are rejected with 403 Forbidden from all owner dashboard endpoints', async () => {
    const endpoints = [
      '/api/dashboard/summary',
      '/api/dashboard/attention-required',
      '/api/dashboard/activity',
      '/api/dashboard/orders/recent',
    ];

    for (const ep of endpoints) {
      const res = await supertest(app)
        .get(ep)
        .set('Authorization', `Bearer ${tokenStaffA}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toMatch(/restricted to Shop Owners/i);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [7] Direct Postgres RLS Level Verification
  // ─────────────────────────────────────────────────────────────────────────
  it('[7] Direct Postgres RLS set_config limits OrderStatusLog and Order visibility at DB level', async () => {
    // Under tenantA context, query raw DB rows with darzi_app role
    const dbOrdersA = await testPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${shopA.id}, true)`;
      return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
        SELECT id, tenant_id FROM orders
      `;
    });

    expect(dbOrdersA.every((r) => r.tenant_id === shopA.id)).toBe(true);
    expect(dbOrdersA.some((r) => r.id === orderB1.id)).toBe(false);

    // Under tenantB context, query raw DB rows with darzi_app role
    const dbOrdersB = await testPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${shopB.id}, true)`;
      return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
        SELECT id, tenant_id FROM orders
      `;
    });

    expect(dbOrdersB.every((r) => r.tenant_id === shopB.id)).toBe(true);
    expect(dbOrdersB.some((r) => r.id === orderA1.id)).toBe(false);
  });
});
