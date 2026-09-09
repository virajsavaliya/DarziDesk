/**
 * Phase 2 — Customer & Measurement Profile Module Tests
 *
 * Verifies:
 * 1. Walk-in customer creation without email/password working end-to-end
 * 2. Auto-creation of ShopCustomerLink on first interaction
 * 3. Garment templates default seeding and tenant-scoped customization
 * 4. Immutable measurement version history (updates NEVER overwrite previous values)
 * 5. Cross-tenant measurement profile isolation for the SAME customer
 * 6. Database-level RLS verification for measurement profiles and versions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { type Tenant, type User, GarmentType } from '@prisma/client';
import { createApp } from '../app';
import { testPrisma } from './setup';
import {
  createTenant,
  createOwner,
  createCustomer,
  linkCustomerToTenant,
  createMeasurementProfile,
  createProfileVersion,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';

const app = createApp();

describe('Phase 2 — Customer Management & Measurement Profiles', () => {
  let tenantA: Tenant, tenantB: Tenant;
  let ownerA: User, ownerB: User;
  let tokenA: string, tokenB: string;

  beforeEach(async () => {
    tenantA = await createTenant({ name: 'Tailor Shop A', slug: 'shop-a' });
    tenantB = await createTenant({ name: 'Tailor Shop B', slug: 'shop-b' });

    ownerA = await createOwner(tenantA.id, { email: 'owner@shopa.com' });
    ownerB = await createOwner(tenantB.id, { email: 'owner@shopb.com' });

    tokenA = await staffToken(ownerA);
    tokenB = await staffToken(ownerB);
  });

  // =========================================================================
  // 1. WALK-IN CUSTOMER CREATION & TENANT-SCOPED LISTING
  // =========================================================================

  describe('Walk-in Customer Management', () => {
    it('creates a walk-in customer with name and phone only (no email, no password)', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          firstName: 'Ramesh',
          lastName: 'Kumar',
          phone: '+919876500001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data.firstName).toBe('Ramesh');
      expect(res.body.data.lastName).toBe('Kumar');
      expect(res.body.data.phone).toBe('+919876500001');
      expect(res.body.data.email).toBeNull();
      expect(res.body.data.firstInteractionSource).toBe('WALK_IN');

      // Verify DB record: passwordHash must be null
      const inDb = await testPrisma.customer.findUnique({
        where: { phone: '+919876500001' },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.passwordHash).toBeNull();

      // Verify ShopCustomerLink auto-created for Shop A
      const link = await testPrisma.shopCustomerLink.findUnique({
        where: {
          tenantId_customerId: {
            tenantId: tenantA.id,
            customerId: inDb!.id,
          },
        },
      });
      expect(link).not.toBeNull();
      expect(link!.firstInteractionSource).toBe('WALK_IN');

      // Verify walk-in customer cannot self-login (passwordHash is null)
      const loginAttempt = await request(app)
        .post('/api/auth/login/customer')
        .send({
          phone: '+919876500001',
          password: 'AnyPassword123!',
        });
      expect(loginAttempt.status).toBe(401);
    });

    it('customer list is strictly scoped to customers with a ShopCustomerLink to that tenant', async () => {
      // Create customer in Shop A
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          firstName: 'Customer',
          lastName: 'ShopA',
          phone: '+919876500002',
        });

      // Create customer in Shop B
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          firstName: 'Customer',
          lastName: 'ShopB',
          phone: '+919876500003',
        });

      // Shop A list must only return Shop A customer
      const listA = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(listA.status).toBe(200);
      const phonesA = listA.body.data.map((c: any) => c.phone);
      expect(phonesA).toContain('+919876500002');
      expect(phonesA).not.toContain('+919876500003');

      // Shop B list must only return Shop B customer
      const listB = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(listB.status).toBe(200);
      const phonesB = listB.body.data.map((c: any) => c.phone);
      expect(phonesB).toContain('+919876500003');
      expect(phonesB).not.toContain('+919876500002');
    });

    it('re-using existing global phone links customer to second shop without duplication', async () => {
      // Customer first walks into Shop A
      const createRes = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          firstName: 'Shared',
          lastName: 'Customer',
          phone: '+919876500004',
        });
      const customerId = createRes.body.data.id;

      // Same customer walks into Shop B
      const linkRes = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          firstName: 'Shared',
          lastName: 'Customer',
          phone: '+919876500004',
        });

      expect(linkRes.status).toBe(201);
      expect(linkRes.body.data.id).toBe(customerId); // Same global customer ID

      // Both shops now have a link to this customer
      const links = await testPrisma.shopCustomerLink.findMany({
        where: { customerId },
      });
      expect(links.length).toBe(2);
    });
  });

  // =========================================================================
  // 2. GARMENT TEMPLATES & TENANT CUSTOMIZATION
  // =========================================================================

  describe('Garment Templates', () => {
    it('seeds default templates (Shirt, Pant, T-Shirt, Kurta) with specified standard fields', async () => {
      const res = await request(app)
        .get('/api/garment-templates')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const types = res.body.data.map((t: any) => t.garmentType);
      expect(types).toContain('SHIRT');
      expect(types).toContain('PANT');
      expect(types).toContain('TSHIRT');
      expect(types).toContain('KURTA');

      const shirt = res.body.data.find((t: any) => t.garmentType === 'SHIRT');
      const shirtFieldNames = shirt.fields.map((f: any) => f.name);
      expect(shirtFieldNames).toEqual(
        expect.arrayContaining([
          'Chest',
          'Waist',
          'Hip',
          'Shoulder',
          'Sleeve Length',
          'Shirt Length',
          'Collar',
          'Cuff',
          'Armhole',
        ]),
      );
    });

    it('Shop A customizes a template without affecting Shop B', async () => {
      // Seed templates in both shops
      const templatesA = await request(app)
        .get('/api/garment-templates')
        .set('Authorization', `Bearer ${tokenA}`);
      const shirtA = templatesA.body.data.find((t: any) => t.garmentType === 'SHIRT');

      const templatesB = await request(app)
        .get('/api/garment-templates')
        .set('Authorization', `Bearer ${tokenB}`);
      const shirtB = templatesB.body.data.find((t: any) => t.garmentType === 'SHIRT');

      // Shop A customizes Shirt fields (adds Pocket Depth, removes Cuff)
      const updateRes = await request(app)
        .put(`/api/garment-templates/${shirtA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Bespoke Royal Shirt',
          fields: [{ name: 'Chest' }, { name: 'Pocket Depth' }, { name: 'Custom Collar' }],
        });
      expect(updateRes.status).toBe(200);

      // Verify Shop A has custom fields
      const refreshedA = await request(app)
        .get(`/api/garment-templates/${shirtA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(refreshedA.body.data.fields.map((f: any) => f.name)).toEqual([
        'Chest',
        'Pocket Depth',
        'Custom Collar',
      ]);

      // Verify Shop B still has standard fields untouched
      const refreshedB = await request(app)
        .get(`/api/garment-templates/${shirtB.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      const fieldNamesB = refreshedB.body.data.fields.map((f: any) => f.name);
      expect(fieldNamesB).toContain('Cuff');
      expect(fieldNamesB).not.toContain('Pocket Depth');
    });
  });

  // =========================================================================
  // 3. MEASUREMENT PROFILES & VERSION HISTORY IMMUTABILITY
  // =========================================================================

  describe('Measurement Profiles & Version History', () => {
    it('creates profile with version 1; updating creates version 2 and NEVER overwrites v1', async () => {
      const customer = await createCustomer({ phone: '+919876500010' });
      await linkCustomerToTenant(tenantA.id, customer.id);

      // Step 1: Create profile (version 1)
      const createRes = await request(app)
        .post(`/api/customers/${customer.id}/measurements`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Self - Formal Shirt',
          garmentType: GarmentType.SHIRT,
          unit: 'INCHES',
          fitPreference: 'SLIM',
          fitNotes: 'Tapered waist requested',
          values: {
            Chest: 40.5,
            Waist: 34,
            Shoulder: 18,
            'Shirt Length': 30,
          },
        });

      expect(createRes.status).toBe(201);
      const profileId = createRes.body.data.id;
      expect(createRes.body.data.name).toBe('Self - Formal Shirt');
      expect(createRes.body.data.currentVersion.versionNumber).toBe(1);
      expect(createRes.body.data.currentVersion.isCurrent).toBe(true);
      expect(createRes.body.data.currentVersion.values.Chest).toBe(40.5);
      expect(createRes.body.data.currentVersion.createdBy.id).toBe(ownerA.id);

      // Step 2: Customer loses weight -> Tailor takes new measurements (version 2)
      const updateRes = await request(app)
        .post(`/api/measurements/${profileId}/versions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          unit: 'INCHES',
          fitPreference: 'SLIM',
          fitNotes: 'Lost 2 inches at waist',
          values: {
            Chest: 39.5,
            Waist: 32,
            Shoulder: 18,
            'Shirt Length': 30,
          },
        });

      expect(updateRes.status).toBe(201);
      expect(updateRes.body.data.versionNumber).toBe(2);
      expect(updateRes.body.data.isCurrent).toBe(true);
      expect(updateRes.body.data.values.Chest).toBe(39.5);
      expect(updateRes.body.data.values.Waist).toBe(32);

      // Step 3: Verify Version History Immuntability in Database
      const allVersions = await testPrisma.measurementProfileVersion.findMany({
        where: { profileId },
        orderBy: { versionNumber: 'asc' },
      });

      expect(allVersions.length).toBe(2);

      // Version 1 check: untouched original values, isCurrent = false
      const v1 = allVersions[0];
      expect(v1.versionNumber).toBe(1);
      expect(v1.isCurrent).toBe(false);
      expect((v1.values as any).Chest).toBe(40.5);
      expect((v1.values as any).Waist).toBe(34);
      expect(v1.createdById).toBe(ownerA.id);

      // Version 2 check: new values, isCurrent = true
      const v2 = allVersions[1];
      expect(v2.versionNumber).toBe(2);
      expect(v2.isCurrent).toBe(true);
      expect((v2.values as any).Chest).toBe(39.5);
      expect((v2.values as any).Waist).toBe(32);

      // Step 4: Fetch full profile history via API
      const historyRes = await request(app)
        .get(`/api/measurements/${profileId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.versions.length).toBe(2);
      expect(historyRes.body.data.currentVersion.versionNumber).toBe(2);
    });
  });

  // =========================================================================
  // 4. CROSS-TENANT MEASUREMENT PROFILE ISOLATION
  // =========================================================================

  describe('Cross-Tenant Measurement Profile Isolation', () => {
    it('same customer has independent measurement profiles at Shop A and Shop B without leaking data', async () => {
      // Global customer C linked to both shops
      const customer = await createCustomer({ phone: '+919876500020' });
      await linkCustomerToTenant(tenantA.id, customer.id);
      await linkCustomerToTenant(tenantB.id, customer.id);

      // Shop A creates a "Formal Shirt" profile for customer C
      const profileARes = await request(app)
        .post(`/api/customers/${customer.id}/measurements`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Shop A Shirt',
          garmentType: GarmentType.SHIRT,
          values: { Chest: 42, Waist: 36 },
        });
      expect(profileARes.status).toBe(201);

      // Shop B creates a "Wedding Kurta" profile for the SAME customer C
      const profileBRes = await request(app)
        .post(`/api/customers/${customer.id}/measurements`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Shop B Kurta',
          garmentType: GarmentType.KURTA,
          values: { Chest: 44, Waist: 38, Length: 42 },
        });
      expect(profileBRes.status).toBe(201);
      const profileBId = profileBRes.body.data.id;

      // Check 1: Shop A lists profiles for customer C -> sees ONLY Shop A's profile
      const listResA = await request(app)
        .get(`/api/customers/${customer.id}/measurements`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(listResA.status).toBe(200);
      const namesA = listResA.body.data.map((p: any) => p.name);
      expect(namesA).toContain('Shop A Shirt');
      expect(namesA).not.toContain('Shop B Kurta');

      // Check 2: Shop B lists profiles for customer C -> sees ONLY Shop B's profile
      const listResB = await request(app)
        .get(`/api/customers/${customer.id}/measurements`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(listResB.status).toBe(200);
      const namesB = listResB.body.data.map((p: any) => p.name);
      expect(namesB).toContain('Shop B Kurta');
      expect(namesB).not.toContain('Shop A Shirt');

      // Check 3: Shop A directly requests Shop B's profile by ID -> 404
      const leakAttemptRes = await request(app)
        .get(`/api/measurements/${profileBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(leakAttemptRes.status).toBe(404);

      // Check 4: Shop A attempts to add a new version to Shop B's profile -> 404
      const writeAttemptRes = await request(app)
        .post(`/api/measurements/${profileBId}/versions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          values: { Chest: 99 },
        });

      expect(writeAttemptRes.status).toBe(404);
    });

    it('RLS enforces isolation at database level on measurement_profiles and versions', async () => {
      const customer = await createCustomer({ phone: '+919876500030' });
      await linkCustomerToTenant(tenantA.id, customer.id);
      await linkCustomerToTenant(tenantB.id, customer.id);

      const profA = await createMeasurementProfile(tenantA.id, customer.id, { name: 'RLS Prof A' });
      await createProfileVersion(tenantA.id, profA.id, ownerA.id);

      const profB = await createMeasurementProfile(tenantB.id, customer.id, { name: 'RLS Prof B' });
      await createProfileVersion(tenantB.id, profB.id, ownerB.id);

      // Query raw profiles under Shop A context
      const resultA = await testPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
        return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
          SELECT id, tenant_id FROM measurement_profiles
        `;
      });

      expect(resultA.every((p) => p.tenant_id === tenantA.id)).toBe(true);
      expect(resultA.some((p) => p.id === profB.id)).toBe(false);

      // Query raw profiles under Shop B context
      const resultB = await testPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantB.id}, true)`;
        return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
          SELECT id, tenant_id FROM measurement_profiles
        `;
      });

      expect(resultB.every((p) => p.tenant_id === tenantB.id)).toBe(true);
      expect(resultB.some((p) => p.id === profA.id)).toBe(false);

      // Raw versions check under Shop A context
      const versionsA = await testPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE darzi_app`;
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantA.id}, true)`;
        return tx.$queryRaw<Array<{ id: string; tenant_id: string }>>`
          SELECT id, tenant_id FROM measurement_profile_versions
        `;
      });

      expect(versionsA.every((v) => v.tenant_id === tenantA.id)).toBe(true);
    });
  });
});
