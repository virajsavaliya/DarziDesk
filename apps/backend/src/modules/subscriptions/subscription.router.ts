import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticateStaff } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as subscriptionService from './subscription.service';
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  ChangePlanSchema,
  RecordSubscriptionPaymentSchema,
  AdminTenantsQuerySchema,
} from './subscription.schema';

export const adminSubscriptionRouter = Router();
export const publicSubscriptionRouter = Router();

// ---------------------------------------------------------------------------
// PUBLIC — GET /api/public/plans (no auth required)
// Returns only the marketing-safe fields: id, name, pricing, limits, features,
// isDefault. Explicitly excludes: _count.subscriptions, createdAt, updatedAt,
// maxSmsCredits (internal operational field), and isActive (admin concern).
// No tenant-specific data is ever included.
// ---------------------------------------------------------------------------
publicSubscriptionRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await subscriptionService.listPublicPlans();
    res.status(200).json({ data: plans });
  } catch (err) {
    next(err);
  }
});



// CROSS-TENANT PLATFORM SECURITY: Strictly accessible to SUPER_ADMIN role only
adminSubscriptionRouter.use(authenticateStaff, authorize(UserRole.SUPER_ADMIN));

// ---------------------------------------------------------------------------
// 1. Tenant Platform Management
// ---------------------------------------------------------------------------

adminSubscriptionRouter.get('/tenants', async (req, res, next) => {
  try {
    const query = AdminTenantsQuerySchema.parse(req.query);
    const result = await subscriptionService.listAdminTenants(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.get('/tenants/:id', async (req, res, next) => {
  try {
    const detail = await subscriptionService.getAdminTenantDetail(req.params.id);
    res.status(200).json({ data: detail });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.post('/tenants/:id/change-plan', async (req, res, next) => {
  try {
    const body = ChangePlanSchema.parse(req.body);
    const updated = await subscriptionService.changeTenantPlan(req.params.id, body);
    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.post('/tenants/:id/suspend', async (req, res, next) => {
  try {
    const result = await subscriptionService.suspendTenant(req.params.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.post('/tenants/:id/reactivate', async (req, res, next) => {
  try {
    const result = await subscriptionService.reactivateTenant(req.params.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.post('/tenants/:id/payments', async (req, res, next) => {
  try {
    const body = RecordSubscriptionPaymentSchema.parse(req.body);
    const auth = res.locals.auth;
    const payment = await subscriptionService.recordSubscriptionPayment(
      req.params.id,
      auth?.sub || null,
      body,
    );
    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 2. Revenue & Platform Metrics
// ---------------------------------------------------------------------------

adminSubscriptionRouter.get('/revenue/summary', async (_req, res, next) => {
  try {
    const summary = await subscriptionService.getPlatformRevenueSummary();
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 3. Subscription Plans CRUD
// ---------------------------------------------------------------------------

adminSubscriptionRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await subscriptionService.listPlans();
    res.status(200).json({ data: plans });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.get('/plans/:id', async (req, res, next) => {
  try {
    const plan = await subscriptionService.getPlanById(req.params.id);
    res.status(200).json({ data: plan });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.post('/plans', async (req, res, next) => {
  try {
    const body = CreatePlanSchema.parse(req.body);
    const plan = await subscriptionService.createPlan(body);
    res.status(201).json({ data: plan });
  } catch (err) {
    next(err);
  }
});

adminSubscriptionRouter.put('/plans/:id', async (req, res, next) => {
  try {
    const body = UpdatePlanSchema.parse(req.body);
    const plan = await subscriptionService.updatePlan(req.params.id, body);
    res.status(200).json({ data: plan });
  } catch (err) {
    next(err);
  }
});
