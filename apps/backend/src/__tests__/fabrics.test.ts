/**
 * Fabric Inventory Module Integration Tests.
 *
 * Tests:
 * - Fabric CRUD, archive, unarchive, delete protection
 * - Atomic stock operations (addStock, reserveStock, releaseReservation, consumeReservation, adjustStock)
 * - Error cases: insufficient stock, invalid quantities, missing note
 * - Decimal precision (no floating-point drift)
 * - Low stock queries
 * - Append-only stock audit ledger
 * - Cross-tenant isolation (RLS + app-level)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import { createTenant, createUser, createFabricRecord } from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { UserRole } from '@prisma/client';

const app = createApp();

describe('Fabric Inventory Module', () => {
  let shopA: any;
  let shopB: any;
  let staffA: any;
  let staffB: any;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    shopA = await createTenant({ name: 'Shop A', slug: 'shop-a' });
    shopB = await createTenant({ name: 'Shop B', slug: 'shop-b' });

    staffA = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'staff@shopa.com',
      firstName: 'Alice',
      lastName: 'Darzi',
    });

    staffB = await createUser(shopB.id, {
      role: UserRole.STAFF,
      email: 'staff@shopb.com',
      firstName: 'Bob',
      lastName: 'Darzi',
    });

    tokenA = await staffToken(staffA);
    tokenB = await staffToken(staffB);
  });

  describe('Fabric CRUD', () => {
    it('creates a fabric with initial stock and generates an initial PURCHASE ledger row', async () => {
      const res = await supertest(app)
        .post('/api/fabrics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Pure Egyptian Cotton',
          color: 'White',
          type: 'Cotton',
          pricePerMeter: '650.50',
          initialMeters: '50.000',
          lowStockThreshold: '10.000',
          supplierName: 'Cairo Mills',
          purchaseNotes: 'Initial batch 2026',
        });

      expect(res.status).toBe(201);
      const fabric = res.body.data;
      expect(fabric.name).toBe('Pure Egyptian Cotton');
      expect(fabric.availableMeters).toBe('50');
      expect(fabric.reservedMeters).toBe('0');
      expect(fabric.lowStockThreshold).toBe('10');
      expect(fabric.tenantId).toBe(shopA.id);

      // Verify audit ledger row
      const ledgerRes = await supertest(app)
        .get(`/api/fabrics/${fabric.id}/ledger`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(ledgerRes.status).toBe(200);
      expect(ledgerRes.body.data).toHaveLength(1);
      const entry = ledgerRes.body.data[0];
      expect(entry.type).toBe('PURCHASE');
      expect(entry.meters).toBe('50');
      expect(entry.createdById).toBe(staffA.id);
      expect(entry.createdBy.email).toBe('staff@shopa.com');
    });

    it('updates fabric metadata without mutating stock quantities', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        name: 'Tussar Silk',
        availableMeters: '25.000',
        reservedMeters: '5.000',
      });

      const res = await supertest(app)
        .patch(`/api/fabrics/${fabric.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Wild Tussar Silk',
          pricePerMeter: '1200.00',
          availableMeters: '999.000', // Should be ignored/not mutated
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Wild Tussar Silk');
      expect(res.body.data.pricePerMeter).toBe('1200');

      // Verify stock was NOT modified
      const fetched = await supertest(app)
        .get(`/api/fabrics/${fabric.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(fetched.body.data.availableMeters).toBe('25');
      expect(fetched.body.data.reservedMeters).toBe('5');
    });

    it('archives and unarchives a fabric cleanly', async () => {
      const fabric = await createFabricRecord(shopA.id, { name: 'Corduroy' });

      // Archive
      const archRes = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/archive`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(archRes.status).toBe(200);
      expect(archRes.body.data.isArchived).toBe(true);

      // Default list excludes archived
      const listRes = await supertest(app)
        .get('/api/fabrics')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(listRes.body.data.find((f: any) => f.id === fabric.id)).toBeUndefined();

      // List with isArchived=true includes it
      const listArchRes = await supertest(app)
        .get('/api/fabrics?isArchived=true')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(listArchRes.body.data.find((f: any) => f.id === fabric.id)).toBeDefined();

      // Unarchive
      const unarchRes = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/unarchive`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(unarchRes.status).toBe(200);
      expect(unarchRes.body.data.isArchived).toBe(false);
    });

    it('allows hard-delete only when fabric has zero transaction history', async () => {
      const fabric = await createFabricRecord(shopA.id, { name: 'Test Unused Fabric' });

      // Has no transactions -> delete succeeds
      const delRes = await supertest(app)
        .delete(`/api/fabrics/${fabric.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.data.success).toBe(true);

      // Create fabric with initial stock (creates 1 transaction)
      const createRes = await supertest(app)
        .post('/api/fabrics')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Fabric With History',
          color: 'Blue',
          type: 'Denim',
          pricePerMeter: '500',
          initialMeters: '10',
        });

      const fabricWithHistory = createRes.body.data;

      // Attempt hard delete -> must fail with 409 Conflict
      const failDelRes = await supertest(app)
        .delete(`/api/fabrics/${fabricWithHistory.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(failDelRes.status).toBe(409);
      expect(failDelRes.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Atomic Stock Operations', () => {
    it('addStock increases availableMeters and produces exactly one PURCHASE ledger row', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '0.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/add`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '15.500',
          supplierName: 'Gujarat Textiles',
          purchaseNotes: 'PO #10492',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fabric.availableMeters).toBe('25.5');
      expect(res.body.data.transaction.type).toBe('PURCHASE');
      expect(res.body.data.transaction.meters).toBe('15.5');

      // Verify ledger
      const ledger = await supertest(app)
        .get(`/api/fabrics/${fabric.id}/ledger`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(ledger.body.data).toHaveLength(1);
      expect(ledger.body.data[0].type).toBe('PURCHASE');
    });

    it('reserveStock moves stock from available to reserved and logs RESERVE', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '20.000',
        reservedMeters: '5.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/reserve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '4.500',
          note: 'Holding for custom suit order',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fabric.availableMeters).toBe('15.5');
      expect(res.body.data.fabric.reservedMeters).toBe('9.5');
      expect(res.body.data.transaction.type).toBe('RESERVE');
      expect(res.body.data.transaction.meters).toBe('4.5');
    });

    it('reserving more than available stock fails cleanly with no state mutation', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '5.000',
        reservedMeters: '2.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/reserve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '5.001',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Verify fabric state unchanged in DB
      const after = await testPrisma.fabric.findUnique({ where: { id: fabric.id } });
      expect(after?.availableMeters.toString()).toBe('5');
      expect(after?.reservedMeters.toString()).toBe('2');

      // Verify no ledger entries created
      const count = await testPrisma.fabricStockTransaction.count({
        where: { fabricId: fabric.id },
      });
      expect(count).toBe(0);
    });

    it('releaseReservation moves stock from reserved back to available and logs RELEASE', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '6.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/release`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '2.500',
          note: 'Customer cancelled order before cutting',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fabric.availableMeters).toBe('12.5');
      expect(res.body.data.fabric.reservedMeters).toBe('3.5');
      expect(res.body.data.transaction.type).toBe('RELEASE');
    });

    it('releasing more than reserved stock fails cleanly', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '2.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/release`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '2.001',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      const after = await testPrisma.fabric.findUnique({ where: { id: fabric.id } });
      expect(after?.reservedMeters.toString()).toBe('2');
    });

    it('consumeReservation removes stock permanently from reserved and logs CONSUME', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '5.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/consume`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '3.000',
          note: 'Pattern cut by Masterji Ramesh',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fabric.availableMeters).toBe('10'); // unchanged
      expect(res.body.data.fabric.reservedMeters).toBe('2'); // reduced
      expect(res.body.data.transaction.type).toBe('CONSUME');
    });

    it('consuming more than reserved stock fails cleanly', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '3.000',
      });

      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/consume`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '3.001',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('adjustStock handles positive adjustment and requires note', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
      });

      // Positive adjustment
      const res = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/adjust`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '1.250',
          note: 'Physical inventory recount found extra cut roll',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fabric.availableMeters).toBe('11.25');
      expect(res.body.data.transaction.type).toBe('ADJUSTMENT');
      expect(res.body.data.transaction.meters).toBe('1.25');
    });

    it('adjustStock handles negative adjustment but rejects if pushing stock negative', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '5.000',
      });

      // Valid negative adjustment
      const validRes = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/adjust`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '-2.000',
          note: 'Water damage on roll edge',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.data.fabric.availableMeters).toBe('3');

      // Invalid negative adjustment (exceeds available 3m)
      const invalidRes = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/adjust`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '-3.001',
          note: 'Excess write-off attempt',
        });

      expect(invalidRes.status).toBe(422);
      expect(invalidRes.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Missing note must fail validation
      const noNoteRes = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/adjust`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          meters: '-1.000',
        });

      expect(noNoteRes.status).toBe(422);
      expect(noNoteRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Decimal Precision & Invariant Verification', () => {
    it('preserves exact decimal arithmetic without floating point drift: 10m - 2.5m - 2.5m = 5m', async () => {
      const fabric = await createFabricRecord(shopA.id, {
        availableMeters: '10.000',
        reservedMeters: '0.000',
      });

      // Reserve 2.5m
      const r1 = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/reserve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ meters: '2.500' });
      expect(r1.status).toBe(200);
      expect(r1.body.data.fabric.availableMeters).toBe('7.5');
      expect(r1.body.data.fabric.reservedMeters).toBe('2.5');

      // Reserve another 2.5m
      const r2 = await supertest(app)
        .post(`/api/fabrics/${fabric.id}/stock/reserve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ meters: '2.500' });
      expect(r2.status).toBe(200);
      expect(r2.body.data.fabric.availableMeters).toBe('5');
      expect(r2.body.data.fabric.reservedMeters).toBe('5');

      // Database check directly
      const dbFabric = await testPrisma.fabric.findUnique({ where: { id: fabric.id } });
      expect(dbFabric?.availableMeters.toString()).toBe('5');
      expect(dbFabric?.reservedMeters.toString()).toBe('5');
    });
  });

  describe('Low Stock Endpoint', () => {
    it('returns fabrics where availableMeters <= lowStockThreshold and ignores archived ones', async () => {
      // Fabric 1: available (3m) <= threshold (5m) -> Low Stock
      const lowFabric = await createFabricRecord(shopA.id, {
        name: 'Low Stock Silk',
        availableMeters: '3.000',
        lowStockThreshold: '5.000',
      });

      // Fabric 2: available (12m) > threshold (5m) -> Normal Stock
      await createFabricRecord(shopA.id, {
        name: 'Normal Stock Cotton',
        availableMeters: '12.000',
        lowStockThreshold: '5.000',
      });

      // Fabric 3: available (2m) <= threshold (5m) BUT archived -> Should NOT appear
      await createFabricRecord(shopA.id, {
        name: 'Archived Low Stock',
        availableMeters: '2.000',
        lowStockThreshold: '5.000',
        isArchived: true,
      });

      const res = await supertest(app)
        .get('/api/fabrics/low-stock')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(lowFabric.id);
      expect(res.body.data[0].name).toBe('Low Stock Silk');
    });
  });

  describe('Cross-Tenant Isolation (RLS & App-Level)', () => {
    it('prevents Shop B from reading, reserving, adjusting, or viewing ledger of Shop A fabric', async () => {
      const fabricA = await createFabricRecord(shopA.id, {
        name: 'Shop A Exclusive Tweed',
        availableMeters: '20.000',
      });

      // Shop B cannot view fabric A by ID -> 404
      const getRes = await supertest(app)
        .get(`/api/fabrics/${fabricA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getRes.status).toBe(404);

      // Shop B cannot see fabric A in list -> empty or not containing fabricA
      const listRes = await supertest(app)
        .get('/api/fabrics')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.find((f: any) => f.id === fabricA.id)).toBeUndefined();

      // Shop B cannot reserve fabric A -> 404
      const reserveRes = await supertest(app)
        .post(`/api/fabrics/${fabricA.id}/stock/reserve`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ meters: '5.000' });
      expect(reserveRes.status).toBe(404);

      // Shop B cannot adjust fabric A -> 404
      const adjustRes = await supertest(app)
        .post(`/api/fabrics/${fabricA.id}/stock/adjust`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ meters: '-5.000', note: 'Malicious adjustment' });
      expect(adjustRes.status).toBe(404);

      // Shop B cannot view ledger of fabric A -> 404
      const ledgerRes = await supertest(app)
        .get(`/api/fabrics/${fabricA.id}/ledger`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(ledgerRes.status).toBe(404);

      // Fabric A stock remains pristine
      const pristine = await testPrisma.fabric.findUnique({ where: { id: fabricA.id } });
      expect(pristine?.availableMeters.toString()).toBe('20');
      expect(pristine?.reservedMeters.toString()).toBe('0');
    });
  });
});
