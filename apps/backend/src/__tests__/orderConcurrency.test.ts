/**
 * Order Transition Concurrency & Row-Level Locking Test.
 *
 * Proves that SELECT ... FOR UPDATE on the order row prevents race conditions:
 * When two parallel requests hit POST /api/orders/:id/transition via Promise.all,
 * the database row lock serializes them:
 * - Exactly one request succeeds (200 OK)
 * - The second request blocks on FOR UPDATE, then reads the committed status,
 *   and fails cleanly with 409 Conflict (invalid state transition from the new state)
 * - Exactly one transition is recorded in OrderStatusLog
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
  createFabricRecord,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { GarmentType, OrderStatus, Tenant, User, UserRole } from '@prisma/client';

const app = createApp();

describe('Order Transition Concurrency & Row-Level Locking Test', () => {
  let shop: Tenant;
  let owner: User;
  let token: string;
  let customer: any;
  let profile: any;
  let fabric: any;

  beforeEach(async () => {
    shop = await createTenant({ name: 'Concurrency Tailors' });
    owner = await createUser(shop.id, {
      role: UserRole.SHOP_OWNER,
      email: 'owner@concurrency.com',
    });
    token = await staffToken(owner);

    customer = await createCustomer({ phone: '+919999988888', firstName: 'Parallel', lastName: 'Tester' });
    await linkCustomerToTenant(shop.id, customer.id);

    profile = await createMeasurementProfile(shop.id, customer.id, {
      name: 'Shirt Profile',
      garmentType: GarmentType.SHIRT,
    });

    fabric = await createFabricRecord(shop.id, {
      availableMeters: '20.000',
      reservedMeters: '0.000',
    });
  });

  it('proves row-level locking prevents race conditions: 2 parallel transition requests on PLACED order -> exactly 1 succeeds, 1 gets 409 Conflict', async () => {
    // 1. Create order in PLACED status
    const createRes = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer.id,
        measurementProfileId: profile.id,
        fabricId: fabric.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.id;

    console.log('\n--- STARTING ORDER CONCURRENCY RACE CONDITION TEST ---');
    console.log(`Order created in status: ${createRes.body.data.status}`);
    console.log('Firing 2 simultaneous transition requests for MEASUREMENT_CONFIRMED using Promise.all...');

    // 2. Fire 2 concurrent transition requests with Promise.all
    const [res1, res2] = await Promise.all([
      supertest(app)
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          note: 'Request 1 competing for transition',
        }),
      supertest(app)
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          toStatus: OrderStatus.MEASUREMENT_CONFIRMED,
          note: 'Request 2 competing for transition',
        }),
    ]);

    console.log(`Request 1 Response: HTTP ${res1.status}, Body:`, JSON.stringify(res1.body));
    console.log(`Request 2 Response: HTTP ${res2.status}, Body:`, JSON.stringify(res2.body));

    const statuses = [res1.status, res2.status].sort();

    // Exactly one must succeed (200), and the other must fail with 409 Conflict
    expect(statuses).toEqual([200, 409]);

    const successRes = res1.status === 200 ? res1 : res2;
    const conflictRes = res1.status === 409 ? res1 : res2;

    expect(successRes.body.data.status).toBe(OrderStatus.MEASUREMENT_CONFIRMED);
    expect(conflictRes.body.error.code).toBe('CONFLICT');
    expect(conflictRes.body.error.message).toMatch(/Invalid status transition/i);

    // 3. Verify database state: order status is MEASUREMENT_CONFIRMED
    const orderAfter = await testPrisma.order.findUnique({
      where: { id: orderId },
    });
    expect(orderAfter?.status).toBe(OrderStatus.MEASUREMENT_CONFIRMED);

    // 4. Verify OrderStatusLog: exactly ONE transition to MEASUREMENT_CONFIRMED exists
    const logs = await testPrisma.orderStatusLog.findMany({
      where: { orderId },
      orderBy: { changedAt: 'asc' },
    });
    // Logs: 1 from creation (toStatus: PLACED) + 1 from successful transition (toStatus: MEASUREMENT_CONFIRMED)
    expect(logs).toHaveLength(2);
    expect(logs[0].toStatus).toBe(OrderStatus.PLACED);
    expect(logs[1].toStatus).toBe(OrderStatus.MEASUREMENT_CONFIRMED);

    console.log('--- CONCURRENCY TEST RESULT ---');
    console.log(`Success: HTTP ${successRes.status} (Transitioned to ${successRes.body.data.status})`);
    console.log(`Conflict: HTTP ${conflictRes.status} (${conflictRes.body.error.message})`);
    console.log(`Total status logs in DB: ${logs.length} (Expected: 2)`);
    console.log('--- ORDER ROW-LEVEL LOCKING VERIFIED ---\n');
  });
});
