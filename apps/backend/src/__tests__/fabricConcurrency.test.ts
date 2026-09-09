/**
 * Concurrency Test for Fabric Inventory Module.
 *
 * Verifies that row-level locking (SELECT ... FOR UPDATE) inside withTenantContext
 * prevents race conditions:
 *
 * Two simultaneous requests attempt to reserve 7.000 meters from a fabric with
 * only 10.000 meters available.
 *
 * Expected outcome:
 * - EXACTLY ONE request succeeds (200 OK, reserving 7.000m)
 * - EXACTLY ONE request fails (422 Insufficient Stock)
 * - Under NO circumstance do both succeed
 * - Final stock state: availableMeters = 3.000, reservedMeters = 7.000
 * - Exactly one RESERVE ledger row is recorded
 */

import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import { createTenant, createUser, createFabricRecord } from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { UserRole } from '@prisma/client';

const app = createApp();

describe('Fabric Concurrency & Row-Level Locking Test', () => {
  let shop: any;
  let staff: any;
  let token: string;

  beforeEach(async () => {
    shop = await createTenant({ name: 'Concurrency Test Shop', slug: 'concurrency-shop' });
    staff = await createUser(shop.id, {
      role: UserRole.STAFF,
      email: 'staff@concurrency.com',
      firstName: 'Speedy',
      lastName: 'Darzi',
    });
    token = await staffToken(staff);
  });

  it('proves row-level locking prevents race condition: 2 competing reserveStock calls on 10m stock -> exactly 1 succeeds, 1 fails', async () => {
    // Setup fabric with exactly 10.000m available
    const fabric = await createFabricRecord(shop.id, {
      name: 'High Demand Cashmere',
      availableMeters: '10.000',
      reservedMeters: '0.000',
    });

    console.log(`\n--- STARTING CONCURRENCY RACE CONDITION TEST ---`);
    console.log(`Initial fabric stock: available=${fabric.availableMeters}m, reserved=${fabric.reservedMeters}m`);
    console.log(`Firing 2 concurrent reserve requests for 7.000m each (total 14.000m requested > 10.000m available)...`);

    const call1 = supertest(app)
      .post(`/api/fabrics/${fabric.id}/stock/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        meters: '7.000',
        note: 'Order #1 competing for fabric',
      });

    const call2 = supertest(app)
      .post(`/api/fabrics/${fabric.id}/stock/reserve`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        meters: '7.000',
        note: 'Order #2 competing for fabric',
      });

    // Fire both requests simultaneously
    const [res1, res2] = await Promise.all([call1, call2]);

    console.log(`Request 1 Response: HTTP ${res1.status}, Body: ${JSON.stringify(res1.body)}`);
    console.log(`Request 2 Response: HTTP ${res2.status}, Body: ${JSON.stringify(res2.body)}`);

    const statuses = [res1.status, res2.status].sort();

    // Verify exactly one 200 and one 422
    expect(statuses).toEqual([200, 422]);

    const successRes = res1.status === 200 ? res1 : res2;
    const failureRes = res1.status === 422 ? res1 : res2;

    expect(successRes.body.data.fabric.availableMeters).toBe('3');
    expect(successRes.body.data.fabric.reservedMeters).toBe('7');
    expect(successRes.body.data.transaction.type).toBe('RESERVE');

    expect(failureRes.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(failureRes.body.error.message).toMatch(/Insufficient stock/i);

    // Verify database state directly
    const finalFabric = await testPrisma.fabric.findUnique({ where: { id: fabric.id } });
    expect(finalFabric).not.toBeNull();
    expect(finalFabric!.availableMeters.toString()).toBe('3');
    expect(finalFabric!.reservedMeters.toString()).toBe('7');

    // Verify audit ledger contains exactly one RESERVE transaction
    const transactions = await testPrisma.fabricStockTransaction.findMany({
      where: { fabricId: fabric.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe('RESERVE');
    expect(transactions[0].meters.toString()).toBe('7');

    console.log(`--- CONCURRENCY TEST RESULT ---`);
    console.log(`Success request: HTTP ${successRes.status} (Reserved 7.000m)`);
    console.log(`Failure request: HTTP ${failureRes.status} (${failureRes.body.error.message})`);
    console.log(`Final Database State: available=${finalFabric!.availableMeters}m, reserved=${finalFabric!.reservedMeters}m`);
    console.log(`Total Ledger Entries: ${transactions.length}`);
    console.log(`--- CONCURRENCY LOCKING VERIFIED ---\n`);
  });
});
