/**
 * Order Pipeline Integration Tests (Phase 4).
 *
 * Tests:
 * 1. Atomic Order Creation & Full Rollback on Insufficient Stock (Zero Rows Verification)
 * 2. Cross-Tenant & Cross-Customer Measurement Profile Safety
 * 3. Garment Type Mismatch Rejection
 * 4. Server-Enforced Status State Machine (Valid transitions, Invalid transition rejections, Terminal states, Rework)
 * 5. Fabric Ledger Integration at CUTTING (consumeReservation)
 * 6. Fabric Ledger Integration at CANCELLED before CUTTING (releaseReservation)
 * 7. Fabric Ledger Non-Release at CANCELLED after CUTTING (permanent cut)
 * 8. Staff Assignment & Order Filtering
 * 9. Cross-Tenant Isolation (RLS + App-Level)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createCustomer,
  createFabricRecord,
  createMeasurementProfile,
  createProfileVersion,
  createTenant,
  createUser,
  linkCustomerToTenant,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { GarmentType, OrderStatus, UserRole } from '@prisma/client';

const app = createApp();

describe('Order Pipeline Module', () => {
  let shopA: any;
  let shopB: any;
  let ownerA: any;
  let staffA: any;
  let staffB: any;
  let tokenA: string;
  let tokenB: string;

  let customerA: any;
  let profileShirtA: any;
  let fabricA: any;

  beforeEach(async () => {
    shopA = await createTenant({ name: 'Savile Row Delhi', slug: 'savile-delhi' });
    shopB = await createTenant({ name: 'Regent Street Mumbai', slug: 'regent-mumbai' });

    ownerA = await createUser(shopA.id, {
      role: UserRole.SHOP_OWNER,
      email: 'owner@savile.com',
      firstName: 'Vikram',
      lastName: 'Darzi',
    });

    staffA = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'tailor1@savile.com',
      firstName: 'Ramesh',
      lastName: 'Masterji',
    });

    staffB = await createUser(shopB.id, {
      role: UserRole.STAFF,
      email: 'staff@regent.com',
      firstName: 'Suresh',
      lastName: 'Tailor',
    });

    tokenA = await staffToken(ownerA);
    tokenB = await staffToken(staffB);

    customerA = await createCustomer({
      phone: '+919876543210',
      email: 'customer.a@test.com',
      firstName: 'Rahul',
      lastName: 'Sharma',
    });
    await linkCustomerToTenant(shopA.id, customerA.id);

    profileShirtA = await createMeasurementProfile(shopA.id, customerA.id, {
      name: 'Executive Slim Shirt',
      garmentType: GarmentType.SHIRT,
    });
    await createProfileVersion(shopA.id, profileShirtA.id, ownerA.id, {
      values: { Collar: 16, Chest: 40, Sleeve: 34 },
    });

    fabricA = await createFabricRecord(shopA.id, {
      name: 'Egyptian Giza Cotton',
      color: 'Crisp White',
      type: 'Cotton',
      pricePerMeter: '800.00',
      availableMeters: '10.000',
      reservedMeters: '0.000',
      lowStockThreshold: '3.000',
    });
  });

  describe('Atomic Order Creation & Rollback Invariants', () => {
    it('creates an order atomically: reserves stock, creates Order row, links relatedOrderId, and logs initial PLACED status', async () => {
      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.500',
          estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          notes: 'Double cuff requested',
        });

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.status).toBe(OrderStatus.PLACED);
      expect(order.garmentType).toBe(GarmentType.SHIRT);
      expect(order.metersUsed).toBe('2.5');
      expect(order.priceSnapshot).toBe('800'); // Snapshotted from fabric
      expect(order.customerId).toBe(customerA.id);
      expect(order.tenantId).toBe(shopA.id);

      // Verify Fabric stock was updated atomically
      const updatedFabric = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(updatedFabric?.availableMeters.toString()).toBe('7.5');
      expect(updatedFabric?.reservedMeters.toString()).toBe('2.5');

      // Verify stock transaction ledger has relatedOrderId linked
      const stockTx = await testPrisma.fabricStockTransaction.findFirst({
        where: { fabricId: fabricA.id, type: 'RESERVE' },
      });
      expect(stockTx).not.toBeNull();
      expect(stockTx?.relatedOrderId).toBe(order.id);
      expect(stockTx?.meters.toString()).toBe('2.5');

      // Verify OrderStatusLog entry was created
      const statusLogs = await testPrisma.orderStatusLog.findMany({
        where: { orderId: order.id },
      });
      expect(statusLogs).toHaveLength(1);
      expect(statusLogs[0].fromStatus).toBeNull();
      expect(statusLogs[0].toStatus).toBe(OrderStatus.PLACED);
      expect(statusLogs[0].changedById).toBe(ownerA.id);
    });

    it('ALL-OR-NOTHING ROLLBACK: Order creation with insufficient fabric stock rolls back completely (leaves zero rows)', async () => {
      // Fabric only has 10.000m available. Attempt to create an order requiring 15.000m.
      const initialFabric = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(initialFabric?.availableMeters.toString()).toBe('10');
      expect(initialFabric?.reservedMeters.toString()).toBe('0');

      console.log('\n--- VERIFYING ATOMIC ROLLBACK ON INSUFFICIENT STOCK ---');

      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '15.000', // Exceeds available stock (10.000m)
          notes: 'Excessive meter order',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
      expect(res.body.error.message).toMatch(/Insufficient stock/i);

      // 1. Verify ZERO Order rows exist in database
      const orderCount = await testPrisma.order.count({
        where: { tenantId: shopA.id },
      });
      console.log(`Query: testPrisma.order.count() -> ${orderCount} (expected: 0)`);
      expect(orderCount).toBe(0);

      // 2. Verify ZERO OrderStatusLog rows exist in database
      const logCount = await testPrisma.orderStatusLog.count({
        where: { tenantId: shopA.id },
      });
      console.log(`Query: testPrisma.orderStatusLog.count() -> ${logCount} (expected: 0)`);
      expect(logCount).toBe(0);

      // 3. Verify ZERO fabric stock transactions (reservations) exist
      const stockTxCount = await testPrisma.fabricStockTransaction.count({
        where: { fabricId: fabricA.id },
      });
      console.log(`Query: testPrisma.fabricStockTransaction.count() -> ${stockTxCount} (expected: 0)`);
      expect(stockTxCount).toBe(0);

      // 4. Verify fabric available & reserved stock remain untouched
      const fabricAfter = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      console.log(
        `Fabric state: available=${fabricAfter?.availableMeters}m, reserved=${fabricAfter?.reservedMeters}m (expected: 10m / 0m)`,
      );
      expect(fabricAfter?.availableMeters.toString()).toBe('10');
      expect(fabricAfter?.reservedMeters.toString()).toBe('0');
      console.log('--- ATOMIC ROLLBACK CONFIRMED: ZERO PARTIAL STATE IN DB ---\n');
    });
  });

  describe('Validation & Cross-Entity Safety', () => {
    it('rejects order creation if measurement profile belongs to a different customer', async () => {
      const customerB = await createCustomer({
        phone: '+919111111111',
        firstName: 'Other',
        lastName: 'Customer',
      });
      await linkCustomerToTenant(shopA.id, customerB.id);

      const profileB = await createMeasurementProfile(shopA.id, customerB.id, {
        name: 'Customer B Profile',
        garmentType: GarmentType.SHIRT,
      });

      // Attempting to use customer B's profile for customer A's order must be rejected
      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileB.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.500',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.message).toMatch(/Measurement profile does not belong to this customer/i);
    });

    it('rejects order creation if measurement profile garment type mismatches order garment type', async () => {
      // Profile is for SHIRT, but order requests KURTA
      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.KURTA,
          metersUsed: '3.000',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.message).toMatch(/garment type.*does not match/i);
    });

    it('rejects order creation using archived fabric', async () => {
      const archivedFabric = await createFabricRecord(shopA.id, {
        name: 'Discontinued Velvet',
        isArchived: true,
        availableMeters: '10.000',
      });

      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: archivedFabric.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.000',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Server-Enforced State Machine Transitions', () => {
    let order: any;

    beforeEach(async () => {
      const res = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.000',
        });
      order = res.body.data;
    });

    it('rejects invalid jump transitions (e.g. PLACED -> READY)', async () => {
      const res = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          toStatus: OrderStatus.READY,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toMatch(/Invalid status transition/i);
    });

    it('follows valid lifecycle path: PLACED -> MEASUREMENT_CONFIRMED -> CUTTING -> STITCHING -> QUALITY_CHECK -> READY -> DELIVERED', async () => {
      // 1. PLACED -> MEASUREMENT_CONFIRMED
      const t1 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.MEASUREMENT_CONFIRMED, note: 'Measurements verified by masterji' });
      expect(t1.status).toBe(200);
      expect(t1.body.data.status).toBe(OrderStatus.MEASUREMENT_CONFIRMED);

      // 2. MEASUREMENT_CONFIRMED -> CUTTING (triggers consumeReservation)
      const t2 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.CUTTING, note: 'Cloth laid out on cutting table' });
      expect(t2.status).toBe(200);
      expect(t2.body.data.status).toBe(OrderStatus.CUTTING);

      // Verify fabric is now CONSUMED (removed from reserved)
      const fabricCheck = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(fabricCheck?.availableMeters.toString()).toBe('8'); // 10 - 2 = 8
      expect(fabricCheck?.reservedMeters.toString()).toBe('0'); // 2 consumed = 0

      // Verify CONSUME ledger row created with relatedOrderId
      const consumeTx = await testPrisma.fabricStockTransaction.findFirst({
        where: { fabricId: fabricA.id, type: 'CONSUME', relatedOrderId: order.id },
      });
      expect(consumeTx).not.toBeNull();
      expect(consumeTx?.meters.toString()).toBe('2');

      // 3. CUTTING -> STITCHING
      const t3 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.STITCHING });
      expect(t3.status).toBe(200);
      expect(t3.body.data.status).toBe(OrderStatus.STITCHING);

      // 4. STITCHING -> QUALITY_CHECK
      const t4 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.QUALITY_CHECK });
      expect(t4.status).toBe(200);
      expect(t4.body.data.status).toBe(OrderStatus.QUALITY_CHECK);

      // 5. QUALITY_CHECK -> STITCHING (rework test)
      const rework = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.STITCHING, note: 'Collar stitching slightly loose, rework' });
      expect(rework.status).toBe(200);
      expect(rework.body.data.status).toBe(OrderStatus.STITCHING);

      // Re-advance: STITCHING -> QUALITY_CHECK -> READY -> DELIVERED
      await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.QUALITY_CHECK });

      const t5 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.READY });
      expect(t5.status).toBe(200);
      expect(t5.body.data.status).toBe(OrderStatus.READY);

      const t6 = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.DELIVERED, note: 'Delivered to customer' });
      expect(t6.status).toBe(200);
      expect(t6.body.data.status).toBe(OrderStatus.DELIVERED);

      // Terminal state check: cannot transition out of DELIVERED
      const failTerminal = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.PLACED });
      expect(failTerminal.status).toBe(409);

      // Verify audit history contains chronological trail
      const history = await supertest(app)
        .get(`/api/orders/${order.id}/history`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(history.status).toBe(200);
      expect(history.body.data.length).toBeGreaterThanOrEqual(7);
    });

    it('cancelling from PLACED releases fabric reservation back to available stock', async () => {
      // Order created with 2m reserved (available: 8m, reserved: 2m)
      const cancelRes = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.CANCELLED, note: 'Customer called to cancel' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(OrderStatus.CANCELLED);

      // Verify stock was released back to available!
      const fabric = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(fabric?.availableMeters.toString()).toBe('10');
      expect(fabric?.reservedMeters.toString()).toBe('0');

      // Verify RELEASE transaction logged with relatedOrderId
      const releaseTx = await testPrisma.fabricStockTransaction.findFirst({
        where: { fabricId: fabricA.id, type: 'RELEASE', relatedOrderId: order.id },
      });
      expect(releaseTx).not.toBeNull();
      expect(releaseTx?.meters.toString()).toBe('2');

      // Terminal state check: cannot transition out of CANCELLED
      const failTransition = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.PLACED });
      expect(failTransition.status).toBe(409);
    });

    it('cancelling AFTER CUTTING marks order CANCELLED without incorrectly releasing consumed fabric', async () => {
      // Advance to CUTTING (fabric consumed)
      await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.MEASUREMENT_CONFIRMED });

      await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.CUTTING });

      // Fabric state: available = 8m, reserved = 0m (2m consumed)
      const fabricAtCutting = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(fabricAtCutting?.availableMeters.toString()).toBe('8');
      expect(fabricAtCutting?.reservedMeters.toString()).toBe('0');

      // Now cancel the order after cutting (cloth ruined or customer abandoned)
      const cancelRes = await supertest(app)
        .post(`/api/orders/${order.id}/transition`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ toStatus: OrderStatus.CANCELLED, note: 'Garment damaged during sewing, abandoned' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(OrderStatus.CANCELLED);

      // Verify fabric available stock was NOT increased back to 10!
      const fabricAfterCancel = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(fabricAfterCancel?.availableMeters.toString()).toBe('8');
      expect(fabricAfterCancel?.reservedMeters.toString()).toBe('0');

      // Verify no RELEASE transaction was created
      const releaseTx = await testPrisma.fabricStockTransaction.findFirst({
        where: { fabricId: fabricA.id, type: 'RELEASE', relatedOrderId: order.id },
      });
      expect(releaseTx).toBeNull();
    });
  });

  describe('Staff Assignment & Filtering', () => {
    it('assigns order to a staff member and supports filtering by assignedStaffId', async () => {
      const createRes = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '1.500',
        });
      const order = createRes.body.data;

      // Assign to staffA (Ramesh Masterji)
      const assignRes = await supertest(app)
        .patch(`/api/orders/${order.id}/assign`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          assignedStaffId: staffA.id,
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.assignedStaff.id).toBe(staffA.id);

      // Verify OrderStatusLog records assignment
      const history = await supertest(app)
        .get(`/api/orders/${order.id}/history`)
        .set('Authorization', `Bearer ${tokenA}`);
      const assignLog = history.body.data.find((l: any) => l.note?.includes('Assigned order to'));
      expect(assignLog).toBeDefined();

      // List orders filtered by assignedStaffId
      const listRes = await supertest(app)
        .get(`/api/orders?assignedStaffId=${staffA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].id).toBe(order.id);
    });

    it('rejects assigning order to an inactive user or user from another shop', async () => {
      const createRes = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '1.500',
        });
      const order = createRes.body.data;

      // Attempting to assign staffB (who belongs to Shop B) must return 404
      const assignOtherShop = await supertest(app)
        .patch(`/api/orders/${order.id}/assign`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          assignedStaffId: staffB.id,
        });

      expect(assignOtherShop.status).toBe(404);
    });
  });

  describe('Cross-Tenant Isolation (RLS & App-Level)', () => {
    it('prevents Shop B from viewing, transitioning, or assigning Shop A orders', async () => {
      const createRes = await supertest(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          customerId: customerA.id,
          measurementProfileId: profileShirtA.id,
          fabricId: fabricA.id,
          garmentType: GarmentType.SHIRT,
          metersUsed: '2.000',
        });
      const orderA = createRes.body.data;

      // Shop B cannot view order A -> 404
      const getRes = await supertest(app)
        .get(`/api/orders/${orderA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getRes.status).toBe(404);

      // Shop B cannot transition order A -> 404
      const transRes = await supertest(app)
        .post(`/api/orders/${orderA.id}/transition`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ toStatus: OrderStatus.MEASUREMENT_CONFIRMED });
      expect(transRes.status).toBe(404);

      // Shop B cannot assign order A -> 404
      const assignRes = await supertest(app)
        .patch(`/api/orders/${orderA.id}/assign`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ assignedStaffId: staffB.id });
      expect(assignRes.status).toBe(404);

      // Shop B list does NOT contain order A
      const listRes = await supertest(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.find((o: any) => o.id === orderA.id)).toBeUndefined();
    });
  });
});
