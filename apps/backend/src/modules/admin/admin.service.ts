/**
 * Platform Admin Service for DarziDesk Super Admin Control Plane.
 *
 * Implements:
 * 1. Platform Dashboard Aggregations & Health Metrics
 * 2. Tenant Lifecycle Management (with mandatory audit logs & reasons)
 * 3. System Operations & Reliability Checks
 */

import { prisma } from '../../lib/prisma';
import { UserRole, TenantLifecycleState, SubscriptionStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { recordAuditLog } from './audit.service';
import type { Request } from 'express';

// In-memory cache for dashboard metrics (10 second TTL) to prevent expensive table scans on high concurrency
let cachedDashboard: { data: any; timestamp: number } | null = null;
const DASHBOARD_CACHE_TTL_MS = 10_000;

export async function getPlatformDashboardMetrics(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedDashboard && now - cachedDashboard.timestamp < DASHBOARD_CACHE_TTL_MS) {
    return cachedDashboard.data;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    tenantsByState,
    subscriptionsByStatus,
    totalUsers,
    totalCustomers,
    totalOrders,
    ordersToday,
    ordersMonth,
    activeSupportSessions,
    deadLetterOutboxCount,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.tenant.groupBy({
      by: ['lifecycleState'],
      _count: true,
    }),
    prisma.tenantSubscription.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.user.count({ where: { role: { in: [UserRole.SHOP_OWNER, UserRole.STAFF] } } }),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.supportSession.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.outboxEvent.count({
      where: { status: 'DEAD_LETTER' },
    }),
    prisma.tenantSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    }),
  ]);

  // Compute MRR from active subscriptions
  let mrr = 0;
  for (const sub of activeSubscriptions) {
    if (sub.plan) {
      if (sub.billingCycle === 'YEARLY') {
        mrr += Number(sub.plan.priceYearly) / 12;
      } else {
        mrr += Number(sub.plan.priceMonthly);
      }
    }
  }

  const lifecycleMap: Record<string, number> = {
    ACTIVE: 0,
    SUSPENDED: 0,
    REGISTERED: 0,
    CANCELLED: 0,
    ARCHIVED: 0,
  };
  tenantsByState.forEach((item) => {
    lifecycleMap[item.lifecycleState] = item._count;
  });

  const subscriptionMap: Record<string, number> = {
    ACTIVE: 0,
    TRIALING: 0,
    PAST_DUE: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  };
  subscriptionsByStatus.forEach((item) => {
    subscriptionMap[item.status] = item._count;
  });

  const totalTenants = Object.values(lifecycleMap).reduce((a, b) => a + b, 0);

  const result = {
    overview: {
      totalTenants,
      activeTenants: lifecycleMap.ACTIVE || 0,
      suspendedTenants: lifecycleMap.SUSPENDED || 0,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      totalUsers,
      totalCustomers,
      totalOrders,
      ordersToday,
      ordersMonth,
      activeSupportSessions,
      deadLetterOutboxCount,
    },
    tenantsByState: lifecycleMap,
    subscriptionsByStatus: subscriptionMap,
    systemStatus: {
      dbHealthy: true,
      outboxHealthy: deadLetterOutboxCount === 0,
      timestamp: new Date().toISOString(),
    },
  };

  cachedDashboard = { data: result, timestamp: now };
  return result;
}

export async function suspendTenantWithAudit(
  tenantId: string,
  reason: string,
  adminUserId: string,
  req?: Request,
) {
  if (!reason || reason.trim().length < 5) {
    throw new BadRequestError('A valid business justification (minimum 5 characters) is required to suspend a tenant.');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new NotFoundError('Tenant');

  const beforeData = {
    lifecycleState: tenant.lifecycleState,
    suspendedAt: tenant.suspendedAt,
    suspensionReason: tenant.suspensionReason,
    isActive: tenant.isActive,
  };

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      lifecycleState: TenantLifecycleState.SUSPENDED,
      suspendedAt: new Date(),
      suspensionReason: reason.trim(),
      isActive: false,
    },
  });

  await recordAuditLog({
    actorUserId: adminUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: 'TENANT_SUSPENDED',
    targetType: 'TENANT',
    targetId: tenantId,
    tenantId,
    reason: reason.trim(),
    beforeData,
    afterData: {
      lifecycleState: updated.lifecycleState,
      suspendedAt: updated.suspendedAt,
      suspensionReason: updated.suspensionReason,
      isActive: updated.isActive,
    },
    req,
  });

  // Evict dashboard cache
  cachedDashboard = null;

  return updated;
}

export async function reactivateTenantWithAudit(
  tenantId: string,
  adminUserId: string,
  req?: Request,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new NotFoundError('Tenant');

  const beforeData = {
    lifecycleState: tenant.lifecycleState,
    suspendedAt: tenant.suspendedAt,
    suspensionReason: tenant.suspensionReason,
    isActive: tenant.isActive,
  };

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      lifecycleState: TenantLifecycleState.ACTIVE,
      suspendedAt: null,
      suspensionReason: null,
      isActive: true,
    },
  });

  await recordAuditLog({
    actorUserId: adminUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: 'TENANT_REACTIVATED',
    targetType: 'TENANT',
    targetId: tenantId,
    tenantId,
    beforeData,
    afterData: {
      lifecycleState: updated.lifecycleState,
      suspendedAt: null,
      suspensionReason: null,
      isActive: updated.isActive,
    },
    req,
  });

  cachedDashboard = null;

  return updated;
}

export async function getSystemOperationsHealth() {
  const start = Date.now();
  let dbHealthy = false;
  let dbLatencyMs = 0;

  try {
    const ping = await prisma.$queryRaw`SELECT 1 as ping`;
    dbHealthy = Boolean(ping);
    dbLatencyMs = Date.now() - start;
  } catch {
    dbHealthy = false;
  }

  const [pendingOutbox, deadLetterOutbox, activeSessions] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
    prisma.outboxEvent.count({ where: { status: 'DEAD_LETTER' } }),
    prisma.supportSession.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  return {
    status: dbHealthy && deadLetterOutbox === 0 ? 'OPERATIONAL' : 'DEGRADED',
    database: {
      status: dbHealthy ? 'CONNECTED' : 'DOWN',
      latencyMs: dbLatencyMs,
    },
    outboxQueue: {
      pending: pendingOutbox,
      deadLetter: deadLetterOutbox,
      healthy: deadLetterOutbox === 0,
    },
    supportSessions: {
      activeCount: activeSessions,
    },
    timestamp: new Date().toISOString(),
  };
}
