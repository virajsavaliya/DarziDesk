import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import { ConsoleProvider } from '../modules/notifications/notification.provider';
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
import { NotificationStatus, OrderStatus, UserRole } from '@prisma/client';

const app = createApp();

describe('Phase 8: Notifications', () => {
  let shopA: any;
  let shopB: any;
  let ownerA: any;
  let ownerB: any;
  let staffA: any;
  let tokenOwnerA: string;
  let tokenOwnerB: string;
  let customerA: any;
  let profileA: any;
  let fabricA: any;
  let orderA: any;

  beforeEach(async () => {
    ConsoleProvider.simulateFailure = false;

    shopA = await createTenant({ name: 'Test Shop A', slug: 'shop-a' });
    shopB = await createTenant({ name: 'Test Shop B', slug: 'shop-b' });

    ownerA = await createUser(shopA.id, { role: UserRole.SHOP_OWNER });
    staffA = await createUser(shopA.id, { role: UserRole.STAFF });
    ownerB = await createUser(shopB.id, { role: UserRole.SHOP_OWNER });

    tokenOwnerA = await staffToken(ownerA);
    tokenOwnerB = await staffToken(ownerB);

    customerA = await createCustomer({ phone: '1234567890' });
    await linkCustomerToTenant(shopA.id, customerA.id);

    profileA = await createMeasurementProfile(shopA.id, customerA.id);
    await createProfileVersion(shopA.id, profileA.id, staffA.id);

    fabricA = await createFabricRecord(shopA.id);
    
    // Seed some stock
    await testPrisma.fabricStockTransaction.create({
      data: {
        tenantId: shopA.id,
        fabricId: fabricA.id,
        type: 'PURCHASE',
        meters: 10,
        createdById: ownerA.id,
      }
    });
    await testPrisma.fabric.update({
      where: { id: fabricA.id },
      data: { availableMeters: 10, reservedMeters: 0 },
    });

    // Create Order via API
    const resA = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA.id,
        garmentType: 'SHIRT',
        metersUsed: '2.500',
        estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    
    expect(resA.status).toBe(201);
    orderA = resA.body.data;
  });

  afterEach(() => {
    ConsoleProvider.simulateFailure = false;
  });

  it('Provider failure does NOT block business operation but logs FAILED status', async () => {
    // Force provider to throw
    ConsoleProvider.simulateFailure = true;

    // Shortcut order status to QUALITY_CHECK directly via DB to skip intermediate API calls
    await testPrisma.order.update({
      where: { id: orderA.id },
      data: { status: OrderStatus.QUALITY_CHECK }
    });

    // Call API to transition to READY
    const res = await supertest(app)
      .post(`/api/orders/${orderA.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ toStatus: OrderStatus.READY });

    // 1. Verify API returns 200/201 (business operation succeeded despite notification failure)
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(OrderStatus.READY);

    // Wait a brief moment for the unawaited async notification dispatch to finish
    await new Promise((r) => setTimeout(r, 100));

    // 2. Verify Order status successfully committed
    const dbOrder = await testPrisma.order.findUnique({ where: { id: orderA.id } });
    expect(dbOrder!.status).toBe(OrderStatus.READY);

    // 3. Verify a NotificationLog exists with FAILED status
    const logs = await testPrisma.notificationLog.findMany({
      where: { orderId: orderA.id, templateName: 'ORDER_READY' },
    });
    
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe(NotificationStatus.FAILED);
    expect(logs[0].errorMessage).toBe('Simulated notification provider failure');
  });

  it('Silently skips notification when tenant preference is disabled', async () => {
    // Disable SMS for Shop A
    await testPrisma.tenant.update({
      where: { id: shopA.id },
      data: { smsEnabled: false },
    });

    // Shortcut order to QUALITY_CHECK
    await testPrisma.order.update({
      where: { id: orderA.id },
      data: { status: OrderStatus.QUALITY_CHECK }
    });

    const res = await supertest(app)
      .post(`/api/orders/${orderA.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ toStatus: OrderStatus.READY });

    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    // Verify NO NotificationLog exists because SMS was disabled
    const logs = await testPrisma.notificationLog.findMany({
      where: { orderId: orderA.id, templateName: 'ORDER_READY' },
    });
    
    expect(logs.length).toBe(0);
  });
  
  it('Respects cross-tenant isolation when updating preferences via API', async () => {
    const res = await supertest(app)
      .put(`/api/notifications/config`)
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ smsEnabled: false });
      
    expect(res.status).toBe(200);
    
    const shopA_DB = await testPrisma.tenant.findUnique({ where: { id: shopA.id }});
    const shopB_DB = await testPrisma.tenant.findUnique({ where: { id: shopB.id }});
    
    expect(shopA_DB!.smsEnabled).toBe(true);
    expect(shopB_DB!.smsEnabled).toBe(false);
  });
});
