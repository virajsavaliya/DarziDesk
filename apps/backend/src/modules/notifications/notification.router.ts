import { Router, type Request, type Response, type NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { updateNotificationPreferencesSchema } from './notification.schema';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { StaffJwtPayload } from '../../lib/jwt';

export const notificationRouter = Router();

// Only SHOP_OWNER can view or update notification preferences
notificationRouter.use(authenticateStaff);
notificationRouter.use(authorize(UserRole.SHOP_OWNER));

notificationRouter.get(
  '/config',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      const tenantId = auth.tenantId;
      if (!tenantId) throw new NotFoundError('Tenant');
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) throw new NotFoundError('Tenant');

      res.json({
        data: {
          smsEnabled: tenant.smsEnabled,
          emailEnabled: tenant.emailEnabled,
          whatsappEnabled: tenant.whatsappEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

notificationRouter.put(
  '/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      const tenantId = auth.tenantId;
      if (!tenantId) throw new NotFoundError('Tenant');
      const input = updateNotificationPreferencesSchema.parse(req.body);

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: input,
      });

      res.json({
        data: {
          smsEnabled: updatedTenant.smsEnabled,
          emailEnabled: updatedTenant.emailEnabled,
          whatsappEnabled: updatedTenant.whatsappEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
