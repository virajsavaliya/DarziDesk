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

  it('Lists tenant notifications with isolation and returns unread count', async () => {
    // Wait a brief moment for the unawaited async notification dispatch from beforeEach to finish
    await new Promise((r) => setTimeout(r, 150));

    // Check Shop A notifications
    const resA = await supertest(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(resA.status).toBe(200);
    expect(Array.isArray(resA.body.data)).toBe(true);
    // At least orderA placement notification exists
    expect(resA.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resA.body.data[0].tenantId).toBe(shopA.id);

    // Check Shop B notifications are isolated
    const resB = await supertest(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenOwnerB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(0);

    // Check unread count
    const unreadRes = await supertest(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(unreadRes.status).toBe(200);
    expect(typeof unreadRes.body.count).toBe('number');
    expect(unreadRes.body.count).toBeGreaterThanOrEqual(1);
  });

  it('Allows staff or owner to dispatch on-demand notification to customer', async () => {
    const res = await supertest(app)
      .post('/api/notifications/send')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        orderId: orderA.id,
        channel: 'SMS',
        templateName: 'TRIAL_FITTING_REMINDER',
        message: 'Your bespoke suit is ready for trial fitting on Friday at 4 PM.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify it was logged
    const logs = await testPrisma.notificationLog.findMany({
      where: {
        tenantId: shopA.id,
        templateName: 'TRIAL_FITTING_REMINDER',
      },
    });

    expect(logs.length).toBe(1);
    expect(logs[0].customerId).toBe(customerA.id);
    expect(logs[0].orderId).toBe(orderA.id);
  });

  it('Allows SUPER_ADMIN to query notifications and unread-count without 404', async () => {
    const superAdmin = await createUser(null, { role: UserRole.SUPER_ADMIN });
    const tokenSuperAdmin = await staffToken(superAdmin);

    const res = await supertest(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const unreadRes = await supertest(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);

    expect(unreadRes.status).toBe(200);
    expect(typeof unreadRes.body.count).toBe('number');
  });

  it('Queries WhatsApp OpenWA gateway status and enforces validation on test alert', async () => {
    // 1. Check status
    const statusRes = await supertest(app)
      .get('/api/notifications/whatsapp/status')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data).toBeDefined();
    expect(typeof statusRes.body.data.name).toBe('string');
    expect(statusRes.body.data.dashboardUrl).toBeDefined();

    // 2. Test alert without phone returns 400
    const testWithoutPhone = await supertest(app)
      .post('/api/notifications/whatsapp/test')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({});

    expect(testWithoutPhone.status).toBe(400);

    // 3. Connect endpoint returns session status
    const connectRes = await supertest(app)
      .post('/api/notifications/whatsapp/connect')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(connectRes.status).toBe(200);
    expect(connectRes.body.success).toBe(true);
    expect(connectRes.body.data).toBeDefined();
  });

  it('Automatically dispatches WhatsApp messages on order creation, ready for pickup, and delivered', async () => {
    // 1. Verify ORDER_CONFIRMED was logged automatically for orderA created in beforeEach
    let confirmLogs: any[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 100));
      confirmLogs = await testPrisma.notificationLog.findMany({
        where: {
          orderId: orderA.id,
          channel: 'WHATSAPP',
          templateName: 'ORDER_CONFIRMED',
        },
      });
      if (confirmLogs.length > 0 && confirmLogs[0].status !== 'QUEUED') break;
    }
    expect(confirmLogs.length).toBe(1);
    expect(confirmLogs[0].status).toBe('SENT');

    // 2. Transition order to READY (Collect item notification)
    await testPrisma.order.update({
      where: { id: orderA.id },
      data: { status: OrderStatus.QUALITY_CHECK },
    });

    const readyRes = await supertest(app)
      .post(`/api/orders/${orderA.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ toStatus: OrderStatus.READY });
    expect(readyRes.status).toBe(200);

    let pickupLogs: any[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 100));
      pickupLogs = await testPrisma.notificationLog.findMany({
        where: {
          orderId: orderA.id,
          channel: 'WHATSAPP',
          templateName: 'READY_FOR_PICKUP',
        },
      });
      if (pickupLogs.length > 0 && pickupLogs[0].status !== 'QUEUED') break;
    }
    expect(pickupLogs.length).toBe(1);
    expect(pickupLogs[0].status).toBe('SENT');

    // 3. Transition order to DELIVERED (Collected notification)
    const deliverRes = await supertest(app)
      .post(`/api/orders/${orderA.id}/transition`)
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ toStatus: OrderStatus.DELIVERED });
    expect(deliverRes.status).toBe(200);

    let deliveredLogs: any[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 100));
      deliveredLogs = await testPrisma.notificationLog.findMany({
        where: {
          orderId: orderA.id,
          channel: 'WHATSAPP',
          templateName: 'ORDER_DELIVERED',
        },
      });
      if (deliveredLogs.length > 0 && deliveredLogs[0].status !== 'QUEUED') break;
    }
    expect(deliveredLogs.length).toBe(1);
    expect(deliveredLogs[0].status).toBe('SENT');
  });
});

