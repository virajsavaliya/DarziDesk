import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import { createTenant, createUser, createOwner, createCustomer, createMeasurementProfile, createFabricRecord } from './helpers/factories';
import { staffToken, customerToken } from './helpers/tokens';

const app = createApp();
const request = supertest(app);

describe('Phase 12: Cross-Cutting Penetration-Style Re-Verification', () => {
  beforeEach(async () => {
    // Clear out data
    await testPrisma.notificationLog.deleteMany();
    await testPrisma.invoice.deleteMany();
    await testPrisma.order.deleteMany();
    await testPrisma.customer.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.tenantSubscription.deleteMany();
    await testPrisma.tenant.deleteMany();
  });

  afterEach(async () => {
    await testPrisma.notificationLog.deleteMany();
    await testPrisma.invoice.deleteMany();
    await testPrisma.order.deleteMany();
    await testPrisma.measurementProfileVersion.deleteMany();
    await testPrisma.measurementProfile.deleteMany();
    await testPrisma.fabric.deleteMany();
    await testPrisma.customer.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.tenantSubscription.deleteMany();
    await testPrisma.tenant.deleteMany();
  });

  it('1. Cross-tenant access via ID manipulation (GET /api/customers/:id)', async () => {
    const tenantA = await createTenant('Tenant A');
    const tenantB = await createTenant('Tenant B');

    const ownerB = await createOwner(tenantB.id, 'ownerb@test.com');
    const tokenB = await staffToken(ownerB);

    const customerA = await createCustomer(tenantA.id, 'Alice', '+15550001111');

    // Tenant B tries to access Tenant A's customer
    const response = await request
      .get(`/api/customers/${customerA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404); // Should be a 404 (not found in their tenant scope)
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('2. Use a Customer JWT on a Staff/Owner endpoint (PUT /api/shop/marketplace-settings)', async () => {
    const tenant = await createTenant('Tenant');
    
    // Create a customer
    const customer = await createCustomer(tenant.id, 'Alice', '+15551234567');
    const token = await customerToken(customer);

    // Customer tries to update marketplace settings (requires OWNER)
    const response = await request
      .put('/api/shop/marketplace-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ isListedOnMarketplace: true });

    // Should be rejected by verifyRole('OWNER')
    expect(response.status).toBe(403);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('3. Bypass entitlement limits via direct API calls (POST /api/orders)', async () => {
    const tenant = await createTenant('Tenant Limits');
    const owner = await createOwner(tenant.id, 'owner@limits.com');
    const token = await staffToken(owner);
    
    const customer = await createCustomer(tenant.id, 'Bob', '+15550002222');

    // Manually set the order limit to 0
    let plan = await testPrisma.subscriptionPlan.findFirst({ where: { name: 'Zero Plan' } });
    if (!plan) {
      plan = await testPrisma.subscriptionPlan.create({
        data: {
          name: 'Zero Plan',
          priceMonthly: 0,
          priceYearly: 0,
          maxStaffAccounts: 1,
          maxOrdersPerMonth: 0, // Zero limit!
          maxSmsCredits: 0,
          features: [],
        },
      });
    }

    // Fix: updateMany since tenantId might not be unique in this schema
    await testPrisma.tenantSubscription.updateMany({
      where: { tenantId: tenant.id },
      data: { planId: plan.id },
    });

    // Try to create an order via API
    const response = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer.id,
        measurementProfileId: '123e4567-e89b-12d3-a456-426614174000',
        fabricId: '123e4567-e89b-12d3-a456-426614174001',
        garmentType: 'SHIRT',
        metersUsed: 2,
        estimatedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('ENTITLEMENT_LIMIT_EXCEEDED');
  });

  it("4. Attempt SQL injection-style payloads in search/filter (GET /api/customers?search=')", async () => {
    const tenant = await createTenant('Tenant SQLi');
    const owner = await createOwner(tenant.id, 'owner@sqli.com');
    const token = await staffToken(owner);
    
    await createCustomer(tenant.id, 'Charlie', '+15550003333');

    // SQLi attempt
    const searchPayload = "'; DROP TABLE users;--";
    const response = await request
      .get(`/api/customers?search=${encodeURIComponent(searchPayload)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    // Should safely return 0 results because no customer matches the literal string
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(0);
  });

  it('5. Access another user\'s uploaded file/PDF by guessing ID (GET /api/invoices/:id/pdf)', async () => {
    const tenantA = await createTenant('Tenant A');
    const tenantB = await createTenant('Tenant B');

    const ownerB = await createOwner(tenantB.id, 'ownerb_pdf@test.com');
    const tokenB = await staffToken(ownerB);

    const customerA = await createCustomer(tenantA.id, 'Alice', '+15550001111');
    const profileA = await createMeasurementProfile(tenantA.id, customerA.id, 'SHIRT');
    const fabricA = await createFabricRecord(tenantA.id, 'Cotton', 10);

    const orderA = await testPrisma.order.create({
      data: {
        tenant: { connect: { id: tenantA.id } },
        customer: { connect: { id: customerA.id } },
        measurementProfile: { connect: { id: profileA.id } },
        fabric: { connect: { id: fabricA.id } },
        status: 'PLACED',
        estimatedDeliveryDate: new Date(),
        garmentType: 'SHIRT', // Fix: Added missing garmentType
        metersUsed: 2,
        priceSnapshot: 100,
      }
    });

    const invoiceA = await testPrisma.invoice.create({
      data: {
        tenantId: tenantA.id,
        orderId: orderA.id,
        customerId: customerA.id,
        invoiceNumber: 'INV-001',
        fabricCost: 10,
        stitchingCharge: 90,
        urgentSurcharge: 0,
        taxRatePercent: 0,
        taxAmount: 0,
        totalAmount: 100,
        advancePaid: 0,
        balanceDue: 100,
        status: 'ISSUED',
      },
    });

    const response = await request
      .get(`/api/invoices/${invoiceA.id}/pdf`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
