import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { AuthenticationError } from '../../lib/errors';
import { z } from 'zod';
import {
  getPlatformDashboardMetrics,
  suspendTenantWithAudit,
  reactivateTenantWithAudit,
  getSystemOperationsHealth,
} from './admin.service';
import {
  createSupportSession,
  listActiveSupportSessions,
  listSupportSessionHistory,
  revokeSupportSession,
} from './supportSession.service';
import { listAuditLogs } from './audit.service';
import {
  listFeatureFlags,
  upsertFeatureFlag,
  setTenantFeatureOverride,
  removeTenantFeatureOverride,
} from './featureFlag.service';
import {
  listDeadLetterEvents,
  replayDeadLetterEvent,
} from '../outbox/outbox.service';

export const adminRouter = Router();

// Strictly enforce SUPER_ADMIN role authentication across all /api/admin endpoints
adminRouter.use(authenticateStaff, authorize(UserRole.SUPER_ADMIN));

function getAuth(res: Response) {
  const auth = res.locals.auth;
  if (!auth || !auth.sub) {
    throw new AuthenticationError();
  }
  return auth;
}

// ---------------------------------------------------------------------------
// 1. Dashboard & Subsystem Health
// ---------------------------------------------------------------------------

adminRouter.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceFresh = req.query.fresh === 'true';
    const metrics = await getPlatformDashboardMetrics(forceFresh);
    res.status(200).json({ data: metrics });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/operations/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await getSystemOperationsHealth();
    res.status(200).json({ data: health });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/operations/dead-letters', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listDeadLetterEvents();
    res.status(200).json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/operations/dead-letters/:id/replay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const replayed = await replayDeadLetterEvent(req.params.id);
    res.status(200).json({ data: replayed, message: 'Dead-letter event marked for replay.' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 2. Support Sessions (Secure Impersonation & Escalated Access)
// ---------------------------------------------------------------------------

const CreateSupportSessionSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  durationMinutes: z.number().int().min(5).max(480).default(60),
  scope: z.enum(['READ_ONLY', 'READ_WRITE']).default('READ_ONLY'),
});

adminRouter.post('/support-sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateSupportSessionSchema.parse(req.body);
    const auth = getAuth(res);
    const result = await createSupportSession(
      auth.sub,
      {
        tenantId: body.tenantId,
        reason: body.reason,
        durationMinutes: body.durationMinutes,
        scope: body.scope,
      },
      req,
    );
    res.status(201).json({
      data: result,
      message: 'Support session token created. Note: Keep this token confidential.',
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/support-sessions/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await listActiveSupportSessions();
    res.status(200).json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/support-sessions/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const sessions = await listSupportSessionHistory(limit);
    res.status(200).json({ data: sessions });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/support-sessions/:id/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(res);
    const revoked = await revokeSupportSession(req.params.id, auth.sub, req);
    res.status(200).json({ data: revoked, message: 'Support session revoked immediately.' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 3. Platform Audit Logs
// ---------------------------------------------------------------------------

adminRouter.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
    const tenantId = req.query.tenantId as string | undefined;
    const action = req.query.action as string | undefined;
    const actorUserId = req.query.actorUserId as string | undefined;
    const targetType = req.query.targetType as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await listAuditLogs({
      tenantId,
      action,
      actorUserId,
      targetType,
      fromDate: startDate,
      toDate: endDate,
      page,
      limit,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 4. Feature Flags Management
// ---------------------------------------------------------------------------

const UpsertFeatureFlagSchema = z.object({
  key: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  globalEnabled: z.boolean().default(false),
});

adminRouter.get('/feature-flags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const flags = await listFeatureFlags();
    res.status(200).json({ data: flags });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/feature-flags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = UpsertFeatureFlagSchema.parse(req.body);
    const auth = getAuth(res);
    const flag = await upsertFeatureFlag(body, auth.sub, req);
    res.status(200).json({ data: flag });
  } catch (err) {
    next(err);
  }
});

const SetTenantOverrideSchema = z.object({
  tenantId: z.string().uuid(),
  enabled: z.boolean(),
  reason: z.string().optional(),
});

adminRouter.post('/feature-flags/:key/tenant-override', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = SetTenantOverrideSchema.parse(req.body);
    const auth = getAuth(res);
    const override = await setTenantFeatureOverride(
      req.params.key,
      body.tenantId,
      body.enabled,
      auth.sub,
      body.reason,
      req,
    );
    res.status(200).json({ data: override });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/feature-flags/:key/tenant-override/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(res);
    const result = await removeTenantFeatureOverride(req.params.key, req.params.tenantId, auth.sub, req);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 5. Tenant Lifecycle Operations
// ---------------------------------------------------------------------------

const SuspendTenantSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').optional(),
});

adminRouter.post('/tenants/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = SuspendTenantSchema.parse(req.body || {});
    const auth = getAuth(res);
    const reason = body.reason || 'Administrative suspension';
    const result = await suspendTenantWithAudit(req.params.id, reason, auth.sub, req);
    res.status(200).json({ data: result, message: 'Tenant has been suspended.' });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/tenants/:id/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(res);
    const result = await reactivateTenantWithAudit(req.params.id, auth.sub, req);
    res.status(200).json({ data: result, message: 'Tenant has been reactivated.' });
  } catch (err) {
    next(err);
  }
});
