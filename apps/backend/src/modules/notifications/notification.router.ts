import { Router, type Request, type Response, type NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  updateNotificationPreferencesSchema,
  sendNotificationSchema,
  listNotificationsQuerySchema,
} from './notification.schema';
import { notificationService } from './notification.service';
import { openwaService } from './openwa.service';
import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import type { StaffJwtPayload } from '../../lib/jwt';

export const notificationRouter = Router();

// All notification routes require staff authentication
notificationRouter.use(authenticateStaff);

// ---------------------------------------------------------------------------
// 1. GET /api/notifications/config — View channel preferences
// ---------------------------------------------------------------------------
notificationRouter.get(
  '/config',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      let tenantId = auth.tenantId;
      if (!tenantId && auth.role === UserRole.SUPER_ADMIN) {
        tenantId =
          (req.query.tenantId as string) ||
          (await prisma.tenant.findFirst({ select: { id: true } }))?.id ||
          null;
      }
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

// ---------------------------------------------------------------------------
// 2. PUT /api/notifications/config — Update channel preferences (Shop Owner / Super Admin)
// ---------------------------------------------------------------------------
notificationRouter.put(
  '/config',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      let tenantId = auth.tenantId;
      if (!tenantId && auth.role === UserRole.SUPER_ADMIN) {
        tenantId =
          (req.body.tenantId as string) ||
          (await prisma.tenant.findFirst({ select: { id: true } }))?.id ||
          null;
      }
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

// ---------------------------------------------------------------------------
// 3. GET /api/notifications — List notification logs for the tenant
// ---------------------------------------------------------------------------
notificationRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      const tenantId = auth.tenantId;
      if (!tenantId && auth.role !== UserRole.SUPER_ADMIN) {
        throw new NotFoundError('Tenant');
      }

      const query = listNotificationsQuerySchema.parse(req.query);

      const where: any = {};
      if (tenantId) {
        where.tenantId = tenantId;
      } else if (req.query.tenantId) {
        where.tenantId = req.query.tenantId as string;
      }
      if (query.channel) where.channel = query.channel;
      if (query.status) where.status = query.status;
      if (query.orderId) where.orderId = query.orderId;

      const [logs, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            order: {
              select: {
                id: true,
                garmentType: true,
                status: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        prisma.notificationLog.count({ where }),
      ]);

      res.json({
        data: logs,
        total,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// 4. GET /api/notifications/unread-count — Recent notification count
// ---------------------------------------------------------------------------
notificationRouter.get(
  '/unread-count',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      const tenantId = auth.tenantId;
      if (!tenantId && auth.role !== UserRole.SUPER_ADMIN) {
        throw new NotFoundError('Tenant');
      }

      // Count notifications in the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const where: any = {
        createdAt: { gte: yesterday },
      };
      if (tenantId) {
        where.tenantId = tenantId;
      } else if (req.query.tenantId) {
        where.tenantId = req.query.tenantId as string;
      }

      const count = await prisma.notificationLog.count({
        where,
      });

      res.json({ count });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// 5. POST /api/notifications/send — Dispatch on-demand notification to customer
// ---------------------------------------------------------------------------
notificationRouter.post(
  '/send',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = res.locals.auth as StaffJwtPayload;
      let tenantId = auth.tenantId;
      if (!tenantId) {
        if (auth.role === UserRole.SUPER_ADMIN) {
          if (req.body.tenantId) {
            tenantId = req.body.tenantId;
          } else {
            const firstTenant = await prisma.tenant.findFirst({
              where: { isActive: true },
              select: { id: true },
            });
            tenantId = firstTenant?.id || null;
          }
        }
        if (!tenantId) throw new NotFoundError('Tenant');
      }

      const input = sendNotificationSchema.parse(req.body);

      // Determine recipient if not explicitly passed
      let recipient = input.recipient;
      let customerName = 'Valued Customer';

      if (!recipient && input.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: input.customerId },
        });

        if (customer) {
          customerName = `${customer.firstName} ${customer.lastName}`.trim();
          if (input.channel === 'EMAIL') {
            recipient = customer.email || undefined;
          } else {
            recipient = customer.phone;
          }
        }
      }

      if (!recipient) {
        throw new BadRequestError('Recipient phone/email is required to dispatch notification');
      }

      const payloadData = {
        customerName,
        message: input.message,
        ...(input.data || {}),
      };

      await notificationService.sendNotification({
        tenantId,
        customerId: input.customerId,
        orderId: input.orderId,
        channel: input.channel,
        templateName: input.templateName,
        data: payloadData,
        recipient,
      });

      res.status(201).json({
        success: true,
        message: `Notification dispatched via ${input.channel} to ${recipient}`,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// 6. WhatsApp Integration via OpenWA Gateway
// ---------------------------------------------------------------------------

// GET /api/notifications/whatsapp/status — Check live connection, phone, & QR code
notificationRouter.get(
  '/whatsapp/status',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await openwaService.getStatus();
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/notifications/whatsapp/connect — Ensure session is active and generate QR
notificationRouter.post(
  '/whatsapp/connect',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await openwaService.getStatus();
      res.json({
        success: true,
        data: status,
        message:
          status.status === 'ready'
            ? 'WhatsApp session is already authenticated and active.'
            : 'Session initialized. Scan the QR code with WhatsApp to connect.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/notifications/whatsapp/disconnect — Log out or stop WhatsApp session
notificationRouter.post(
  '/whatsapp/disconnect',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await openwaService.disconnect();
      res.json({
        success: true,
        message: 'WhatsApp session disconnected successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/notifications/whatsapp/test — Send a direct test WhatsApp message
notificationRouter.post(
  '/whatsapp/test',
  authorize(UserRole.SHOP_OWNER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, message } = req.body;
      if (!phone) {
        throw new BadRequestError('Recipient phone number is required');
      }

      const text =
        message ||
        `🪡 *DarziDesk Atelier Alert*\n\nNamaste! Your WhatsApp connection via OpenWA gateway is active and functioning smoothly. ✨`;

      try {
        const result = await openwaService.sendTextMessage(phone, text);
        res.json({
          success: true,
          messageId: result.messageId,
          message: `Test message sent successfully to ${phone}!`,
        });
      } catch (err: any) {
        throw new BadRequestError(err.message);
      }
    } catch (error) {
      next(error);
    }
  },
);

