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
import { customerToken, staffToken } from './helpers/tokens';
import {
  GarmentType,
  InteractionSource,
  OrderStatus,
  UserRole,
} from '@prisma/client';

const app = createApp();

describe('Phase 9: Customer Portal', () => {
  let shopA: any;
  let shopB: any;
  let shopC: any;
  let ownerA: any;
  let ownerB: any;
  let ownerC: any;
  let customer1: any;
  let customer2: any;
  let tokenCustomer1: string;
  let tokenCustomer2: string;
  let tokenOwnerA: string;
  let fabricA: any;
  let fabricB: any;
  let profileA1: any;

  beforeEach(async () => {
    // 1. Create shops
    shopA = await createTenant({ name: 'Savile Row Atelier', slug: 'savile-row' });
    shopB = await createTenant({ name: 'Heritage Khadi', slug: 'heritage-khadi' });
    shopC = await createTenant({ name: 'Royal Silks', slug: 'royal-silks' });

    // 2. Create owners
    ownerA = await createUser(shopA.id, { role: UserRole.SHOP_OWNER });
    ownerB = await createUser(shopB.id, { role: UserRole.SHOP_OWNER });
    ownerC = await createUser(shopC.id, { role: UserRole.SHOP_OWNER });

    tokenOwnerA = await staffToken(ownerA);

    // 3. Create customers
    customer1 = await createCustomer({ phone: '+919876543210', firstName: 'Rahul', lastName: 'Sharma' });
    customer2 = await createCustomer({ phone: '+919876543211', firstName: 'Amit', lastName: 'Verma' });

    tokenCustomer1 = await customerToken(customer1);
    tokenCustomer2 = await customerToken(customer2);

    // 4. Create fabrics
    fabricA = await createFabricRecord(shopA.id, {
      name: 'Super 120s Italian Wool',
      color: 'Midnight Blue',
      availableMeters: '30.000',
      pricePerMeter: '2500.00',
    });
    // Add stock ledger record
    await testPrisma.fabricStockTransaction.create({
      data: {
        tenantId: shopA.id,
        fabricId: fabricA.id,
        type: 'PURCHASE',
        meters: 30,
        createdById: ownerA.id,
      },
    });

    fabricB = await createFabricRecord(shopB.id, {
      name: 'Pure Handloom Silk',
      color: 'Maroon',
      availableMeters: '20.000',
      pricePerMeter: '1800.00',
    });
    await testPrisma.fabricStockTransaction.create({
      data: {
        tenantId: shopB.id,
        fabricId: fabricB.id,
        type: 'PURCHASE',
        meters: 20,
        createdById: ownerB.id,
      },
    });

    // 5. Existing profile for customer1 at Shop A
    await linkCustomerToTenant(shopA.id, customer1.id);
    profileA1 = await createMeasurementProfile(shopA.id, customer1.id, {
      name: 'Formal Shirt Fit',
      garmentType: GarmentType.SHIRT,
    });
    await createProfileVersion(shopA.id, profileA1.id, ownerA.id, {
      values: { chest: 40, waist: 34, shoulder: 18 },
    });
  });

  // -------------------------------------------------------------------------
  // Test 1: Auto-link on first order
  // -------------------------------------------------------------------------
  it('Customer ordering from a shop they have never interacted with before correctly auto-creates ShopCustomerLink and order succeeds', async () => {
    // Customer 1 has NEVER interacted with Shop B before
    const linkBefore = await testPrisma.shopCustomerLink.findUnique({
      where: { tenantId_customerId: { tenantId: shopB.id, customerId: customer1.id } },
    });
    expect(linkBefore).toBeNull();

    // Place order at Shop B with inStoreFitting = true
    const res = await supertest(app)
      .post(`/api/portal/shops/${shopB.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        fabricId: fabricB.id,
        garmentType: GarmentType.KURTA,
        inStoreFitting: true,
        metersUsed: '3.000',
        notes: 'First order at Heritage Khadi',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe(OrderStatus.PLACED);
    expect(res.body.data.customerId).toBe(customer1.id);
    expect(res.body.data.tenantId).toBe(shopB.id);

    // 1. Verify ShopCustomerLink was auto-created with source DIRECT
    const linkAfter = await testPrisma.shopCustomerLink.findUnique({
      where: { tenantId_customerId: { tenantId: shopB.id, customerId: customer1.id } },
    });
    expect(linkAfter).not.toBeNull();
    expect(linkAfter!.firstInteractionSource).toBe(InteractionSource.DIRECT);

    // 2. Verify fabric reservation happened via Phase 4 shared logic
    const updatedFabric = await testPrisma.fabric.findUnique({ where: { id: fabricB.id } });
    expect(Number(updatedFabric!.reservedMeters)).toBe(3);
    expect(Number(updatedFabric!.availableMeters)).toBe(17);
  });

  // -------------------------------------------------------------------------
  // Test 2: Measurement profile ownership enforcement
  // -------------------------------------------------------------------------
  it('A customer attempting to order using another customer measurement profile ID is rejected', async () => {
    // Customer 2 tries to order using customer 1's profile (profileA1)
    const res = await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer2}`)
      .send({
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        measurementProfileId: profileA1.id,
        metersUsed: '2.500',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('Measurement profile does not belong to this customer or shop');

    // Verify no order was created
    const orders = await testPrisma.order.findMany({ where: { customerId: customer2.id } });
    expect(orders.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 3: Cross-customer order access rejection
  // -------------------------------------------------------------------------
  it('A customer attempting to fetch another customer order by ID is rejected', async () => {
    // Create an order for Customer 1 at Shop A
    const orderRes = await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        measurementProfileId: profileA1.id,
        metersUsed: '2.500',
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // Customer 2 attempts to fetch Customer 1's order
    const getRes = await supertest(app)
      .get(`/api/portal/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenCustomer2}`);

    expect(getRes.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Test 4: Cross-shop aggregation without bleed
  // -------------------------------------------------------------------------
  it('"My Orders" for a customer who has ordered from 2 different shops returns exactly those 2 shops orders with zero bleed from a third shop', async () => {
    // Customer 1 orders from Shop A
    await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        measurementProfileId: profileA1.id,
        metersUsed: '2.500',
      });

    // Customer 1 orders from Shop B
    await supertest(app)
      .post(`/api/portal/shops/${shopB.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        fabricId: fabricB.id,
        garmentType: GarmentType.KURTA,
        inStoreFitting: true,
        metersUsed: '3.000',
      });

    // Customer 2 orders from Shop C (fabric created at Shop C)
    const fabricC = await createFabricRecord(shopC.id, {
      availableMeters: '15.000',
    });
    await testPrisma.fabricStockTransaction.create({
      data: {
        tenantId: shopC.id,
        fabricId: fabricC.id,
        type: 'PURCHASE',
        meters: 15,
        createdById: ownerC.id,
      },
    });
    await supertest(app)
      .post(`/api/portal/shops/${shopC.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer2}`)
      .send({
        fabricId: fabricC.id,
        garmentType: GarmentType.PANT,
        inStoreFitting: true,
        metersUsed: '1.500',
      });

    // Customer 1 queries their cross-shop orders
    const res = await supertest(app)
      .get('/api/portal/orders')
      .set('Authorization', `Bearer ${tokenCustomer1}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    const tenantNames = res.body.data.map((o: any) => o.tenant.name);
    expect(tenantNames).toContain('Savile Row Atelier');
    expect(tenantNames).toContain('Heritage Khadi');
    expect(tenantNames).not.toContain('Royal Silks'); // ZERO BLEED from Shop C
  });

  // -------------------------------------------------------------------------
  // Test 5: In-Store Fitting vs Self-Measurement Configuration
  // -------------------------------------------------------------------------
  it('Respects tenant allowsSelfMeasurement preference', async () => {
    // Shop A has allowsSelfMeasurement = false by default
    const resForbidden = await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/measurement-profiles`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        name: 'My Custom Measurements',
        garmentType: GarmentType.PANT,
        values: { waist: 32, inseam: 30 },
      });

    expect(resForbidden.status).toBe(422);
    expect(resForbidden.body.error.message).toContain('does not accept customer-entered measurements');

    // Enable allowsSelfMeasurement for Shop A
    await testPrisma.tenant.update({
      where: { id: shopA.id },
      data: { allowsSelfMeasurement: true },
    });

    const resAllowed = await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/measurement-profiles`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        name: 'My Custom Measurements',
        garmentType: GarmentType.PANT,
        values: { waist: 32, inseam: 30 },
      });

    expect(resAllowed.status).toBe(201);
    expect(resAllowed.body.data.name).toBe('My Custom Measurements');
  });

  // -------------------------------------------------------------------------
  // Test 6: Invoices & PDF Download
  // -------------------------------------------------------------------------
  it('Customer can view invoices across shops and download valid PDF export', async () => {
    // Create an order for Customer 1 at Shop A
    const orderRes = await supertest(app)
      .post(`/api/portal/shops/${shopA.id}/orders`)
      .set('Authorization', `Bearer ${tokenCustomer1}`)
      .send({
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        measurementProfileId: profileA1.id,
        metersUsed: '2.500',
      });
    const orderId = orderRes.body.data.id;

    // Create an invoice as Shop A owner for this order
    const invRes = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        orderId,
        initialAdvancePaid: '500.00',
      });
    expect(invRes.status).toBe(201);
    const invoiceId = invRes.body.data.id;

    // Customer 1 fetches their invoices
    const customerInvoicesRes = await supertest(app)
      .get('/api/portal/invoices')
      .set('Authorization', `Bearer ${tokenCustomer1}`);

    expect(customerInvoicesRes.status).toBe(200);
    expect(customerInvoicesRes.body.data.length).toBe(1);
    expect(customerInvoicesRes.body.data[0].id).toBe(invoiceId);
    expect(customerInvoicesRes.body.data[0].tenant.name).toBe('Savile Row Atelier');

    // Customer 1 downloads the PDF
    const pdfRes = await supertest(app)
      .get(`/api/portal/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${tokenCustomer1}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');

    // Customer 2 cannot download Customer 1's PDF
    const pdfCustomer2Res = await supertest(app)
      .get(`/api/portal/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${tokenCustomer2}`);

    expect(pdfCustomer2Res.status).toBe(404);
  });
});
