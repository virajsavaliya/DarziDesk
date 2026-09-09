/**
 * Invoice Module Integration Tests (Phase 7A).
 *
 * Tests:
 * 1. CRITICAL: Client-supplied totalAmount / taxAmount / balanceDue are ignored & overwritten by server calculation
 * 2. Tax arithmetic correctness with non-zero tax rate verified against manual arithmetic
 * 3. Overpayment rejection: payment exceeding balanceDue is rejected (balanceDue cannot go negative)
 * 4. Payment lifecycle & status transitions: ISSUED -> PARTIALLY_PAID -> PAID, with rejection on overpaying a settled invoice
 * 5. Initial advance paid at creation correctly updates balanceDue and status
 * 6. Cross-tenant isolation: Shop A cannot view, list, or record payments on Shop B invoices
 * 7. PDF export generates valid application/pdf document buffer
 * 8. Pricing rule & tax configuration management (owner only, staff rejected with 403)
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
  createProfileVersion,
  createFabricRecord,
} from './helpers/factories';
import { staffToken } from './helpers/tokens';
import { GarmentType, InvoiceStatus, PaymentMethod, Tenant, User, UserRole } from '@prisma/client';

const app = createApp();

describe('Invoice Module (Phase 7A)', () => {
  let shopA: Tenant;
  let shopB: Tenant;

  let ownerA: User;
  let staffA: User;
  let ownerB: User;

  let tokenOwnerA: string;
  let tokenStaffA: string;
  let tokenOwnerB: string;

  let customerA: any;
  let profileA: any;
  let fabricA: any;
  let orderA: any;

  let customerB: any;
  let profileB: any;
  let fabricB: any;
  let orderB: any;

  beforeEach(async () => {
    // 1. Tenants with configured tax rates
    shopA = await createTenant({ name: 'Savile Atelier Delhi', slug: 'savile-delhi' });
    shopB = await createTenant({ name: 'Mumbai Bespoke Crafts', slug: 'mumbai-bespoke' });

    // Set 10% tax for Shop A and 18% tax for Shop B
    await testPrisma.tenant.update({
      where: { id: shopA.id },
      data: { taxRatePercent: '10.00' },
    });
    await testPrisma.tenant.update({
      where: { id: shopB.id },
      data: { taxRatePercent: '18.00' },
    });

    // 2. Pricing rule for SHIRT in Shop A (₹500.00 stitching)
    await testPrisma.tenantPricingRule.create({
      data: {
        tenantId: shopA.id,
        garmentType: GarmentType.SHIRT,
        stitchingCharge: '500.00',
      },
    });

    // 3. Users
    ownerA = await createUser(shopA.id, {
      role: UserRole.SHOP_OWNER,
      email: 'vikram.owner@savile.com',
    });
    staffA = await createUser(shopA.id, {
      role: UserRole.STAFF,
      email: 'ramesh.staff@savile.com',
    });
    ownerB = await createUser(shopB.id, {
      role: UserRole.SHOP_OWNER,
      email: 'karan.owner@mumbai.com',
    });

    tokenOwnerA = await staffToken(ownerA);
    tokenStaffA = await staffToken(staffA);
    tokenOwnerB = await staffToken(ownerB);

    // 4. Shop A Order Setup
    customerA = await createCustomer({ phone: '+919811111111', firstName: 'Aarav', lastName: 'Sharma' });
    await linkCustomerToTenant(shopA.id, customerA.id);

    profileA = await createMeasurementProfile(shopA.id, customerA.id, {
      name: 'Standard Shirt',
      garmentType: GarmentType.SHIRT,
    });
    await createProfileVersion(shopA.id, profileA.id, ownerA.id, {
      versionNumber: 1,
      values: { chest: 40, waist: 34, length: 30 },
    });

    // Fabric with pricePerMeter = 400.00
    fabricA = await createFabricRecord(shopA.id, {
      name: 'Egyptian Cotton',
      pricePerMeter: '400.00',
      availableMeters: '50.000',
    });

    // Create Order with metersUsed = 2.500m -> fabricCost = 400 * 2.5 = 1000.00
    const resA = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        customerId: customerA.id,
        measurementProfileId: profileA.id,
        fabricId: fabricA.id,
        garmentType: GarmentType.SHIRT,
        metersUsed: '2.500',
        estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(resA.status).toBe(201);
    orderA = resA.body.data;

    // 5. Shop B Order Setup
    customerB = await createCustomer({ phone: '+919822222222', firstName: 'Rohan', lastName: 'Verma' });
    await linkCustomerToTenant(shopB.id, customerB.id);

    profileB = await createMeasurementProfile(shopB.id, customerB.id, {
      name: 'Mumbai Kurta',
      garmentType: GarmentType.KURTA,
    });
    await createProfileVersion(shopB.id, profileB.id, ownerB.id, {
      versionNumber: 1,
      values: { chest: 42, waist: 36, length: 32 },
    });

    fabricB = await createFabricRecord(shopB.id, {
      name: 'Silk Linen',
      pricePerMeter: '300.00',
      availableMeters: '30.000',
    });

    const resB = await supertest(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({
        customerId: customerB.id,
        measurementProfileId: profileB.id,
        fabricId: fabricB.id,
        garmentType: GarmentType.KURTA,
        metersUsed: '2.000',
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(resB.status).toBe(201);
    orderB = resB.body.data;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [1] CRITICAL: Client-supplied totalAmount ignored
  // ─────────────────────────────────────────────────────────────────────────
  it('[1] Client-supplied totalAmount, taxAmount, and balanceDue are strictly ignored and server-calculated', async () => {
    // Expected server calculation:
    // fabricCost = 400.00 * 2.5 = 1000.00
    // stitchingCharge = 500.00 (from pricing rule)
    // urgentSurcharge = 150.00 (from input)
    // subtotal = 1000 + 500 + 150 = 1650.00
    // tax = 1650.00 * 10% = 165.00
    // totalAmount = 1650.00 + 165.00 = 1815.00
    // balanceDue = 1815.00

    // Malicious client tries to send ₹1.00 total and ₹0.10 tax
    const res = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        orderId: orderA.id,
        urgentSurcharge: 150,
        // Attacker injected fields:
        totalAmount: 1.0,
        taxAmount: 0.1,
        balanceDue: 0.0,
        fabricCost: 10.0,
        stitchingCharge: 10.0,
      });

    expect(res.status).toBe(201);
    const inv = res.body.data;

    // Must match server computed values exactly, NOT client inputs
    expect(Number(inv.fabricCost).toFixed(2)).toBe('1000.00');
    expect(Number(inv.stitchingCharge).toFixed(2)).toBe('500.00');
    expect(Number(inv.urgentSurcharge).toFixed(2)).toBe('150.00');
    expect(Number(inv.taxRatePercent).toFixed(2)).toBe('10.00');
    expect(Number(inv.taxAmount).toFixed(2)).toBe('165.00');
    expect(Number(inv.totalAmount).toFixed(2)).toBe('1815.00');
    expect(Number(inv.advancePaid).toFixed(2)).toBe('0.00');
    expect(Number(inv.balanceDue).toFixed(2)).toBe('1815.00');
    expect(inv.status).toBe('ISSUED');

    // Confirm stored DB values match
    const dbInvoice = await testPrisma.invoice.findUnique({ where: { id: inv.id } });
    expect(Number(dbInvoice!.totalAmount).toFixed(2)).toBe('1815.00');
    expect(Number(dbInvoice!.balanceDue).toFixed(2)).toBe('1815.00');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [2] Tax Arithmetic Correctness
  // ─────────────────────────────────────────────────────────────────────────
  it('[2] Calculates exact taxAmount with a non-zero tax rate verified against manual arithmetic', async () => {
    // Shop B has 18.00% tax
    // Order B: 2.0m * ₹300/m = ₹600.00 fabricCost
    // Default Kurta stitching = ₹650.00
    // Surcharge = 0
    // Subtotal = 600 + 650 = 1250.00
    // Tax = 1250 * 0.18 = 225.00
    // Total = 1475.00

    const res = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ orderId: orderB.id });

    expect(res.status).toBe(201);
    const inv = res.body.data;

    expect(Number(inv.fabricCost).toFixed(2)).toBe('600.00');
    expect(Number(inv.stitchingCharge).toFixed(2)).toBe('650.00');
    expect(Number(inv.taxRatePercent).toFixed(2)).toBe('18.00');
    expect(Number(inv.taxAmount).toFixed(2)).toBe('225.00');
    expect(Number(inv.totalAmount).toFixed(2)).toBe('1475.00');
    expect(Number(inv.balanceDue).toFixed(2)).toBe('1475.00');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [3] Overpayment Rejection (Negative balance prevented)
  // ─────────────────────────────────────────────────────────────────────────
  it('[3] Rejects payments that would exceed totalAmount (balanceDue cannot go negative)', async () => {
    const genRes = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ orderId: orderA.id });

    expect(genRes.status).toBe(201);
    const invoiceId = genRes.body.data.id;
    // Total is: 1000 + 500 = 1500 subtotal, 10% tax = 150 -> 1650.00
    expect(Number(genRes.body.data.balanceDue).toFixed(2)).toBe('1650.00');

    // Attempt to pay 1650.01 (overpayment by 1 paisa)
    const payRes = await supertest(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({
        amount: 1650.01,
        paymentMethod: PaymentMethod.UPI_MANUAL,
      });

    expect([400, 422]).toContain(payRes.status);
    expect(payRes.body.error.message).toMatch(/exceeds balance due/i);

    // Verify invoice in DB is still untouched
    const invoice = await testPrisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(Number(invoice!.advancePaid).toFixed(2)).toBe('0.00');
    expect(Number(invoice!.balanceDue).toFixed(2)).toBe('1650.00');
    expect(invoice!.status).toBe(InvoiceStatus.ISSUED);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [4] Payment Lifecycle & Status State Machine
  // ─────────────────────────────────────────────────────────────────────────
  it('[4] Transitions through ISSUED -> PARTIALLY_PAID -> PAID upon sequential payments', async () => {
    const genRes = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ orderId: orderA.id });

    const invoiceId = genRes.body.data.id;
    expect(genRes.body.data.status).toBe('ISSUED');

    // Pay ₹500 (partial payment)
    const pay1 = await supertest(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({
        amount: '500.00',
        paymentMethod: PaymentMethod.CASH,
        notes: 'Cash advance from customer',
      });

    expect(pay1.status).toBe(201);
    expect(Number(pay1.body.data.invoice.advancePaid).toFixed(2)).toBe('500.00');
    expect(Number(pay1.body.data.invoice.balanceDue).toFixed(2)).toBe('1150.00');
    expect(pay1.body.data.invoice.status).toBe('PARTIALLY_PAID');

    // Pay remaining ₹1150 (settlement payment)
    const pay2 = await supertest(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({
        amount: '1150.00',
        paymentMethod: PaymentMethod.UPI_MANUAL,
        reference: 'UPI1234567890',
        notes: 'Final settlement on pickup',
      });

    expect(pay2.status).toBe(201);
    expect(Number(pay2.body.data.invoice.advancePaid).toFixed(2)).toBe('1650.00');
    expect(Number(pay2.body.data.invoice.balanceDue).toFixed(2)).toBe('0.00');
    expect(pay2.body.data.invoice.status).toBe('PAID');

    // Attempting further payment on settled invoice is rejected
    const pay3 = await supertest(app)
      .post(`/api/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({ amount: '50.00' });

    expect([400, 422]).toContain(pay3.status);
    expect(pay3.body.error.message).toMatch(/already fully paid/i);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [5] Initial Advance Paid at Generation Time
  // ─────────────────────────────────────────────────────────────────────────
  it('[5] Records initial advance payment at invoice creation time atomically', async () => {
    const res = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        orderId: orderA.id,
        initialAdvancePaid: '650.00',
        notes: 'Deposit paid upfront',
      });

    expect(res.status).toBe(201);
    const inv = res.body.data;
    expect(Number(inv.totalAmount).toFixed(2)).toBe('1650.00');
    expect(Number(inv.advancePaid).toFixed(2)).toBe('650.00');
    expect(Number(inv.balanceDue).toFixed(2)).toBe('1000.00');
    expect(inv.status).toBe('PARTIALLY_PAID');

    // Payment ledger must contain the advance entry
    const payments = await testPrisma.invoicePayment.findMany({
      where: { invoiceId: inv.id },
    });
    expect(payments).toHaveLength(1);
    expect(Number(payments[0].amount).toFixed(2)).toBe('650.00');
    expect(payments[0].paymentMethod).toBe(PaymentMethod.CASH);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [6] Cross-Tenant Isolation
  // ─────────────────────────────────────────────────────────────────────────
  it('[6] Cross-tenant isolation: Shop A cannot view, list, or record payments on Shop B invoices', async () => {
    // Generate invoice in Shop B
    const resB = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerB}`)
      .send({ orderId: orderB.id });

    expect(resB.status).toBe(201);
    const invoiceBId = resB.body.data.id;

    // Shop A owner attempts to fetch Shop B invoice by ID -> 404
    const getRes = await supertest(app)
      .get(`/api/invoices/${invoiceBId}`)
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(getRes.status).toBe(404);

    // Shop A owner lists invoices -> returns 0 invoices
    const listRes = await supertest(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.map((i: any) => i.id);
    expect(ids).not.toContain(invoiceBId);

    // Shop A staff attempts to record payment on Shop B invoice -> 404
    const payRes = await supertest(app)
      .post(`/api/invoices/${invoiceBId}/payments`)
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({ amount: '100.00' });

    expect(payRes.status).toBe(404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [7] PDF Export Endpoint
  // ─────────────────────────────────────────────────────────────────────────
  it('[7] Generates valid PDF buffer with application/pdf content type', async () => {
    const genRes = await supertest(app)
      .post('/api/invoices/generate')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ orderId: orderA.id });

    const invoiceId = genRes.body.data.id;

    const pdfRes = await supertest(app)
      .get(`/api/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${tokenOwnerA}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    // Verify PDF binary header "%PDF"
    expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [8] Pricing Rule & Tax Configuration Management
  // ─────────────────────────────────────────────────────────────────────────
  it('[8] Configures stitching charges and tax rates (Shop Owner only)', async () => {
    // Owner sets SUIT stitching charge to 1200
    const ruleRes = await supertest(app)
      .put('/api/invoices/config/pricing')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({
        garmentType: GarmentType.CUSTOM,
        stitchingCharge: 1200,
      });

    expect(ruleRes.status).toBe(200);
    expect(Number(ruleRes.body.data.stitchingCharge).toFixed(2)).toBe('1200.00');

    // Owner sets tax rate to 12.5%
    const taxRes = await supertest(app)
      .put('/api/invoices/config/tax')
      .set('Authorization', `Bearer ${tokenOwnerA}`)
      .send({ taxRatePercent: 12.5 });

    expect(taxRes.status).toBe(200);
    expect(Number(taxRes.body.data.taxRatePercent).toFixed(2)).toBe('12.50');

    // Staff member attempt to change tax rate is rejected with 403
    const staffTaxRes = await supertest(app)
      .put('/api/invoices/config/tax')
      .set('Authorization', `Bearer ${tokenStaffA}`)
      .send({ taxRatePercent: 5.0 });

    expect(staffTaxRes.status).toBe(403);
  });
});
