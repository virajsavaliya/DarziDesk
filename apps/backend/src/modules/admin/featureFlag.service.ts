/**
 * Relational Feature Flag Service.
 *
 * Implements global feature flags with audited, relational per-tenant overrides.
 */

import { prisma } from '../../lib/prisma';
import { recordAuditLog } from './audit.service';
import { NotFoundError } from '../../lib/errors';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

/**
 * Checks whether a feature flag is enabled for a given tenant (or globally).
 */
export async function isFeatureEnabled(key: string, tenantId?: string | null): Promise<boolean> {
  const flag = await prisma.platformFeatureFlag.findUnique({
    where: { key },
    include: {
      overrides: true,
    },
  });

  if (!flag) {
    return false;
  }

  // If a tenant-specific override exists, it takes precedence
  if (tenantId) {
    const override = flag.overrides.find((o) => o.tenantId === tenantId);
    if (override) {
      return override.enabled;
    }
  }

  return flag.globalEnabled;
}

export async function listFeatureFlags() {
  return prisma.platformFeatureFlag.findMany({
    orderBy: { key: 'asc' },
    include: {
      overrides: {
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });
}

export async function upsertFeatureFlag(
  input: {
    key: string;
    name: string;
    description?: string;
    globalEnabled?: boolean;
  },
  adminUserId: string,
  req?: Request,
) {
  const existing = await prisma.platformFeatureFlag.findUnique({
    where: { key: input.key },
  });

  const flag = await prisma.platformFeatureFlag.upsert({
    where: { key: input.key },
    update: {
      name: input.name,
      description: input.description,
      ...(input.globalEnabled !== undefined && { globalEnabled: input.globalEnabled }),
    },
    create: {
      key: input.key,
      name: input.name,
      description: input.description,
      globalEnabled: input.globalEnabled ?? false,
    },
  });

  await recordAuditLog({
    actorUserId: adminUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: existing ? 'FEATURE_FLAG_UPDATED' : 'FEATURE_FLAG_CREATED',
    targetType: 'FEATURE_FLAG',
    targetId: flag.id,
    beforeData: existing,
    afterData: flag,
    req,
  });

  return flag;
}

export async function setTenantFeatureOverride(
  key: string,
  tenantId: string,
  enabled: boolean,
  adminUserId: string,
  reason?: string,
  req?: Request,
) {
  const flag = await prisma.platformFeatureFlag.findUnique({
    where: { key },
  });

  if (!flag) {
    throw new NotFoundError(`FeatureFlag: ${key}`);
  }

  const existingOverride = await prisma.tenantFeatureFlagOverride.findUnique({
    where: {
      featureFlagId_tenantId: {
        featureFlagId: flag.id,
        tenantId,
      },
    },
  });

  const override = await prisma.tenantFeatureFlagOverride.upsert({
    where: {
      featureFlagId_tenantId: {
        featureFlagId: flag.id,
        tenantId,
      },
    },
    update: {
      enabled,
      reason,
      createdBy: adminUserId,
    },
    create: {
      featureFlagId: flag.id,
      tenantId,
      enabled,
      reason,
      createdBy: adminUserId,
    },
  });

  await recordAuditLog({
    actorUserId: adminUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: 'TENANT_FEATURE_FLAG_OVERRIDDEN',
    targetType: 'FEATURE_FLAG_OVERRIDE',
    targetId: override.id,
    tenantId,
    reason,
    beforeData: existingOverride,
    afterData: override,
    req,
  });

  return override;
}

export async function removeTenantFeatureOverride(
  key: string,
  tenantId: string,
  adminUserId: string,
  req?: Request,
) {
  const flag = await prisma.platformFeatureFlag.findUnique({
    where: { key },
  });

  if (!flag) {
    throw new NotFoundError(`FeatureFlag: ${key}`);
  }

  const existingOverride = await prisma.tenantFeatureFlagOverride.findUnique({
    where: {
      featureFlagId_tenantId: {
        featureFlagId: flag.id,
        tenantId,
      },
    },
  });

  if (existingOverride) {
    await prisma.tenantFeatureFlagOverride.delete({
      where: { id: existingOverride.id },
    });

    await recordAuditLog({
      actorUserId: adminUserId,
      actorRole: UserRole.SUPER_ADMIN,
      action: 'TENANT_FEATURE_FLAG_OVERRIDE_REMOVED',
      targetType: 'FEATURE_FLAG_OVERRIDE',
      targetId: existingOverride.id,
      tenantId,
      beforeData: existingOverride,
      req,
    });
  }

  return { success: true };
}
