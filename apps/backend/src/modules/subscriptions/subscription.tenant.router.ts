import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import {
  UserRole,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionPaymentMethod,
} from '@prisma/client';
import { authenticateStaff } from '../../middleware/authenticate';
import { requireTenantContext } from '../../middleware/tenantContext';
import { authorize } from '../../middleware/authorize';
import type { StaffJwtPayload } from '../../lib/jwt';

export const tenantSubscriptionRouter = Router();

// Apply auth + tenant context to all tenant subscription routes
tenantSubscriptionRouter.use(authenticateStaff, requireTenantContext);

const UpgradeSubscriptionSchema = z.object({
  planName: z.string().min(1),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  paymentMethod: z
    .enum(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'GATEWAY'])
    .default('UPI'),
});

function computeFeaturePermissions(planName: string) {
  const normalized = planName.trim().toLowerCase();
  const isProOrAbove = normalized.includes('pro') || normalized.includes('enterprise');

  const baseFeatures = [
    'dashboard',
    'orders',
    'customers',
    'measurements',
    'billing',
    'staff',
    'settings',
  ];

  const premiumFeatures = [
    'fabric',
    'reports',
    'products',
    'marketplace-settings',
  ];

  if (isProOrAbove) {
    return {
      unlockedFeatures: [...baseFeatures, ...premiumFeatures],
      lockedFeatures: [],
    };
  }

  return {
    unlockedFeatures: baseFeatures,
    lockedFeatures: premiumFeatures,
  };
}

// ---------------------------------------------------------------------------
// GET /api/subscription/current — Active plan, status & feature locks
// ---------------------------------------------------------------------------
tenantSubscriptionRouter.get(
  '/current',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;

      let sub = await prisma.tenantSubscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      });

      // Auto-provision default Basic trial subscription if none exists
      if (!sub) {
        let defaultPlan = await prisma.subscriptionPlan.findFirst({
          where: { isDefault: true, isActive: true },
        });
        if (!defaultPlan) {
          defaultPlan = await prisma.subscriptionPlan.findFirst({
            where: { isActive: true },
            orderBy: { priceMonthly: 'asc' },
          });
        }

        if (defaultPlan) {
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          sub = await prisma.tenantSubscription.create({
            data: {
              tenantId,
              planId: defaultPlan.id,
              status: SubscriptionStatus.TRIAL,
              billingCycle: SubscriptionBillingCycle.MONTHLY,
              currentPeriodStart: now,
              currentPeriodEnd: trialEnd,
              trialEndsAt: trialEnd,
            },
            include: { plan: true },
          });
        }
      }

      if (!sub) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      const { unlockedFeatures, lockedFeatures } = computeFeaturePermissions(
        sub.plan.name,
      );

      const isTrial = sub.status === SubscriptionStatus.TRIAL;
      const trialEndDate = sub.trialEndsAt ?? sub.currentPeriodEnd;
      const trialDaysRemaining = isTrial && trialEndDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(trialEndDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : null;

      res.status(200).json({
        data: {
          subscriptionId: sub.id,
          planId: sub.plan.id,
          planName: sub.plan.name,
          status: sub.status,
          billingCycle: sub.billingCycle,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialEndsAt: sub.trialEndsAt,
          isTrial,
          trialDaysRemaining,
          maxStaffAccounts: sub.plan.maxStaffAccounts,
          maxOrdersPerMonth: sub.plan.maxOrdersPerMonth,
          unlockedFeatures,
          lockedFeatures,
          plan: {
            id: sub.plan.id,
            name: sub.plan.name,
            priceMonthly: sub.plan.priceMonthly.toString(),
            priceYearly: sub.plan.priceYearly.toString(),
            features: sub.plan.features,
            maxStaffAccounts: sub.plan.maxStaffAccounts,
            maxOrdersPerMonth: sub.plan.maxOrdersPerMonth,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/subscription/upgrade — Upgrade or purchase a subscription plan
// ---------------------------------------------------------------------------
tenantSubscriptionRouter.post(
  '/upgrade',
  authorize(UserRole.SHOP_OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = res.locals.tenantId as string;
      const callerId = (res.locals.auth as StaffJwtPayload).sub;
      const body = UpgradeSubscriptionSchema.parse(req.body);

      // Find target plan
      const targetPlan = await prisma.subscriptionPlan.findFirst({
        where: {
          name: { equals: body.planName, mode: 'insensitive' },
          isActive: true,
        },
      });

      if (!targetPlan) {
        res.status(404).json({ error: `Plan '${body.planName}' not found` });
        return;
      }

      const cycle =
        body.billingCycle === 'YEARLY'
          ? SubscriptionBillingCycle.YEARLY
          : SubscriptionBillingCycle.MONTHLY;

      const price =
        cycle === SubscriptionBillingCycle.YEARLY
          ? targetPlan.priceYearly
          : targetPlan.priceMonthly;

      const now = new Date();
      const periodDurationDays = cycle === SubscriptionBillingCycle.YEARLY ? 365 : 30;
      const periodEnd = new Date(
        now.getTime() + periodDurationDays * 24 * 60 * 60 * 1000,
      );

      const paymentMethodMap: Record<string, SubscriptionPaymentMethod> = {
        UPI: SubscriptionPaymentMethod.UPI,
        BANK_TRANSFER: SubscriptionPaymentMethod.BANK_TRANSFER,
        CASH: SubscriptionPaymentMethod.CASH,
        CHEQUE: SubscriptionPaymentMethod.CHEQUE,
        GATEWAY: SubscriptionPaymentMethod.GATEWAY,
      };
      const paymentMethod =
        paymentMethodMap[body.paymentMethod] ?? SubscriptionPaymentMethod.UPI;

      const updatedSub = await prisma.$transaction(async (tx) => {
        // Find existing subscription
        let existing = await tx.tenantSubscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });

        let sub;
        if (existing) {
          sub = await tx.tenantSubscription.update({
            where: { id: existing.id },
            data: {
              planId: targetPlan.id,
              status: SubscriptionStatus.ACTIVE,
              billingCycle: cycle,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              trialEndsAt: null,
              cancelledAt: null,
            },
            include: { plan: true },
          });
        } else {
          sub = await tx.tenantSubscription.create({
            data: {
              tenantId,
              planId: targetPlan.id,
              status: SubscriptionStatus.ACTIVE,
              billingCycle: cycle,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              trialEndsAt: null,
            },
            include: { plan: true },
          });
        }

        // Record payment ledger row
        await tx.tenantSubscriptionPayment.create({
          data: {
            subscriptionId: sub.id,
            tenantId,
            amount: price,
            paymentMethod,
            referenceNote: `Self-service upgrade to ${targetPlan.name} (${cycle})`,
            periodStart: now,
            periodEnd,
            recordedByUserId: callerId,
          },
        });

        return sub;
      });

      const { unlockedFeatures, lockedFeatures } = computeFeaturePermissions(
        updatedSub.plan.name,
      );

      res.status(200).json({
        data: {
          subscriptionId: updatedSub.id,
          planId: updatedSub.plan.id,
          planName: updatedSub.plan.name,
          status: updatedSub.status,
          billingCycle: updatedSub.billingCycle,
          currentPeriodStart: updatedSub.currentPeriodStart,
          currentPeriodEnd: updatedSub.currentPeriodEnd,
          isTrial: false,
          maxStaffAccounts: updatedSub.plan.maxStaffAccounts,
          maxOrdersPerMonth: updatedSub.plan.maxOrdersPerMonth,
          unlockedFeatures,
          lockedFeatures,
          plan: {
            id: updatedSub.plan.id,
            name: updatedSub.plan.name,
            priceMonthly: updatedSub.plan.priceMonthly.toString(),
            priceYearly: updatedSub.plan.priceYearly.toString(),
            features: updatedSub.plan.features,
          },
        },
        message: `Successfully upgraded to ${updatedSub.plan.name} plan! All included features are now unlocked.`,
      });
    } catch (err) {
      next(err);
    }
  },
);
