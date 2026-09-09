/**
 * Owner Dashboard Aggregation Service.
 *
 * All functions:
 * - Are restricted to SHOP_OWNER role (callers must verify before calling)
 * - Use withTenantContext for RLS enforcement (app-level + Postgres RLS)
 * - Fetch tenant timezone from the Tenant record (same pattern as staff.service.ts)
 * - Never touch cross-tenant data
 */

import { OrderStatus, UserRole } from '@prisma/client';
import { withTenantContext } from '../../lib/prisma';
import { ForbiddenError } from '../../lib/errors';
import { getDayBoundariesInTimezone } from '../staff/staff.service';

/**
 * Verifies the caller has SHOP_OWNER role; throws ForbiddenError otherwise.
 */
function requireOwnerRole(callerRole: UserRole): void {
  if (callerRole !== UserRole.SHOP_OWNER) {
    throw new ForbiddenError('Owner dashboard is restricted to Shop Owners');
  }
}

// ---------------------------------------------------------------------------
// KPI Summary
// ---------------------------------------------------------------------------

export interface OwnerDashboardSummary {
  todaysOrders: number;
  activeOrders: number;
  readyForDelivery: number;
  lowStockFabrics: number;
  ordersThisWeek: { date: string; count: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
}

export async function getOwnerDashboardSummary(
  tenantId: string,
  callerRole: UserRole,
): Promise<OwnerDashboardSummary> {
  requireOwnerRole(callerRole);

  return withTenantContext(tenantId, async (tx) => {
    // Fetch tenant timezone the same way staff.service.ts does
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const tz = tenant?.timezone ?? 'Asia/Kolkata';
    const { startOfDay, endOfDay } = getDayBoundariesInTimezone(tz);

    // Active statuses = all non-terminal statuses
    const activeStatuses: OrderStatus[] = [
      OrderStatus.PLACED,
      OrderStatus.MEASUREMENT_CONFIRMED,
      OrderStatus.CUTTING,
      OrderStatus.STITCHING,
      OrderStatus.QUALITY_CHECK,
    ];

    const [todaysOrders, activeOrders, readyForDelivery, lowStockRaw] =
      await Promise.all([
        // Orders created today
        tx.order.count({
          where: {
            tenantId,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        // Non-terminal, non-delivered orders
        tx.order.count({
          where: {
            tenantId,
            status: { in: activeStatuses },
          },
        }),
        // Orders ready for customer pickup
        tx.order.count({
          where: {
            tenantId,
            status: OrderStatus.READY,
          },
        }),
        // Low stock: compare Decimal columns directly in SQL
        tx.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count
          FROM "fabrics"
          WHERE "tenant_id" = ${tenantId}::uuid
            AND "is_archived" = false
            AND "available_meters" <= "low_stock_threshold"
        `,
      ]);

    const lowStockFabrics = Number(lowStockRaw[0]?.count ?? 0);

    // Orders by status for donut chart
    const statusGroups = await tx.order.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    });

    const ordersByStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    // Orders per day for the last 7 days for bar chart
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recentOrderDates = await tx.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
    });

    // Bucket by date label
    const buckets: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: tz,
      });
      buckets[label] = 0;
    }

    for (const o of recentOrderDates) {
      const label = o.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: tz,
      });
      if (label in buckets) {
        buckets[label]++;
      }
    }

    const ordersThisWeek = Object.entries(buckets).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      todaysOrders,
      activeOrders,
      readyForDelivery,
      lowStockFabrics,
      ordersThisWeek,
      ordersByStatus,
    };
  });
}


// ---------------------------------------------------------------------------
// Recent Orders (for DataTable)
// ---------------------------------------------------------------------------

export async function getRecentOrders(
  tenantId: string,
  callerRole: UserRole,
  limit = 10,
) {
  requireOwnerRole(callerRole);

  return withTenantContext(tenantId, async (tx) => {
    return tx.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        fabric: {
          select: { id: true, name: true, color: true, type: true },
        },
        assignedStaff: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Attention Required
// ---------------------------------------------------------------------------

export interface AttentionRequired {
  overdueOrders: {
    id: string;
    garmentType: string;
    status: OrderStatus;
    estimatedDeliveryDate: Date | null;
    customer: { firstName: string; lastName: string } | null;
  }[];
  dueTodayOrders: {
    id: string;
    garmentType: string;
    status: OrderStatus;
    estimatedDeliveryDate: Date | null;
    customer: { firstName: string; lastName: string } | null;
  }[];
  lowStockFabrics: {
    id: string;
    name: string;
    color: string;
    availableMeters: string;
    lowStockThreshold: string;
  }[];
}

export async function getAttentionRequired(
  tenantId: string,
  callerRole: UserRole,
): Promise<AttentionRequired> {
  requireOwnerRole(callerRole);

  return withTenantContext(tenantId, async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const tz = tenant?.timezone ?? 'Asia/Kolkata';
    const { startOfDay, endOfDay } = getDayBoundariesInTimezone(tz);

    const terminalStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    const orderSelect = {
      id: true,
      garmentType: true,
      status: true,
      estimatedDeliveryDate: true,
      customer: { select: { firstName: true, lastName: true } },
    };

    const [overdueOrders, dueTodayOrders, lowStockFabrics] = await Promise.all([
      // Overdue: delivery date has passed and order is not terminal
      tx.order.findMany({
        where: {
          tenantId,
          estimatedDeliveryDate: { lt: startOfDay },
          status: { notIn: terminalStatuses },
        },
        select: orderSelect,
        orderBy: { estimatedDeliveryDate: 'asc' },
        take: 20,
      }),
      // Due today
      tx.order.findMany({
        where: {
          tenantId,
          estimatedDeliveryDate: { gte: startOfDay, lte: endOfDay },
          status: { notIn: terminalStatuses },
        },
        select: orderSelect,
        orderBy: { estimatedDeliveryDate: 'asc' },
        take: 20,
      }),
      // Low stock fabrics via raw query to compare Decimal fields
      tx.$queryRaw<
        { id: string; name: string; color: string; availableMeters: string; lowStockThreshold: string }[]
      >`
        SELECT id, name, color, "available_meters"::text AS "availableMeters", "low_stock_threshold"::text AS "lowStockThreshold"
        FROM "fabrics"
        WHERE "tenant_id" = ${tenantId}::uuid
          AND "is_archived" = false
          AND "available_meters" <= "low_stock_threshold"
        ORDER BY "available_meters" ASC
        LIMIT 10
      `,
    ]);

    return {
      overdueOrders,
      dueTodayOrders,
      lowStockFabrics,
    };
  });
}

// ---------------------------------------------------------------------------
// Recent Activity Feed
// ---------------------------------------------------------------------------

export async function getRecentActivity(
  tenantId: string,
  callerRole: UserRole,
  limit = 20,
) {
  requireOwnerRole(callerRole);

  return withTenantContext(tenantId, async (tx) => {
    const logs = await tx.orderStatusLog.findMany({
      where: { tenantId },
      orderBy: { changedAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            garmentType: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        changedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return logs;
  });
}
