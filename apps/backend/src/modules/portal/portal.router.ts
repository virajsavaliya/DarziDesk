/**
 * Customer Portal Router.
 *
 * All routes require a valid Customer JWT (audience: 'darzi:customer').
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateCustomer } from '../../middleware/authenticate';
import {
  CustomerCreateOrderSchema,
  CustomerCreateMeasurementProfileSchema,
} from './portal.schema';
import { CreateReviewSchema } from '../marketplace/marketplace.schema';
import { createCustomerReview } from '../marketplace/marketplace.service';
import {
  getShopCatalog,
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerInvoices,
  getCustomerInvoicePdf,
  getCustomerMeasurementProfiles,
  createCustomerMeasurementProfile,
} from './portal.service';

export const portalRouter = Router();

// Protect all portal routes with customer authentication
portalRouter.use(authenticateCustomer);

// ---------------------------------------------------------------------------
// 1. GET /api/portal/shops/:tenantId/fabrics — Fabric catalog for a specific shop
// ---------------------------------------------------------------------------
portalRouter.get(
  '/shops/:tenantId/fabrics',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalog = await getShopCatalog(req.params.tenantId);
      res.status(200).json({ data: catalog.fabrics, shop: catalog.shop });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/portal/shops/:tenantId — Shop metadata & settings
// ---------------------------------------------------------------------------
portalRouter.get(
  '/shops/:tenantId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalog = await getShopCatalog(req.params.tenantId);
      res.status(200).json({ data: catalog.shop });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 2. POST /api/portal/shops/:tenantId/orders — Customer-initiated order creation
// ---------------------------------------------------------------------------
portalRouter.post(
  '/shops/:tenantId/orders',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const data = CustomerCreateOrderSchema.parse(req.body);
      const order = await createCustomerOrder(req.params.tenantId, customerId, data);
      res.status(201).json({ data: order });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/portal/shops/:tenantId/measurement-profiles — Self measurement entry
// ---------------------------------------------------------------------------
portalRouter.post(
  '/shops/:tenantId/measurement-profiles',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const data = CustomerCreateMeasurementProfileSchema.parse(req.body);
      const profile = await createCustomerMeasurementProfile(
        req.params.tenantId,
        customerId,
        data,
      );
      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 3. GET /api/portal/orders — Logged-in customer's orders across all shops
// ---------------------------------------------------------------------------
portalRouter.get(
  '/orders',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const orders = await getCustomerOrders(customerId);
      res.status(200).json({ data: orders });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 4. GET /api/portal/orders/:id — Single order detail with status timeline
// ---------------------------------------------------------------------------
portalRouter.get(
  '/orders/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const order = await getCustomerOrderById(customerId, req.params.id);
      res.status(200).json({ data: order });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 5. GET /api/portal/invoices — Cross-shop customer invoices
// ---------------------------------------------------------------------------
portalRouter.get(
  '/invoices',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const invoices = await getCustomerInvoices(customerId);
      res.status(200).json({ data: invoices });
    } catch (err) {
      next(err);
    }
  },
);

portalRouter.get(
  '/invoices/:id/pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const pdfBuffer = await getCustomerInvoicePdf(customerId, req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="invoice-${req.params.id}.pdf"`,
      );
      res.status(200).send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 6. GET /api/portal/measurement-profiles — Shop-grouped measurement profiles
// ---------------------------------------------------------------------------
portalRouter.get(
  '/measurement-profiles',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const profiles = await getCustomerMeasurementProfiles(customerId);
      res.status(200).json({ data: profiles });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// 7. POST /api/portal/shops/:tenantId/reviews — Leave customer review
// ---------------------------------------------------------------------------
portalRouter.post(
  '/shops/:tenantId/reviews',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = res.locals.auth!.sub;
      const data = CreateReviewSchema.parse(req.body);
      const review = await createCustomerReview(
        req.params.tenantId,
        customerId,
        data,
      );
      res.status(201).json({ data: review });
    } catch (err) {
      next(err);
    }
  },
);
