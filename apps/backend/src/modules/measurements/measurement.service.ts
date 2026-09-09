/**
 * Garment measurement profile service.
 *
 * Enforces:
 * - Strict tenant-scoping (RLS + app-level filtering)
 * - MANDATORY immutable version history: updates never overwrite, they create version N+1
 * - Preserves author staff user ID and timestamp for every version
 */

import { InteractionSource } from '@prisma/client';
import { withTenantContext } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type {
  CreateMeasurementProfileInput,
  CreateMeasurementVersionInput,
} from './measurement.schema';

/**
 * Creates a new measurement profile for a customer in the given tenant.
 * Automatically generates version 1 as the current version.
 */
export async function createMeasurementProfile(
  tenantId: string,
  customerId: string,
  staffUserId: string,
  data: CreateMeasurementProfileInput,
) {
  return withTenantContext(tenantId, async (tx) => {
    // Verify customer exists
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Auto-create ShopCustomerLink if not already present
    const existingLink = await tx.shopCustomerLink.findUnique({
      where: {
        tenantId_customerId: { tenantId, customerId },
      },
    });

    if (!existingLink) {
      await tx.shopCustomerLink.create({
        data: {
          tenantId,
          customerId,
          firstInteractionSource: InteractionSource.WALK_IN,
        },
      });
    }

    // Create the profile container
    const profile = await tx.measurementProfile.create({
      data: {
        tenantId,
        customerId,
        name: data.name,
        garmentType: data.garmentType,
        notes: data.notes,
      },
    });

    // Create version 1 (immutable values snapshot)
    const version1 = await tx.measurementProfileVersion.create({
      data: {
        tenantId,
        profileId: profile.id,
        versionNumber: 1,
        isCurrent: true,
        values: data.values,
        unit: data.unit,
        fitPreference: data.fitPreference,
        fitNotes: data.fitNotes,
        photoUrl: data.photoUrl,
        createdById: staffUserId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      ...profile,
      currentVersion: version1,
      versions: [version1],
    };
  });
}

/**
 * Lists all measurement profiles for a customer under the caller's tenant.
 * Includes the current version for each profile.
 */
export async function listProfilesForCustomer(
  tenantId: string,
  customerId: string,
) {
  return withTenantContext(tenantId, async (tx) => {
    return tx.measurementProfile.findMany({
      where: {
        tenantId,
        customerId,
      },
      include: {
        versions: {
          where: { isCurrent: true },
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  });
}

/**
 * Fetches a single measurement profile with its FULL immutable version history.
 */
export async function getProfileWithHistory(
  tenantId: string,
  profileId: string,
) {
  return withTenantContext(tenantId, async (tx) => {
    const profile = await tx.measurementProfile.findFirst({
      where: { id: profileId, tenantId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Measurement profile');
    }

    const currentVersion = profile.versions.find((v) => v.isCurrent) || profile.versions[0];

    return {
      ...profile,
      currentVersion,
    };
  });
}

/**
 * Creates a NEW version for an existing measurement profile.
 * - Previous version is marked isCurrent = false.
 * - New version is created with versionNumber = previous + 1, isCurrent = true.
 * - Old values are NEVER overwritten.
 */
export async function addMeasurementVersion(
  tenantId: string,
  profileId: string,
  staffUserId: string,
  data: CreateMeasurementVersionInput,
) {
  return withTenantContext(tenantId, async (tx) => {
    // Locate the profile under this tenant
    const profile = await tx.measurementProfile.findFirst({
      where: { id: profileId, tenantId },
      include: {
        versions: {
          where: { isCurrent: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Measurement profile');
    }

    // Get current version number
    const latestVersion = await tx.measurementProfileVersion.findFirst({
      where: { profileId, tenantId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    // Mark previous current versions as not current
    await tx.measurementProfileVersion.updateMany({
      where: { profileId, tenantId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Insert new version
    const newVersion = await tx.measurementProfileVersion.create({
      data: {
        tenantId,
        profileId,
        versionNumber: nextVersionNumber,
        isCurrent: true,
        values: data.values,
        unit: data.unit ?? latestVersion?.unit,
        fitPreference: data.fitPreference ?? latestVersion?.fitPreference,
        fitNotes: data.fitNotes ?? latestVersion?.fitNotes,
        photoUrl: data.photoUrl ?? latestVersion?.photoUrl,
        createdById: staffUserId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Touch profile updatedAt
    await tx.measurementProfile.update({
      where: { id: profileId },
      data: { updatedAt: new Date() },
    });

    return newVersion;
  });
}
