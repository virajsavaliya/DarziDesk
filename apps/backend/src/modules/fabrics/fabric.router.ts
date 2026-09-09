/**
 * Fabric inventory router.
 *
 * All routes require authenticateStaff + requireTenantContext.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import type { StaffJwtPayload } from '../../lib/jwt';
import {
  AddStockSchema,
  AdjustStockSchema,
  ConsumeStockSchema,
  CreateFabricSchema,
  ListFabricsQuerySchema,
  ReleaseStockSchema,
  ReserveStockSchema,
  UpdateFabricSchema,
} from './fabric.schema';
import {
  addStock,
  adjustStock,
  archiveFabric,
  consumeReservation,
  createFabric,
  deleteFabric,
  getFabricById,
  getFabricLedger,
  getLowStockFabrics,
  listFabrics,
  releaseReservation,
  reserveStock,
  unarchiveFabric,
  updateFabric,
} from './fabric.service';

export const fabricsRouter = Router();
fabricsRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// ---------------------------------------------------------------------------
// Low Stock Query (MUST precede /:id to avoid param capture)
// ---------------------------------------------------------------------------

// GET /api/fabrics/low-stock — list fabrics where availableMeters <= lowStockThreshold
fabricsRouter.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const fabrics = await getLowStockFabrics(tenantId);
    res.status(200).json({ data: fabrics });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Fabric CRUD Endpoints
// ---------------------------------------------------------------------------

// GET /api/fabrics — list fabrics
fabricsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const query = ListFabricsQuerySchema.parse(req.query);
    const fabrics = await listFabrics(tenantId, query);
    res.status(200).json({ data: fabrics });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics — create fabric
fabricsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = CreateFabricSchema.parse(req.body);
    const fabric = await createFabric(tenantId, auth.sub, data);
    res.status(201).json({ data: fabric });
  } catch (err) {
    next(err);
  }
});

// GET /api/fabrics/:id — get fabric details
fabricsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const fabric = await getFabricById(tenantId, req.params.id);
    res.status(200).json({ data: fabric });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/fabrics/:id — update fabric metadata (non-stock fields)
fabricsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const data = UpdateFabricSchema.parse(req.body);
    const fabric = await updateFabric(tenantId, req.params.id, data);
    res.status(200).json({ data: fabric });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/archive — soft archive fabric
fabricsRouter.post('/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const fabric = await archiveFabric(tenantId, req.params.id);
    res.status(200).json({ data: fabric });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/unarchive — restore soft-archived fabric
fabricsRouter.post('/:id/unarchive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const fabric = await unarchiveFabric(tenantId, req.params.id);
    res.status(200).json({ data: fabric });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/fabrics/:id — hard delete (fails with 409 if transaction history exists)
fabricsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const result = await deleteFabric(tenantId, req.params.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Stock Audit Ledger
// ---------------------------------------------------------------------------

// GET /api/fabrics/:id/ledger — view full transaction history
fabricsRouter.get('/:id/ledger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const ledger = await getFabricLedger(tenantId, req.params.id);
    res.status(200).json({ data: ledger });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Atomic Stock Operations
// ---------------------------------------------------------------------------

// POST /api/fabrics/:id/stock/add — add stock (PURCHASE)
fabricsRouter.post('/:id/stock/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = AddStockSchema.parse(req.body);
    const result = await addStock(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/stock/reserve — reserve stock (RESERVE)
fabricsRouter.post('/:id/stock/reserve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = ReserveStockSchema.parse(req.body);
    const result = await reserveStock(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/stock/release — release reservation (RELEASE)
fabricsRouter.post('/:id/stock/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = ReleaseStockSchema.parse(req.body);
    const result = await releaseReservation(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/stock/consume — consume reservation (CONSUME)
fabricsRouter.post('/:id/stock/consume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = ConsumeStockSchema.parse(req.body);
    const result = await consumeReservation(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/fabrics/:id/stock/adjust — manual stock adjustment (ADJUSTMENT)
fabricsRouter.post('/:id/stock/adjust', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const auth = res.locals.auth as StaffJwtPayload;
    const data = AdjustStockSchema.parse(req.body);
    const result = await adjustStock(tenantId, req.params.id, auth.sub, data);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});
