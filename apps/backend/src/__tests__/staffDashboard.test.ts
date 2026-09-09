/**
 * Staff Dashboard Integration Tests (Phase 5).
 *
 * Tests:
 * 1. Personal Task Queue Scoping: Staff member sees ONLY their own assigned orders (never another staff's)
 * 2. Owner Queue Visibility: Owner sees all tenant orders
 * 3. Order Detail Ownership Enforcement: Staff member cannot view an order assigned to another staff member (403)
 * 4. Transition Authorization: Staff member cannot transition an order assigned to another staff member (403);
 *    Assigned staff member and Owner can transition (200)
 * 5. Tenant-Wide Customer Search: All staff members can search all customers in their tenant
 * 6. Daily Summary Metrics from OrderStatusLog & Tenant Timezone:
 *    - completedToday counts DELIVERED transitions from OrderStatusLog within tenant day boundaries
 *    - pendingCount & dueNext48Hours
 * 7. Hard-Disabled Dev Demo Router in Production (returns 404)
 * 8. Cross-Tenant Isolation: Staff from Shop A cannot see Shop B via /api/staff endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('Staff Dashboard Module', () => {
  let shopA: Tenant;
  let shopB: Tenant;

  let ownerA: User;
  let staffA1: User; // Ramesh
  let staffA2: User; // Suresh
  let staffB: User;

  let tokenOwnerA: string;
  let tokenStaffA1: string;
  let tokenStaffA2: string;
  let tokenStaffB: string;

  let customerA: any;
  let profileA: any;
  let fabricA: any;

  let order1: any; // Assigned to staffA1
  let order2: any; // Assigned to staffA2

  beforeEach(async () => {
    shopA = await createTenant({ name: 'Savile Atelier Delhi', timezone: 'Asia/Kolkata' });
    shopB = await createTenant({ name: 'Mumbai Bespoke', timezone: 'Asia/Kolkata' });

    ownerA = await createUser(shopA.id, {
      role: UserRole.SHOP_OWNER,
      email: 'owner@savile.com',
      firstName: 'Vikram',
      lastName: 'Darzi',
    });
    staffA1 = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'ramesh@savile.com',
      firstName: 'Ramesh',
      lastName: 'Kumar',
    });
    staffA2 = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'suresh@savile.com',
      firstName: 'Suresh',
      lastName: 'Mistry',
    });
    staffB = await createUser(shopB.id, {
      role: UserRole.STAFF,
      email: 'staff@mumbai.com',
      firstName: 'Karan',
      lastName: 'Tailor',
    });

    tokenOwnerA = await staffToken(ownerA);
    tokenStaffA1 = await staffToken(staffA1);
    tokenStaffA2 = await staffToken(staffA2);
    tokenStaffB = await staffToken(staffB);

    customerA = await createCustomer({
      phone: '+919811122233',
      firstName: 'Amitabh',
      lastName: 'Bachchan',
      email: 'amitabh@bollywood.com',
    });
    await linkCustomerToTenant(shopA.id, customerA.id);

    profileA = await createMeasurementProfile(shopA.id, customerA.id, {
      name: 'Sherwani Fit',
      garmentType: GarmentType.SHIRT,
    });
    await createProfileVersion(shopA.id, profileA.id, ownerA.id, {
      versionNumber: 1,
      values: { chest: 42, waist: 36, length: 32 },
    });

    fabricA = await createFabricRecord(shopA.id, {
      name: 'Italian Silk',
      pricePerMeter: '1800.00',
      availableMeters: '30.000',
      reservedMeters: '0.000',
    });

    // Create Order 1 assigned to Staff A1
    const res1 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '3.000',
        estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Double stitched seams',
      });
    expect(res1.status).toBe(201);
    order1 = res1.body.data;
    await testPrisma.order.update({
      where: { id: order1.id },
      data: { assignedStaffId: staffA1.id },
    });

    // Create Order 2 assigned to Staff A2
    const res2 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        estimatedDeliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        notes: 'Single cuff',
      });
    expect(res2.status).toBe(201);
    order2 = res2.body.data;
    await testPrisma.order.update({
      where: { id: order2.id },
      data: { assignedStaffId: staffA2.id },
    });
  });

  describe('Task Queue Scoping (GET /api/staff/me/orders)', () => {
    it('Staff member sees ONLY their own assigned orders, never another staff member orders in same tenant', async () => {
      // Staff A1 calls /me/orders
      const resA1 = await supertest(app)
        .get('/api/staff/me/orders')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(resA1.status).toBe(200);
      expect(resA1.body.data).toHaveLength(1);
      expect(resA1.body.data[0].id).toBe(order1.id);
      expect(resA1.body.data[0].assignedStaff.id).toBe(staffA1.id);

      // Staff A2 calls /me/orders
      const resA2 = await supertest(app)
        .get('/api/staff/me/orders')
        .set('Authorization', `Bearer ${tokenStaffA2}`);

      expect(resA2.status).toBe(200);
      expect(resA2.body.data).toHaveLength(1);
      expect(resA2.body.data[0].id).toBe(order2.id);
      expect(resA2.body.data[0].assignedStaff.id).toBe(staffA2.id);
    });

    it('Owner sees ALL tenant orders in task queue', async () => {
      const resOwner = await supertest(app)
        .get('/api/staff/me/orders')
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(resOwner.status).toBe(200);
      expect(resOwner.body.data.length).toBeGreaterThanOrEqual(2);
      const orderIds = resOwner.body.data.map((o: any) => o.id);
      expect(orderIds).toContain(order1.id);
      expect(orderIds).toContain(order2.id);
    });

    it('supports status filtering and delivery date sorting with pagination', async () => {
      // Filter by PLACED
      const res = await supertest(app)
        .get('/api/staff/me/orders?status=PLACED&sort=estimatedDeliveryDate&order=asc&limit=10&offset=0')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.offset).toBe(0);
    });
  });

  describe('Order Detail Scoping (GET /api/staff/me/orders/:id)', () => {
    it('Staff member can view their own assigned order with full measurements and allowed transitions', async () => {
      const res = await supertest(app)
        .get(`/api/staff/me/orders/${order1.id}`)
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order1.id);
      expect(res.body.data.customer.firstName).toBe('Amitabh');
      expect(res.body.data.fabric.name).toBe('Italian Silk');
      expect(res.body.data.measurementProfile.versions[0].values).toBeDefined();
      expect(res.body.data.allowedNextTransitions).toContain(OrderStatus.MEASUREMENT_CONFIRMED);
      expect(res.body.data.allowedNextTransitions).toContain(OrderStatus.CANCELLED);
    });

    it('Staff member is REJECTED (403 Forbidden) when requesting an order assigned to another staff member', async () => {
      // Staff A1 attempts to view Order 2 (assigned to Staff A2)
      const res = await supertest(app)
        .get(`/api/staff/me/orders/${order2.id}`)
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/Access denied/i);
    });

    it('Owner can view any order detail in the tenant', async () => {
      const res = await supertest(app)
        .get(`/api/staff/me/orders/${order2.id}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order2.id);
    });
  });

  describe('Order Transition Authorization (POST /api/orders/:id/transition)', () => {
    it('Staff member attempting to transition an order NOT assigned to them is REJECTED (403 Forbidden)', async () => {
      // Staff A1 attempts to advance Order 2 (assigned to Staff A2)
      const res = await supertest(app)
        .post(`/api/orders/${order2.id}/transition`)
        .set('Authorization', `Bearer ${tokenStaffA1}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          note: 'Unauthorized transition attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/Staff members can only transition orders assigned to them/i);

      // Verify order status in DB is untouched
      const orderCheck = await testPrisma.order.findUnique({ where: { id: order2.id } });
      expect(orderCheck?.status).toBe(OrderStatus.PLACED);
    });

    it('Assigned staff member can successfully transition their own order', async () => {
      const res = await supertest(app)
        .post(`/api/orders/${order1.id}/transition`)
        .set('Authorization', `Bearer ${tokenStaffA1}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          note: 'Measurements verified by Ramesh',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(OrderStatus.MEASUREMENT_CONFIRMED);
    });

    it('Owner can transition any order regardless of staff assignment', async () => {
      const res = await supertest(app)
        .post(`/api/orders/${order2.id}/transition`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          note: 'Owner confirmed measurements',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(OrderStatus.MEASUREMENT_CONFIRMED);
    });
  });

  describe('Tenant-Wide Customer Search (GET /api/customers/search)', () => {
    it('Any Staff member can search ALL customers in their tenant (even before an order exists)', async () => {
      // Create a second walk-in customer in Shop A without any orders
      const newCust = await createCustomer({
        phone: '+919999900000',
        firstName: 'Shahrukh',
        lastName: 'Khan',
      });
      await linkCustomerToTenant(shopA.id, newCust.id);

      // Staff A1 searches by name
      const resName = await supertest(app)
        .get('/api/customers/search?query=Shahrukh')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(resName.status).toBe(200);
      expect(resName.body.data).toHaveLength(1);
      expect(resName.body.data[0].firstName).toBe('Shahrukh');

      // Staff A2 searches by phone
      const resPhone = await supertest(app)
        .get('/api/customers/search?query=9999900000')
        .set('Authorization', `Bearer ${tokenStaffA2}`);

      expect(resPhone.status).toBe(200);
      expect(resPhone.body.data).toHaveLength(1);
      expect(resPhone.body.data[0].phone).toBe('+919999900000');
    });

    it('Customer search is strictly tenant-scoped (Shop A staff cannot search Shop B customers)', async () => {
      const custB = await createCustomer({
        phone: '+918888877777',
        firstName: 'Deepika',
        lastName: 'Padukone',
      });
      await linkCustomerToTenant(shopB.id, custB.id);

      // Shop A staff searches for Deepika
      const res = await supertest(app)
        .get('/api/customers/search?query=Deepika')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('Daily Summary Metrics (GET /api/staff/me/summary)', () => {
    it('calculates completedToday from OrderStatusLog using tenant timezone and counts pending/due orders', async () => {
      // Check initial summary for Staff A1
      const initialRes = await supertest(app)
        .get('/api/staff/me/summary')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(initialRes.status).toBe(200);
      expect(initialRes.body.data.completedToday).toBe(0);
      expect(initialRes.body.data.pendingCount).toBe(1); // Order 1
      expect(initialRes.body.data.dueNext48Hours).toBe(1);
      expect(initialRes.body.data.timezone).toBe('Asia/Kolkata');

      // Advance Order 1 all the way to DELIVERED
      await testPrisma.order.update({
        where: { id: order1.id },
        data: { status: OrderStatus.READY },
      });
      await supertest(app)
        .post(`/api/orders/${order1.id}/transition`)
        .set('Authorization', `Bearer ${tokenStaffA1}`)
        .send({ toStatus: OrderStatus.DELIVERED, note: 'Delivered today' });

      // Check updated summary for Staff A1: completedToday must now be 1
      const updatedRes = await supertest(app)
        .get('/api/staff/me/summary')
        .set('Authorization', `Bearer ${tokenStaffA1}`);

      expect(updatedRes.status).toBe(200);
      expect(updatedRes.body.data.completedToday).toBe(1);
      expect(updatedRes.body.data.pendingCount).toBe(0); // Delivered orders are not pending
    });
  });

  describe('Production Demo Guard & Cross-Tenant Isolation', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('HARD-DISABLES dev demo endpoint when NODE_ENV=production (returns 404)', async () => {
      process.env.NODE_ENV = 'production';

      const res = await supertest(app).get('/api/dev/demo-session');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('enforces cross-tenant isolation on staff endpoints (Shop B staff cannot access Shop A data)', async () => {
      const res = await supertest(app)
        .get(`/api/staff/me/orders/${order1.id}`)
        .set('Authorization', `Bearer ${tokenStaffB}`);

      expect(res.status).toBe(404); // RLS / Tenant isolation hides it completely
    });
  });
});
