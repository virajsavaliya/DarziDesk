/**
 * Reports and Analytics Service
 *
 * Provides read-only tenant-scoped aggregations for:
 * 1. Revenue & Financials (invoices, cost breakdown, outstanding balances)
 * 2. Order Volumes & SLA (trends, garment breakdown, average turnaround days, cancellation rate)
 * 3. Staff Performance (completed orders, turnaround time, QC->Stitching rework rate)
 * 4. Fabric Consumption (meters consumed, inventory valuation, most/least used fabrics)
 *
 * Strictly scoped via withTenantContext.
 */

import { withTenantContext } from '../../lib/prisma';
import { InvoiceStatus, OrderStatus, FabricStockTransactionType, UserRole } from '@prisma/client';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * 1. Revenue Report
 */
export async function getRevenueReport(tenantId: string, range: DateRange) {
  return withTenantContext(tenantId, async (tx) => {
    // Invoices created within date range
    const invoices = await tx.invoice.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let fabricCost = 0;
    let stitchingCharges = 0;
    let urgentSurcharge = 0;
    let taxCollected = 0;

    const dailyMap: Record<string, { amount: number; count: number }> = {};

    for (const inv of invoices) {
      const tot = Number(inv.totalAmount);
      totalRevenue += tot;
      fabricCost += Number(inv.fabricCost);
      stitchingCharges += Number(inv.stitchingCharge);
      urgentSurcharge += Number(inv.urgentSurcharge);
      taxCollected += Number(inv.taxAmount);

      const dayKey = inv.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { amount: 0, count: 0 };
      }
      dailyMap[dayKey].amount += tot;
      dailyMap[dayKey].count += 1;
    }

    // Sort daily revenue trend
    const revenueByPeriod = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const d = new Date(date);
        const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        return {
          date,
          label,
          amount: Math.round(data.amount * 100) / 100,
          orderCount: data.count,
          count: Math.round(data.amount), // for MiniBarChart compatibility
        };
      });

    // Outstanding balances across all unpaid/partially paid invoices for this tenant
    const unpaidInvoices = await tx.invoice.findMany({
      where: {
        tenantId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      },
      select: { balanceDue: true },
    });

    const outstandingBalance = unpaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.balanceDue),
      0,
    );

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      breakdown: {
        fabricCost: Math.round(fabricCost * 100) / 100,
        stitchingCharges: Math.round(stitchingCharges * 100) / 100,
        urgentSurcharge: Math.round(urgentSurcharge * 100) / 100,
        taxCollected: Math.round(taxCollected * 100) / 100,
      },
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      revenueByPeriod,
      invoiceCount: invoices.length,
    };
  });
}

/**
 * 2. Orders Report
 */
export async function getOrdersReport(tenantId: string, range: DateRange) {
  return withTenantContext(tenantId, async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      include: {
        statusLogs: {
          orderBy: { changedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalOrders = orders.length;
    let cancelledOrdersCount = 0;
    const dailyMap: Record<string, number> = {};
    const garmentMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    let totalTurnaroundMs = 0;
    let deliveredOrdersWithSlaCount = 0;

    for (const ord of orders) {
      if (ord.status === OrderStatus.CANCELLED) {
        cancelledOrdersCount += 1;
      }

      // Daily trend
      const dayKey = ord.createdAt.toISOString().slice(0, 10);
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1;

      // Garment distribution
      const garment = ord.garmentType || 'CUSTOM';
      garmentMap[garment] = (garmentMap[garment] || 0) + 1;

      // Status snapshot
      statusMap[ord.status] = (statusMap[ord.status] || 0) + 1;

      // Average turnaround: Placed -> Delivered
      const deliveredLog = ord.statusLogs.find((l) => l.toStatus === OrderStatus.DELIVERED);
      if (deliveredLog) {
        const placedLog = ord.statusLogs.find((l) => l.toStatus === OrderStatus.PLACED);
        const startTime = placedLog ? new Date(placedLog.changedAt).getTime() : new Date(ord.createdAt).getTime();
        const endTime = new Date(deliveredLog.changedAt).getTime();
        const duration = endTime - startTime;
        if (duration >= 0) {
          totalTurnaroundMs += duration;
          deliveredOrdersWithSlaCount += 1;
        }
      }
    }

    const volumeTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date);
        const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        return { date, label, count };
      });

    // Garment color mapping for DonutChart
    const garmentColors: Record<string, string> = {
      SHIRT: '#3B82F6',
      PANT: '#10B981',
      KURTA: '#F59E0B',
      TSHIRT: '#8B5CF6',
      CUSTOM: '#EC4899',
    };

    const byGarmentType = Object.entries(garmentMap).map(([garment, value]) => ({
      label: garment.charAt(0) + garment.slice(1).toLowerCase(),
      value,
      color: garmentColors[garment] || '#64748B',
    }));

    const byStatus = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    const averageTurnaroundDays =
      deliveredOrdersWithSlaCount > 0
        ? Math.round((totalTurnaroundMs / (deliveredOrdersWithSlaCount * 1000 * 60 * 60 * 24)) * 10) / 10
        : 0;

    const cancellationRate =
      totalOrders > 0 ? Math.round((cancelledOrdersCount / totalOrders) * 1000) / 10 : 0;

    return {
      totalOrders,
      volumeTrend,
      byGarmentType,
      byStatus,
      averageTurnaroundDays,
      cancellationRate,
      deliveredOrdersCount: deliveredOrdersWithSlaCount,
    };
  });
}

/**
 * 3. Staff Performance Report (Shop Owner only)
 */
export async function getStaffPerformanceReport(tenantId: string, range: DateRange) {
  return withTenantContext(tenantId, async (tx) => {
    // Find all active staff members in the tenant
    const staffMembers = await tx.user.findMany({
      where: {
        tenantId,
        role: UserRole.STAFF,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: { firstName: 'asc' },
    });

    const staffPerformance = [];

    for (const staff of staffMembers) {
      // Find orders assigned to this staff member
      const assignedOrders = await tx.order.findMany({
        where: {
          tenantId,
          assignedStaffId: staff.id,
        },
        include: {
          statusLogs: {
            orderBy: { changedAt: 'asc' },
          },
        },
      });

      let completedInRange = 0;
      let activeCount = 0;
      let totalTurnaroundMs = 0;
      let completedWithSlaCount = 0;
      let reworkOrdersCount = 0;

      for (const ord of assignedOrders) {
        // Active orders count (currently open)
        if (ord.status !== OrderStatus.DELIVERED && ord.status !== OrderStatus.CANCELLED) {
          activeCount += 1;
        }

        // Check if delivered in range
        const deliveredLog = ord.statusLogs.find(
          (l) =>
            l.toStatus === OrderStatus.DELIVERED &&
            l.changedAt >= range.from &&
            l.changedAt <= range.to,
        );

        if (deliveredLog) {
          completedInRange += 1;
          const placedLog = ord.statusLogs.find((l) => l.toStatus === OrderStatus.PLACED);
          const startTime = placedLog
            ? new Date(placedLog.changedAt).getTime()
            : new Date(ord.createdAt).getTime();
          const endTime = new Date(deliveredLog.changedAt).getTime();
          const duration = endTime - startTime;
          if (duration >= 0) {
            totalTurnaroundMs += duration;
            completedWithSlaCount += 1;
          }
        }

        // Rework rate: QUALITY_CHECK -> STITCHING transitions in statusLogs
        let qcToStitchingLoops = 0;
        for (const log of ord.statusLogs) {
          if (log.fromStatus === OrderStatus.QUALITY_CHECK && log.toStatus === OrderStatus.STITCHING) {
            qcToStitchingLoops += 1;
          }
        }
        if (qcToStitchingLoops > 0) {
          reworkOrdersCount += 1;
        }
      }

      const averageTurnaroundDays =
        completedWithSlaCount > 0
          ? Math.round((totalTurnaroundMs / (completedWithSlaCount * 1000 * 60 * 60 * 24)) * 10) / 10
          : 0;

      const totalAssignedCount = assignedOrders.length;
      const reworkRate =
        totalAssignedCount > 0
          ? Math.round((reworkOrdersCount / totalAssignedCount) * 1000) / 10
          : 0;

      staffPerformance.push({
        staffId: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        name: `${staff.firstName} ${staff.lastName}`,
        email: staff.email,
        completedOrders: completedInRange,
        activeOrders: activeCount,
        averageTurnaroundDays,
        reworkCount: reworkOrdersCount,
        reworkRate,
        totalAssigned: totalAssignedCount,
      });
    }

    return {
      staff: staffPerformance,
      totalStaffCount: staffMembers.length,
    };
  });
}

/**
 * 4. Fabric Consumption Report
 */
export async function getFabricConsumptionReport(tenantId: string, range: DateRange) {
  return withTenantContext(tenantId, async (tx) => {
    // 1. Consume transactions in range
    const consumeTxs = await tx.fabricStockTransaction.findMany({
      where: {
        tenantId,
        type: FabricStockTransactionType.CONSUME,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      include: {
        fabric: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. All active fabrics in tenant to compute in-stock valuation & zero-consumption fabrics
    const allFabrics = await tx.fabric.findMany({
      where: {
        tenantId,
        isArchived: false,
      },
      orderBy: { name: 'asc' },
    });

    // Aggregate consumption per fabric
    const consumptionMap: Record<
      string,
      {
        fabricId: string;
        name: string;
        color: string;
        type: string;
        pricePerMeter: number;
        availableMeters: number;
        metersConsumed: number;
        costConsumed: number;
      }
    > = {};

    // Initialize with all fabrics
    for (const f of allFabrics) {
      consumptionMap[f.id] = {
        fabricId: f.id,
        name: f.name,
        color: f.color,
        type: f.type,
        pricePerMeter: Number(f.pricePerMeter),
        availableMeters: Number(f.availableMeters),
        metersConsumed: 0,
        costConsumed: 0,
      };
    }

    let totalMetersConsumed = 0;
    let totalCostConsumed = 0;

    for (const t of consumeTxs) {
      const meters = Number(t.meters);
      const fabricId = t.fabricId;
      totalMetersConsumed += meters;

      if (!consumptionMap[fabricId]) {
        consumptionMap[fabricId] = {
          fabricId,
          name: t.fabric?.name || 'Unknown Fabric',
          color: t.fabric?.color || '',
          type: t.fabric?.type || '',
          pricePerMeter: Number(t.fabric?.pricePerMeter || 0),
          availableMeters: Number(t.fabric?.availableMeters || 0),
          metersConsumed: 0,
          costConsumed: 0,
        };
      }

      const item = consumptionMap[fabricId];
      item.metersConsumed += meters;
      const cost = meters * item.pricePerMeter;
      item.costConsumed += cost;
      totalCostConsumed += cost;
    }

    const fabricList = Object.values(consumptionMap).map((f) => ({
      ...f,
      metersConsumed: Math.round(f.metersConsumed * 1000) / 1000,
      costConsumed: Math.round(f.costConsumed * 100) / 100,
      inStockValue: Math.round(f.availableMeters * f.pricePerMeter * 100) / 100,
    }));

    // In-stock valuation
    const inStockValuation = fabricList.reduce((sum, f) => sum + f.inStockValue, 0);

    // Most used (top 5 by consumption meters)
    const mostUsedFabrics = [...fabricList]
      .filter((f) => f.metersConsumed > 0)
      .sort((a, b) => b.metersConsumed - a.metersConsumed)
      .slice(0, 5);

    // Least used (lowest consumption or 0)
    const leastUsedFabrics = [...fabricList]
      .sort((a, b) => a.metersConsumed - b.metersConsumed)
      .slice(0, 5);

    return {
      totalMetersConsumed: Math.round(totalMetersConsumed * 1000) / 1000,
      totalCostConsumed: Math.round(totalCostConsumed * 100) / 100,
      inStockValuation: Math.round(inStockValuation * 100) / 100,
      fabricList,
      mostUsedFabrics,
      leastUsedFabrics,
      transactionCount: consumeTxs.length,
    };
  });
}
