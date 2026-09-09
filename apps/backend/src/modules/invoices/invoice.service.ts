/**
 * Invoice Service (Phase 7A).
 *
 * Implements:
 * - Deterministic, server-only financial calculations (never trusts client totalAmount)
 * - Row-level locking on payment recording (SELECT ... FOR UPDATE)
 * - Non-negative balance due invariant (balanceDue >= 0, overpayment rejected)
 * - Tenant pricing rules & tax rate application
 * - Audit logging of payments via InvoicePayment
 * - Clean PDF generation via pdfkit
 */

import {
  GarmentType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  NotificationChannel,
} from '@prisma/client';
import PDFDocument from 'pdfkit';
import { notificationService } from '../notifications/notification.service';
import { withTenantContext } from '../../lib/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors';
import type {
  GenerateInvoiceInput,
  ListInvoicesQuery,
  RecordPaymentInput,
  UpdatePricingRuleInput,
} from './invoice.schema';

// Fallback stitching charges if not explicitly configured by the shop owner
const DEFAULT_STITCHING_CHARGES: Record<GarmentType, string> = {
  [GarmentType.SHIRT]: '450.00',
  [GarmentType.PANT]: '450.00',
  [GarmentType.TSHIRT]: '300.00',
  [GarmentType.KURTA]: '650.00',
  [GarmentType.CUSTOM]: '800.00',
};

// ---------------------------------------------------------------------------
// 1. Generate Invoice from Order
// ---------------------------------------------------------------------------

export async function generateInvoice(
  tenantId: string,
  userId: string,
  input: GenerateInvoiceInput,
) {
  const result = await withTenantContext(tenantId, async (tx) => {
    // 1. Verify order exists and belongs to tenant
    const order = await tx.order.findFirst({
      where: { id: input.orderId, tenantId },
      include: {
        customer: true,
        fabric: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // 2. Check if an active invoice already exists for this order
    const existing = await tx.invoice.findFirst({
      where: {
        tenantId,
        orderId: order.id,
        status: { not: InvoiceStatus.VOID },
      },
    });

    if (existing) {
      throw new ConflictError('An active invoice already exists for this order');
    }

    // 3. SERVER-SIDE CALCULATION: Fabric Cost = priceSnapshot * metersUsed
    const priceSnapshot = new Prisma.Decimal(order.priceSnapshot);
    const metersUsed = new Prisma.Decimal(order.metersUsed);
    const fabricCost = priceSnapshot.mul(metersUsed).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    // 4. SERVER-SIDE CALCULATION: Stitching Charge from TenantPricingRule
    const pricingRule = await tx.tenantPricingRule.findUnique({
      where: {
        tenantId_garmentType: {
          tenantId,
          garmentType: order.garmentType,
        },
      },
    });

    const stitchingCharge = pricingRule
      ? new Prisma.Decimal(pricingRule.stitchingCharge)
      : new Prisma.Decimal(DEFAULT_STITCHING_CHARGES[order.garmentType] ?? '500.00');

    // 5. Urgent Surcharge (input accepted, validated as non-negative)
    const urgentSurcharge = new Prisma.Decimal(input.urgentSurcharge);

    // 6. Subtotal
    const subtotal = fabricCost.add(stitchingCharge).add(urgentSurcharge);

    // 7. SERVER-SIDE CALCULATION: Tax Amount from Tenant Tax Rate
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { taxRatePercent: true },
    });
    const taxRatePercent = tenant?.taxRatePercent ?? new Prisma.Decimal(0);
    const taxAmount = subtotal
      .mul(taxRatePercent)
      .div(100)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    // 8. SERVER-SIDE CALCULATION: Total Amount
    const totalAmount = subtotal.add(taxAmount);

    // 9. Initial Advance Paid & Balance Due
    const initialAdvance = new Prisma.Decimal(input.initialAdvancePaid);
    if (initialAdvance.gt(totalAmount)) {
      throw new ValidationError('Initial advance payment cannot exceed total amount');
    }

    const balanceDue = totalAmount.sub(initialAdvance);

    // 10. Status Determination
    let status: InvoiceStatus = InvoiceStatus.ISSUED;
    if (totalAmount.isZero() || balanceDue.isZero()) {
      status = InvoiceStatus.PAID;
    } else if (initialAdvance.gt(0)) {
      status = InvoiceStatus.PARTIALLY_PAID;
    }

    // 11. Sequential Invoice Number
    const count = await tx.invoice.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    // 12. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        orderId: order.id,
        customerId: order.customerId,
        fabricCost,
        stitchingCharge,
        urgentSurcharge,
        taxRatePercent,
        taxAmount,
        totalAmount,
        advancePaid: initialAdvance,
        balanceDue,
        status,
        notes: input.notes ?? null,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        order: {
          select: {
            id: true,
            garmentType: true,
            metersUsed: true,
            priceSnapshot: true,
            status: true,
          },
        },
        payments: true,
      },
    });

    // 13. If initial advance paid, record payment ledger row
    if (initialAdvance.gt(0)) {
      await tx.invoicePayment.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          amount: initialAdvance,
          paymentMethod: PaymentMethod.CASH,
          notes: 'Initial advance payment recorded at invoice generation',
          recordedById: userId,
        },
      });
    }

    return invoice;
  });

  // Dispatch fully decoupled notification AFTER transaction commits
  notificationService.sendNotification({
    tenantId,
    customerId: result.customerId,
    orderId: result.orderId,
    channel: NotificationChannel.SMS,
    templateName: 'INVOICE_GENERATED',
    data: {
      invoiceNumber: result.invoiceNumber,
      totalAmount: result.totalAmount.toNumber(),
      balanceDue: result.balanceDue.toNumber(),
    },
    recipient: result.customer.phone,
  }).catch((e) => console.error('Notification dispatch error:', e));

  return result;
}

// ---------------------------------------------------------------------------
// 2. Record Manual Payment (Advance or Full)
// ---------------------------------------------------------------------------

interface LockedInvoiceRow {
  id: string;
  tenant_id: string;
  invoice_number: string;
  total_amount: Prisma.Decimal | string;
  advance_paid: Prisma.Decimal | string;
  balance_due: Prisma.Decimal | string;
  status: InvoiceStatus;
}

export async function recordPayment(
  tenantId: string,
  userId: string,
  invoiceId: string,
  input: RecordPaymentInput,
) {
  const result = await withTenantContext(tenantId, async (tx) => {
    // 1. Lock invoice row with SELECT ... FOR UPDATE
    const rows = await tx.$queryRaw<LockedInvoiceRow[]>`
      SELECT id, tenant_id, invoice_number, total_amount, advance_paid, balance_due, status
      FROM "invoices"
      WHERE "id" = ${invoiceId}::uuid
        AND "tenant_id" = ${tenantId}::uuid
      FOR UPDATE
    `;

    const invoiceRow = rows[0];
    if (!invoiceRow) {
      throw new NotFoundError('Invoice');
    }

    if (invoiceRow.status === InvoiceStatus.VOID) {
      throw new ValidationError('Cannot record payment against a voided invoice');
    }

    const currentBalance = new Prisma.Decimal(invoiceRow.balance_due);
    if (currentBalance.lte(0)) {
      throw new ValidationError('Invoice is already fully paid');
    }

    const paymentAmount = new Prisma.Decimal(input.amount);

    // CRITICAL INVARIANT: Overpayment rejected, balanceDue cannot go negative
    if (paymentAmount.gt(currentBalance)) {
      throw new ValidationError(
        `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds balance due (₹${currentBalance.toFixed(2)}). Balance due cannot be negative.`,
      );
    }

    // 2. Insert audit payment record
    const payment = await tx.invoicePayment.create({
      data: {
        tenantId,
        invoiceId,
        amount: paymentAmount,
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedById: userId,
      },
    });

    // 3. Recompute balance and status
    const currentAdvance = new Prisma.Decimal(invoiceRow.advance_paid);
    const newAdvancePaid = currentAdvance.add(paymentAmount);
    const totalAmount = new Prisma.Decimal(invoiceRow.total_amount);
    const newBalanceDue = totalAmount.sub(newAdvancePaid);

    const newStatus: InvoiceStatus = newBalanceDue.isZero()
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTIALLY_PAID;

    // 4. Update Invoice
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        advancePaid: newAdvancePaid,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        order: {
          select: { id: true, garmentType: true, status: true },
        },
        payments: {
          orderBy: { recordedAt: 'desc' },
          include: {
            recordedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return { invoice: updatedInvoice, payment };
  });

  // Dispatch fully decoupled notification AFTER transaction commits
  notificationService.sendNotification({
    tenantId,
    customerId: result.invoice.customerId,
    orderId: result.invoice.orderId,
    channel: NotificationChannel.SMS,
    templateName: 'PAYMENT_RECORDED',
    data: {
      amount: result.payment.amount.toNumber(),
      paymentMethod: result.payment.paymentMethod,
      balanceDue: result.invoice.balanceDue.toNumber(),
    },
    recipient: result.invoice.customer.phone,
  }).catch((e) => console.error('Notification dispatch error:', e));

  return result;
}

// ---------------------------------------------------------------------------
// 3. List Invoices with Filters
// ---------------------------------------------------------------------------

export async function listInvoices(tenantId: string, query: ListInvoicesQuery) {
  return withTenantContext(tenantId, async (tx) => {
    const where: Prisma.InvoiceWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.orderId) {
      where.orderId = query.orderId;
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      tx.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          order: {
            select: { id: true, garmentType: true, status: true },
          },
        },
      }),
      tx.invoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Get Invoice by ID
// ---------------------------------------------------------------------------

export async function getInvoiceById(tenantId: string, invoiceId: string) {
  return withTenantContext(tenantId, async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        order: {
          include: {
            fabric: { select: { id: true, name: true, color: true, type: true } },
            measurementProfile: { select: { id: true, name: true } },
          },
        },
        payments: {
          orderBy: { recordedAt: 'desc' },
          include: {
            recordedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice');
    }

    return invoice;
  });
}

// ---------------------------------------------------------------------------
// 5. Pricing Rules & Tax Configuration
// ---------------------------------------------------------------------------

export async function getPricingConfig(tenantId: string) {
  return withTenantContext(tenantId, async (tx) => {
    const [rules, tenant] = await Promise.all([
      tx.tenantPricingRule.findMany({ where: { tenantId } }),
      tx.tenant.findUnique({
        where: { id: tenantId },
        select: { taxRatePercent: true },
      }),
    ]);

    return {
      rules,
      taxRatePercent: tenant?.taxRatePercent ?? '0.00',
    };
  });
}

export async function upsertPricingRule(tenantId: string, input: UpdatePricingRuleInput) {
  return withTenantContext(tenantId, async (tx) => {
    return tx.tenantPricingRule.upsert({
      where: {
        tenantId_garmentType: {
          tenantId,
          garmentType: input.garmentType,
        },
      },
      create: {
        tenantId,
        garmentType: input.garmentType,
        stitchingCharge: new Prisma.Decimal(input.stitchingCharge),
      },
      update: {
        stitchingCharge: new Prisma.Decimal(input.stitchingCharge),
      },
    });
  });
}

export async function updateTenantTaxRate(tenantId: string, taxRatePercent: string) {
  return withTenantContext(tenantId, async (tx) => {
    return tx.tenant.update({
      where: { id: tenantId },
      data: {
        taxRatePercent: new Prisma.Decimal(taxRatePercent),
      },
      select: {
        id: true,
        name: true,
        taxRatePercent: true,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// 6. Generate Invoice PDF Stream/Buffer
// ---------------------------------------------------------------------------

export async function generateInvoicePdfBuffer(
  tenantId: string,
  invoiceId: string,
): Promise<Buffer> {
  const invoice = await getInvoiceById(tenantId, invoiceId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header
    doc
      .fontSize(22)
      .fillColor('#1E293B')
      .text('DARZIDESK INVOICE', { align: 'right' });
    doc
      .fontSize(10)
      .fillColor('#64748B')
      .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
    doc
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, {
        align: 'right',
      });
    doc.text(`Status: ${invoice.status}`, { align: 'right' });
    doc.moveDown(2);

    // Bill To
    doc.fontSize(12).fillColor('#0F172A').text('BILL TO:');
    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(`${invoice.customer.firstName} ${invoice.customer.lastName}`);
    doc.text(`Phone: ${invoice.customer.phone}`);
    if (invoice.customer.email) {
      doc.text(`Email: ${invoice.customer.email}`);
    }
    doc.moveDown(1.5);

    // Item Breakdown Table Header
    const tableTop = doc.y;
    doc
      .rect(50, tableTop, 500, 22)
      .fill('#F1F5F9');
    doc
      .fontSize(9)
      .fillColor('#334155')
      .text('DESCRIPTION', 60, tableTop + 6)
      .text('DETAILS', 260, tableTop + 6)
      .text('AMOUNT (INR)', 460, tableTop + 6, { align: 'right', width: 80 });

    let y = tableTop + 28;

    // Line 1: Fabric Cost
    doc
      .fontSize(9)
      .fillColor('#1E293B')
      .text('Fabric Material', 60, y)
      .text(
        `${invoice.order.fabric?.name ?? 'Fabric'} (${invoice.order.metersUsed}m @ ₹${invoice.order.priceSnapshot}/m)`,
        260,
        y,
      )
      .text(`₹${Number(invoice.fabricCost).toFixed(2)}`, 460, y, {
        align: 'right',
        width: 80,
      });
    y += 20;

    // Line 2: Stitching Charge
    doc
      .text(`Stitching & Crafting`, 60, y)
      .text(`Garment: ${invoice.order.garmentType}`, 260, y)
      .text(`₹${Number(invoice.stitchingCharge).toFixed(2)}`, 460, y, {
        align: 'right',
        width: 80,
      });
    y += 20;

    // Line 3: Urgent Surcharge (if > 0)
    if (Number(invoice.urgentSurcharge) > 0) {
      doc
        .text('Urgent / Priority Surcharge', 60, y)
        .text('Rush Delivery Fee', 260, y)
        .text(`₹${Number(invoice.urgentSurcharge).toFixed(2)}`, 460, y, {
          align: 'right',
          width: 80,
        });
      y += 20;
    }

    // Line 4: Tax
    if (Number(invoice.taxAmount) > 0) {
      doc
        .text('Taxes', 60, y)
        .text(`GST (${invoice.taxRatePercent}%)`, 260, y)
        .text(`₹${Number(invoice.taxAmount).toFixed(2)}`, 460, y, {
          align: 'right',
          width: 80,
        });
      y += 20;
    }

    doc.rect(50, y, 500, 1).fill('#E2E8F0');
    y += 10;

    // Totals
    doc
      .fontSize(10)
      .fillColor('#0F172A')
      .text('Total Amount:', 340, y)
      .text(`₹${Number(invoice.totalAmount).toFixed(2)}`, 460, y, {
        align: 'right',
        width: 80,
      });
    y += 18;

    doc
      .fillColor('#10B981')
      .text('Advance / Paid:', 340, y)
      .text(`₹${Number(invoice.advancePaid).toFixed(2)}`, 460, y, {
        align: 'right',
        width: 80,
      });
    y += 18;

    doc
      .fontSize(11)
      .fillColor(Number(invoice.balanceDue) > 0 ? '#EF4444' : '#10B981')
      .text('Balance Due:', 340, y)
      .text(`₹${Number(invoice.balanceDue).toFixed(2)}`, 460, y, {
        align: 'right',
        width: 80,
      });
    y += 30;

    // Payment History
    if (invoice.payments && invoice.payments.length > 0) {
      doc.fontSize(10).fillColor('#0F172A').text('PAYMENT HISTORY:', 50, y);
      y += 15;

      doc.rect(50, y, 500, 18).fill('#F8FAFC');
      doc
        .fontSize(8)
        .fillColor('#64748B')
        .text('DATE', 60, y + 5)
        .text('METHOD', 180, y + 5)
        .text('REF', 280, y + 5)
        .text('AMOUNT', 460, y + 5, { align: 'right', width: 80 });
      y += 22;

      for (const p of invoice.payments) {
        doc
          .fontSize(8)
          .fillColor('#334155')
          .text(new Date(p.recordedAt).toLocaleDateString('en-IN'), 60, y)
          .text(p.paymentMethod, 180, y)
          .text(p.reference ?? '—', 280, y)
          .text(`₹${Number(p.amount).toFixed(2)}`, 460, y, { align: 'right', width: 80 });
        y += 15;
      }
    }

    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor('#94A3B8')
      .text('Thank you for your business! Handcrafted with precision by DarziDesk.', {
        align: 'center',
      });

    doc.end();
  });
}
