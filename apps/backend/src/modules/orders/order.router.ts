/**
 * Orders router.
 *
 * All routes require authenticateStaff + requireTenantContext.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import type { StaffJwtPayload } from '../../lib/jwt';
import {
  AssignOrderSchema,
  CreateOrderSchema,
  ListOrdersQuerySchema,
  TransitionOrderStatusSchema,
} from './order.schema';
import {
  assignOrder,
  createOrder,
  getOrderById,
  getOrderHistory,
  listOrders,
  transitionOrderStatus,
} from './order.service';

export const ordersRouter = Router();
ordersRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// Order Endpoints
// ---------------------------------------------------------------------------

// POST /api/orders — create new order atomically with stock reservation
ordersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = CreateOrderSchema.parse(req.body);
    const order = await createOrder(tenantId, auth.sub, data);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders — list orders with filters
ordersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const query = ListOrdersQuerySchema.parse(req.query);
    const orders = await listOrders(tenantId, query);
    res.status(200).json({ data: orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — get order details
ordersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const order = await getOrderById(tenantId, req.params.id);
    res.status(200).json({ data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id/history — get chronological status log history
ordersRouter.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const history = await getOrderHistory(tenantId, req.params.id);
    res.status(200).json({ data: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/transition — transition status via state machine
ordersRouter.post('/:id/transition', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = TransitionOrderStatusSchema.parse(req.body);
    const order = await transitionOrderStatus(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: order });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/assign — assign or reassign order to staff member
ordersRouter.patch('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = AssignOrderSchema.parse(req.body);
    const order = await assignOrder(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: order });
  } catch (err) {
    next(err);
  }
});
