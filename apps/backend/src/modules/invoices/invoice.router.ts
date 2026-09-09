/**
 * Invoice Router (Phase 7A).
 *
 * All routes:
 * - Authenticated with staff JWT (authenticateStaff)
 * - Tenant-scoped with requireTenantContext
 * - Rate-limited with apiLimiter
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import type { StaffJwtPayload } from '../../lib/jwt';
import { ForbiddenError } from '../../lib/errors';
import { UserRole } from '@prisma/client';
import {
  generateInvoiceSchema,
  listInvoicesQuerySchema,
  recordPaymentSchema,
  updatePricingRuleSchema,
  updateTaxRateSchema,
} from './invoice.schema';
import {
  generateInvoice,
  generateInvoicePdfBuffer,
  getInvoiceById,
  getPricingConfig,
  listInvoices,
  recordPayment,
  updateTenantTaxRate,
  upsertPricingRule,
} from './invoice.service';

export const invoiceRouter = Router();

invoiceRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// POST /api/invoices/generate — Generate invoice from order
// ---------------------------------------------------------------------------
invoiceRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const input = generateInvoiceSchema.parse(req.body);
    const invoice = await generateInvoice(tenantId, auth.sub, input);

    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/invoices — List invoices with filters & search
// ---------------------------------------------------------------------------
invoiceRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const query = listInvoicesQuerySchema.parse(req.query);

    const result = await listInvoices(tenantId, query);
    res.status(200).json({ data: result.items, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Pricing & Tax Configuration (Must be registered BEFORE /:id to avoid collision)
// ---------------------------------------------------------------------------
invoiceRouter.get('/config/pricing', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const config = await getPricingConfig(tenantId);
    res.status(200).json({ data: config });
  } catch (err) {
    next(err);
  }
});

invoiceRouter.put('/config/pricing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    if (auth.role !== UserRole.SHOP_OWNER) {
      throw new ForbiddenError('Only shop owners can update pricing rules');
    }

    const input = updatePricingRuleSchema.parse(req.body);
    const rule = await upsertPricingRule(tenantId, input);

    res.status(200).json({ data: rule });
  } catch (err) {
    next(err);
  }
});

invoiceRouter.put('/config/tax', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    if (auth.role !== UserRole.SHOP_OWNER) {
      throw new ForbiddenError('Only shop owners can update tax configuration');
    }

    const input = updateTaxRateSchema.parse(req.body);
    const tenant = await updateTenantTaxRate(tenantId, input.taxRatePercent);

    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/invoices/:id — Single invoice detail with line items & payment history
// ---------------------------------------------------------------------------
invoiceRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const invoice = await getInvoiceById(tenantId, req.params.id);

    res.status(200).json({ data: invoice });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/invoices/:id/payments — Record manual payment (advance or full)
// ---------------------------------------------------------------------------
invoiceRouter.post('/:id/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;

    const input = recordPaymentSchema.parse(req.body);
    const result = await recordPayment(tenantId, auth.sub, req.params.id, input);

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/invoices/:id/pdf — PDF export of invoice
// ---------------------------------------------------------------------------
invoiceRouter.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const pdfBuffer = await generateInvoicePdfBuffer(tenantId, req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});
