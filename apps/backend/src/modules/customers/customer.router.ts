/**
 * Customers router.
 *
 * Exposes:
 * - Customer self-service routes (/api/customers/me/*): requires authenticateCustomer
 * - Staff-facing customer management routes (/api/customers/*): requires authenticateStaff + requireTenantContext
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateCustomer, authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  CreateWalkInCustomerSchema,
  UpdateCustomerSchema,
  SearchCustomersQuerySchema,
} from './customer.schema';
import {
  getCustomerProfile,
  getCustomerLinkedShops,
  getCustomerShopDetails,
  quickCreateWalkInCustomer,
  listTenantCustomers,
  getTenantCustomerById,
  updateTenantCustomer,
} from './customer.service';
import type { CustomerJwtPayload } from '../../lib/jwt';

export const customersRouter = Router();

// ===========================================================================
// 1. Customer Self-Service Routes (/api/customers/me/*)
// ===========================================================================

const customerSelfRouter = Router();
customerSelfRouter.use(authenticateCustomer, apiLimiter);

// GET /api/customers/me — own profile
customerSelfRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = res.locals.auth as CustomerJwtPayload;
    const customer = await getCustomerProfile(auth.sub);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/me/shops — list only shops linked to this customer
customerSelfRouter.get('/shops', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = res.locals.auth as CustomerJwtPayload;
    const shops = await getCustomerLinkedShops(auth.sub);
    res.status(200).json({ data: shops });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/me/shops/:tenantId — get details of a specific linked shop
customerSelfRouter.get('/shops/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = res.locals.auth as CustomerJwtPayload;
    const shop = await getCustomerShopDetails(auth.sub, req.params.tenantId);
    res.status(200).json({ data: shop });
  } catch (err) {
    next(err);
  }
});

// Mount self-service router under /me
customersRouter.use('/me', customerSelfRouter);

// ===========================================================================
// 2. Staff Customer Management Routes (/api/customers/*)
// ===========================================================================

const staffCustomersRouter = Router();
staffCustomersRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// GET /api/customers — list/search customers linked to the current shop
staffCustomersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const query = SearchCustomersQuerySchema.parse(req.query);
    const result = await listTenantCustomers(tenantId, query);
    res.status(200).json({ data: result.customers, meta: { total: result.total } });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers — quick-create walk-in customer (name + phone minimum)
staffCustomersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const data = CreateWalkInCustomerSchema.parse(req.body);
    const customer = await quickCreateWalkInCustomer(tenantId, data);
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/search — search customers by name/phone across the tenant
staffCustomersRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const queryStr = (req.query.query as string) || (req.query.q as string) || '';
    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100)
      : 20;
    const offset = req.query.offset
      ? Math.max(parseInt(req.query.offset as string, 10) || 0, 0)
      : 0;

    const result = await listTenantCustomers(tenantId, {
      q: queryStr,
      limit,
      offset,
    });
    res.status(200).json({ data: result.customers, meta: { total: result.total, limit, offset } });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id — get customer details under this shop
staffCustomersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const customer = await getTenantCustomerById(tenantId, req.params.id);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/customers/:id — edit customer details
staffCustomersRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const data = UpdateCustomerSchema.parse(req.body);
    const customer = await updateTenantCustomer(tenantId, req.params.id, data);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// Mount staff customer management under root /api/customers
customersRouter.use('/', staffCustomersRouter);
