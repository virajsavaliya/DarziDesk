import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import argon2 from 'argon2';
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
import { customerToken, staffToken } from './helpers/tokens';
import {
  GarmentType,
  OrderStatus,
  UserRole,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  Prisma,
} from '@prisma/client';

const app = createApp();

describe('Phase 11: Super Admin Platform Dashboard & Entitlements', () => {
  let superAdmin: any;
  let shopA: any;
  let shopB: any;
  let ownerA: any;
  let ownerB: any;
  let customer1: any;
  let profile1: any;
  let fabric1: any;

  let tokenSuperAdmin: string;
  let tokenOwnerA: string;
  let tokenOwnerB: string;
  let tokenCustomer1: string;

  let basicPlan: any;
  let proPlan: any;

  beforeEach(async () => {
    // 1. Create Super Admin (tenantId is null)
    superAdmin = await testPrisma.user.create({
      data: {
        tenantId: null,
        email: `platform-admin-${Date.now()}@darzidesk.com`,
        passwordHash: await argon2.hash('SuperAdminSecret123!'),
        firstName: 'Platform',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      },
    });
    tokenSuperAdmin = await staffToken(superAdmin);

    // 2. Create Plans
    basicPlan = await testPrisma.subscriptionPlan.create({
      data: {
        name: `Basic Plan ${Date.now()}`,
        priceMonthly: new Prisma.Decimal('1999.00'),
        priceYearly: new Prisma.Decimal('19999.00'),
        maxStaffAccounts: 3,
        maxOrdersPerMonth: 2,
        maxSmsCredits: 100,
        isDefault: true,
        features: ['3 Staff Accounts', '2 Orders/month (Test limit)', 'Basic Invoicing'],
      },
    });

    proPlan = await testPrisma.subscriptionPlan.create({
      data: {
        name: `Pro Plan ${Date.now()}`,
        priceMonthly: new Prisma.Decimal('4999.00'),
        priceYearly: new Prisma.Decimal('49999.00'),
        maxStaffAccounts: 10,
        maxOrdersPerMonth: 100,
        maxSmsCredits: 500,
        features: ['10 Staff Accounts', '100 Orders/month', 'Marketplace Listing'],
      },
    });

    // 3. Create Shop A with active Basic Plan
    shopA = await createTenant({
      name: 'Bespoke Atelier A',
      slug: `atelier-a-${Date.now()}`,
      withoutSubscription: true,
    });
    ownerA = await createUser(shopA.id, {
      role: UserRole.SHOP_OWNER,
      email: `owner-a-${Date.now()}@atelier.com`,
      password: 'OwnerPassword123!',
    });
    tokenOwnerA = await staffToken(ownerA);

    const now = new Date();
    await testPrisma.tenantSubscription.create({
      data: {
        tenantId: shopA.id,
        planId: basicPlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
      },
    });

    // 4. Create Shop B with PAST_DUE subscription
    shopB = await createTenant({
      name: 'Heritage Tailors B',
      slug: `heritage-b-${Date.now()}`,
      withoutSubscription: true,
    });
    ownerB = await createUser(shopB.id, {
      role: UserRole.SHOP_OWNER,
      email: `owner-b-${Date.now()}@heritage.com`,
      password: 'OwnerPassword123!',
    });
    tokenOwnerB = await staffToken(ownerB);

    await testPrisma.tenantSubscription.create({
      data: {
        tenantId: shopB.id,
        planId: basicPlan.id,
        status: SubscriptionStatus.PAST_DUE,
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Customer & inventory setup for order testing
    customer1 = await createCustomer({ phone: `+9198${Date.now().toString().slice(-8)}` });
    tokenCustomer1 = await customerToken(customer1);

    await linkCustomerToTenant(shopA.id, customer1.id);
    await linkCustomerToTenant(shopB.id, customer1.id);

    profile1 = await createMeasurementProfile(shopA.id, customer1.id, {
      name: 'Formal Shirt Profile',
      garmentType: GarmentType.SHIRT,
    });

    fabric1 = await createFabricRecord(shopA.id, {
      name: 'Egyptian Cotton White',
      availableMeters: '100.000',
    });
  });

  // -------------------------------------------------------------------------
  // Test 1: Cross-Tenant SuperAdmin Access & Strict RBAC Rejection for ShopOwner
  // -------------------------------------------------------------------------
  it('SuperAdmin can access cross-tenant platform endpoints, while ShopOwner receives strict 403 Forbidden', async () => {
    // 1. SuperAdmin lists all tenants
    const superAdminRes = await supertest(app)
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(superAdminRes.status).toBe(200);
    expect(superAdminRes.body.data).toBeDefined();
    expect(Array.isArray(superAdminRes.body.data)).toBe(true);

    const tenantIds = superAdminRes.body.data.map((t: any) => t.id);
    expect(tenantIds).toContain(shopA.id);
    expect(tenantIds).toContain(shopB.id);

    // 2. ShopOwner attempts to access /api/admin/tenants -> 403 Forbidden
    const ownerTenantsRes = await supertest(app)
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${tokenOwnerA}`);
    expect(ownerTenantsRes.status).toBe(403);

    // 3. ShopOwner attempts to access /api/admin/revenue/summary -> 403 Forbidden
    const ownerRevenueRes = await supertest(app)
      .get('/api/admin/revenue/summary')
      .set('Authorization', `Bearer ${tokenOwnerA}`);
    expect(ownerRevenueRes.status).toBe(403);

    // 4. ShopOwner attempts to modify plans -> 403 Forbidden
    const ownerPlanRes = await supertest(app)
      .post('/api/admin/plans')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        name: 'Hacker Plan',
        priceMonthly: 0,
        priceYearly: 0,
        maxStaffAccounts: 99,
        maxOrdersPerMonth: 9999,
      });
    expect(ownerPlanRes.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Test 2: Entitlement Enforcement — Staff Limits
  // -------------------------------------------------------------------------
  it('Creating a 4th staff account when maxStaffAccounts=3 is rejected with a clear limit-specific error', async () => {
    // Basic plan maxStaffAccounts = 3.
    // Create staff 1
    const s1 = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff1-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Aman',
        lastName: 'Verma',
      });
    expect(s1.status).toBe(201);

    // Create staff 2
    const s2 = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff2-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Rohit',
        lastName: 'Sharma',
      });
    expect(s2.status).toBe(201);

    // Create staff 3
    const s3 = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff3-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Sunil',
        lastName: 'Chhetri',
      });
    expect(s3.status).toBe(201);

    // Attempt to create staff 4 -> must be rejected with 403 and specific message
    const s4 = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff4-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Karan',
        lastName: 'Johar',
      });

    expect(s4.status).toBe(403);
    expect(s4.body.error).toBeDefined();
    expect(s4.body.error.message).toContain('Staff limit reached (3/3)');
    expect(s4.body.error.message).toContain(basicPlan.name);
  });

  // -------------------------------------------------------------------------
  // Test 3: Entitlement Enforcement — Order Limits
  // -------------------------------------------------------------------------
  it('Creating an order when maxOrdersPerMonth is reached is rejected with a clear limit-specific error', async () => {
    // Shop A has maxOrdersPerMonth = 2
    // 1. Create order 1 -> succeeds
    const o1 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        priceSnapshot: '1500.00',
      });
    expect(o1.status).toBe(201);

    // 2. Create order 2 -> succeeds
    const o2 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        priceSnapshot: '1500.00',
      });
    expect(o2.status).toBe(201);

    // 3. Create order 3 -> rejected with limit error
    const o3 = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        priceSnapshot: '1500.00',
      });

    expect(o3.status).toBe(403);
    expect(o3.body.error).toBeDefined();
    expect(o3.body.error.message).toContain('Monthly order limit reached (2/2)');
    expect(o3.body.error.message).toContain(basicPlan.name);
  });

  // -------------------------------------------------------------------------
  // Test 4: PAST_DUE Tenant cannot create new orders but CAN view existing ones
  // -------------------------------------------------------------------------
  it('A PAST_DUE tenant cannot create new orders but CAN still view existing ones', async () => {
    // Shop B is PAST_DUE
    // Create profile and fabric for Shop B directly in database for historical verification
    const profileB = await createMeasurementProfile(shopB.id, customer1.id, {
      name: 'Existing Profile B',
      garmentType: GarmentType.SHIRT,
    });
    const fabricB = await createFabricRecord(shopB.id, {
      name: 'Existing Silk B',
      availableMeters: '50.000',
    });

    // Create an existing historical order in the database for Shop B
    const historicalOrder = await testPrisma.order.create({
      data: {
        tenantId: shopB.id,
        customerId: customer1.id,
        measurementProfileId: profileB.id,
        fabricId: fabricB.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '3.000',
        status: OrderStatus.PLACED,
        priceSnapshot: '2200.00',
      },
    });

    // 1. Attempting to create a NEW order at Shop B -> Rejected due to PAST_DUE
    const newOrderRes = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        customerId: customer1.id,
        measurementProfileId: profileB.id,
        fabricId: fabricB.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        priceSnapshot: '1800.00',
      });

    expect(newOrderRes.status).toBe(403);
    expect(newOrderRes.body.error.message).toContain('Subscription is PAST_DUE');

    // 2. But Shop Owner CAN still view existing orders
    const getOrderRes = await supertest(app)
      .get(`/api/orders/${historicalOrder.id}`)
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(getOrderRes.status).toBe(200);
    expect(getOrderRes.body.data.id).toBe(historicalOrder.id);
  });

  // -------------------------------------------------------------------------
  // Test 5: Suspended Tenant — Staff Login Blocked, Customer View Preserved
  // -------------------------------------------------------------------------
  it('Suspended tenant: staff login rejected, but customer with existing order can still view it via Portal', async () => {
    // Create a historical delivered order for customer1 at Shop A
    const historicalOrder = await testPrisma.order.create({
      data: {
        tenantId: shopA.id,
        customerId: customer1.id,
        measurementProfileId: profile1.id,
        fabricId: fabric1.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        status: OrderStatus.DELIVERED,
        priceSnapshot: '3000.00',
      },
    });

    // 1. SuperAdmin suspends Shop A
    const suspendRes = await supertest(app)
      .post(`/api/admin/tenants/${shopA.id}/suspend`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(suspendRes.status).toBe(200);

    // Verify tenant in db is inactive
    const updatedTenant = await testPrisma.tenant.findUnique({ where: { id: shopA.id } });
    expect(updatedTenant?.isActive).toBe(false);

    // Verify subscription status in db is explicitly CANCELLED
    const suspendedSub = await testPrisma.tenantSubscription.findFirst({
      where: { tenantId: shopA.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(suspendedSub?.status).toBe(SubscriptionStatus.CANCELLED);

    // 2. Staff / Owner login is REJECTED
    const loginRes = await supertest(app)
      .post('/api/auth/login/staff')
      .send({
        slug: shopA.slug,
        email: ownerA.email,
        password: 'OwnerPassword123!',
      });
    expect(loginRes.status).toBe(401);

    // 3. Customer with existing order can STILL view their order via Customer Portal
    const customerOrdersRes = await supertest(app)
      .get('/api/portal/orders')
      .set('Authorization', `Bearer ${tokenCustomer1}`);

    expect(customerOrdersRes.status).toBe(200);
    const orderIds = customerOrdersRes.body.data.map((o: any) => o.id);
    expect(orderIds).toContain(historicalOrder.id);

    // Single order detail view also works
    const singleOrderRes = await supertest(app)
      .get(`/api/portal/orders/${historicalOrder.id}`)
      .set('Authorization', `Bearer ${tokenCustomer1}`);
    expect(singleOrderRes.status).toBe(200);
    expect(singleOrderRes.body.data.id).toBe(historicalOrder.id);

    // 4. SuperAdmin reactivates Shop A
    const reactivateRes = await supertest(app)
      .post(`/api/admin/tenants/${shopA.id}/reactivate`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);
    expect(reactivateRes.status).toBe(200);

    // Verify tenant in db is active again
    const reactivatedTenant = await testPrisma.tenant.findUnique({ where: { id: shopA.id } });
    expect(reactivatedTenant?.isActive).toBe(true);

    // Verify subscription status in db is restored to ACTIVE (not left as CANCELLED)
    const reactivatedSub = await testPrisma.tenantSubscription.findFirst({
      where: { tenantId: shopA.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(reactivatedSub?.status).toBe(SubscriptionStatus.ACTIVE);

    // 5. Staff login now succeeds again
    const loginAgainRes = await supertest(app)
      .post('/api/auth/login/staff')
      .send({
        slug: shopA.slug,
        email: ownerA.email,
        password: 'OwnerPassword123!',
      });
    expect(loginAgainRes.status).toBe(200);
    expect(loginAgainRes.body.data.token).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 6: Plan Downgrade Grandfathering Rule
  // -------------------------------------------------------------------------
  it('Reducing a plan limits below current staff count grandfathers existing staff; only NEW staff creation is blocked', async () => {
    // 1. Upgrade Shop A to Pro plan (maxStaffAccounts = 10)
    await supertest(app)
      .post(`/api/admin/tenants/${shopA.id}/change-plan`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({
        planId: proPlan.id,
        effectiveImmediate: true,
      });

    // 2. Add 2 staff members (total 2 staff)
    await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff-pro1-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Staff',
        lastName: 'One',
      });

    await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff-pro2-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Staff',
        lastName: 'Two',
      });

    // 3. Create a strict Solo plan with maxStaffAccounts = 1
    const soloPlan = await testPrisma.subscriptionPlan.create({
      data: {
        name: `Solo Plan ${Date.now()}`,
        priceMonthly: new Prisma.Decimal('999.00'),
        priceYearly: new Prisma.Decimal('9999.00'),
        maxStaffAccounts: 1,
        maxOrdersPerMonth: 20,
      },
    });

    // 4. Downgrade Shop A to Solo plan (maxStaffAccounts = 1, but they currently have 2 staff)
    const changePlanRes = await supertest(app)
      .post(`/api/admin/tenants/${shopA.id}/change-plan`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({
        planId: soloPlan.id,
        effectiveImmediate: true,
      });
    expect(changePlanRes.status).toBe(200);

    // 5. Existing 2 staff members (+ owner) remain active and readable
    const listStaffRes = await supertest(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`);
    expect(listStaffRes.status).toBe(200);
    expect(listStaffRes.body.data.length).toBe(3);

    // 6. But creating a NEW staff member is blocked because 2 >= 1
    const addThirdStaffRes = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        email: `staff-blocked-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Blocked',
        lastName: 'Staff',
      });

    expect(addThirdStaffRes.status).toBe(403);
    expect(addThirdStaffRes.body.error.message).toContain('Staff limit reached (2/1)');
  });

  // -------------------------------------------------------------------------
  // Test 7: Manual Subscription Payments & Platform Revenue Summary
  // -------------------------------------------------------------------------
  it('SuperAdmin can record manual subscription payments and retrieve platform revenue KPIs', async () => {
    // 1. Record manual payment for Shop A
    const paymentRes = await supertest(app)
      .post(`/api/admin/tenants/${shopA.id}/payments`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({
        amount: 1999,
        paymentMethod: SubscriptionPaymentMethod.BANK_TRANSFER,
        referenceNote: 'HDFC IMPS Ref #99281726',
        extendMonths: 1,
      });

    expect(paymentRes.status).toBe(201);
    expect(Number(paymentRes.body.data.amount)).toBe(1999);
    expect(paymentRes.body.data.paymentMethod).toBe(SubscriptionPaymentMethod.BANK_TRANSFER);

    // 2. Fetch platform revenue summary
    const revenueRes = await supertest(app)
      .get('/api/admin/revenue/summary')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(revenueRes.status).toBe(200);
    const rev = revenueRes.body.data;
    expect(rev.mrr).toBeGreaterThan(0);
    expect(rev.arr).toBe(rev.mrr * 12);
    expect(rev.totalTenantsCount).toBeGreaterThanOrEqual(2);
    expect(rev.recentPayments.length).toBeGreaterThanOrEqual(1);
    expect(rev.recentPayments[0].referenceNote).toBe('HDFC IMPS Ref #99281726');
  });

  // -------------------------------------------------------------------------
  // Test 8: Registration Flow auto-creates TRIAL TenantSubscription
  // -------------------------------------------------------------------------
  it('A newly created tenant (via registration) immediately has a TenantSubscription row with status=TRIAL in DB', async () => {
    const regSlug = `atelier-reg-${Date.now()}`;
    const regRes = await supertest(app)
      .post('/api/auth/register/tenant')
      .send({
        shopName: 'Fresh Atelier Test',
        slug: regSlug,
        ownerEmail: `owner-${Date.now()}@freshatelier.com`,
        ownerPassword: 'SecretPassword123!',
        firstName: 'Farhan',
        lastName: 'Qureshi',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.tenantId).toBeDefined();
    const newTenantId = regRes.body.data.user.tenantId;

    // Directly query database to prove TenantSubscription row exists
    const sub = await testPrisma.tenantSubscription.findFirst({
      where: { tenantId: newTenantId },
      include: { plan: true },
    });

    expect(sub).toBeDefined();
    expect(sub?.status).toBe(SubscriptionStatus.TRIAL);
    expect(sub?.plan.isDefault).toBe(true);
    expect(sub?.trialEndsAt).toBeDefined();
    expect(new Date(sub!.trialEndsAt!).getTime()).toBeGreaterThan(Date.now());
  });

  // -------------------------------------------------------------------------
  // Test 9: Backfill Script assigns TRIAL Subscription to Legacy/Orphan Tenant
  // -------------------------------------------------------------------------
  it('Backfill script assigns default TRIAL subscription to existing tenant with zero subscription rows', async () => {
    // 1. Manually insert tenant with zero subscription rows
    const orphanTenant = await createTenant({
      name: 'Orphan Legacy Tailors',
      slug: `orphan-${Date.now()}`,
      withoutSubscription: true,
    });

    // Verify 0 subscriptions exist for this tenant
    const countBefore = await testPrisma.tenantSubscription.count({
      where: { tenantId: orphanTenant.id },
    });
    expect(countBefore).toBe(0);

    // 2. Run backfill
    const { backfillUnsubscribedTenants } = await import('../modules/subscriptions/backfillSubscriptions');
    const backfillRes = await backfillUnsubscribedTenants(testPrisma);
    expect(backfillRes.backfilledCount).toBeGreaterThanOrEqual(1);

    // 3. Confirm the tenant now has a TRIAL subscription directly in DB
    const subAfter = await testPrisma.tenantSubscription.findFirst({
      where: { tenantId: orphanTenant.id },
      include: { plan: true },
    });

    expect(subAfter).toBeDefined();
    expect(subAfter?.status).toBe(SubscriptionStatus.TRIAL);
    expect(subAfter?.plan.name).toBe(backfillRes.defaultPlan.name);
    expect(subAfter?.trialEndsAt).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 10: Fail-closed Fallback blocks actions for tenant with zero subscriptions
  // -------------------------------------------------------------------------
  it('Fail-closed fallback: tenant with zero subscription rows throws EntitlementError when creating staff or order', async () => {
    // 1. Create tenant with NO subscription row
    const unsubscribedTenant = await createTenant({
      name: 'Unsubscribed Atelier',
      slug: `unsub-${Date.now()}`,
      withoutSubscription: true,
    });

    const unsubOwner = await createUser(unsubscribedTenant.id, {
      role: UserRole.SHOP_OWNER,
      email: `unsub-owner-${Date.now()}@atelier.com`,
      password: 'OwnerPassword123!',
    });
    const tokenUnsubOwner = await staffToken(unsubOwner);

    // 2. Attempt to create staff member -> blocked with fail-closed error
    const createStaffRes = await supertest(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenUnsubOwner}`)
      .send({
        email: `staff-unsub-${Date.now()}@atelier.com`,
        password: 'StaffPassword123!',
        firstName: 'Unsub',
        lastName: 'Staff',
      });

    expect(createStaffRes.status).toBe(403);
    expect(createStaffRes.body.error).toBeDefined();
    expect(createStaffRes.body.error.message).toContain('No subscription found for tenant. Action blocked.');

    // 3. Create customer and fabric for order attempt
    const unsubCustomer = await createCustomer({ phone: `+9197${Date.now().toString().slice(-8)}` });
    await linkCustomerToTenant(unsubscribedTenant.id, unsubCustomer.id);
    const unsubProfile = await createMeasurementProfile(unsubscribedTenant.id, unsubCustomer.id, {
      name: 'Unsub Profile',
      garmentType: GarmentType.SHIRT,
    });
    const unsubFabric = await createFabricRecord(unsubscribedTenant.id, {
      name: 'Unsub Fabric',
      availableMeters: '10.000',
    });

    // 4. Attempt to create order -> blocked with fail-closed error
    const createOrderRes = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenUnsubOwner}`)
      .send({
        customerId: unsubCustomer.id,
        measurementProfileId: unsubProfile.id,
        fabricId: unsubFabric.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        priceSnapshot: '1200.00',
      });

    expect(createOrderRes.status).toBe(403);
    expect(createOrderRes.body.error).toBeDefined();
    expect(createOrderRes.body.error.message).toContain('No subscription found for tenant. Action blocked.');
  });
});
