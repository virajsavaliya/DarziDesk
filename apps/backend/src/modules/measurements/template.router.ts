/**
 * Garment measurement template router.
 *
 * All routes require authenticateStaff + requireTenantContext.
 * Customizing templates (PUT /:id) requires Shop Owner role.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize, UserRole } from '../../middleware/authorize';
import { requireTenantContext } from '../../middleware/tenantContext';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
} from './template.schema';
import {
  listTemplates,
  getTemplateById,
  updateTemplate,
  createCustomTemplate,
} from './template.service';

export const garmentTemplatesRouter = Router();

garmentTemplatesRouter.use(authenticateStaff, requireTenantContext, apiLimiter);

// GET /api/garment-templates — list templates for caller's shop
garmentTemplatesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const templates = await listTemplates(tenantId);
    res.status(200).json({ data: templates });
  } catch (err) {
    next(err);
  }
});

// GET /api/garment-templates/:id — get template details
garmentTemplatesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = res.locals.tenantId as string;
    const template = await getTemplateById(tenantId, req.params.id);
    res.status(200).json({ data: template });
  } catch (err) {
    next(err);
  }
});

// POST /api/garment-templates — create custom template
garmentTemplatesRouter.post(
  '/',
  authorize(UserRole.SHOP_OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const data = CreateTemplateSchema.parse(req.body);
      const template = await createCustomTemplate(tenantId, data);
      res.status(201).json({ data: template });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/garment-templates/:id — customize template fields (Shop Owner only)
garmentTemplatesRouter.put(
  '/:id',
  authorize(UserRole.SHOP_OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const data = UpdateTemplateSchema.parse(req.body);
      const template = await updateTemplate(tenantId, req.params.id, data);
      res.status(200).json({ data: template });
    } catch (err) {
      next(err);
    }
  },
);
