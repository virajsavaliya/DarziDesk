/**
 * Garment measurement template service.
 *
 * Seeded with standard default templates (Shirt, Pant, T-Shirt, Kurta).
 * Fully tenant-scoped — Shop A and Shop B can independently customize their templates.
 */

import { GarmentType, type GarmentTemplate } from '@prisma/client';
import { withTenantContext } from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../lib/errors';
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateField,
} from './template.schema';

export const DEFAULT_TEMPLATES: Record<
  GarmentType,
  { name: string; fields: TemplateField[] }
> = {
  [GarmentType.SHIRT]: {
    name: 'Shirt',
    fields: [
      { name: 'Chest' },
      { name: 'Waist' },
      { name: 'Hip' },
      { name: 'Shoulder' },
      { name: 'Sleeve Length' },
      { name: 'Shirt Length' },
      { name: 'Collar' },
      { name: 'Cuff' },
      { name: 'Armhole' },
    ],
  },
  [GarmentType.PANT]: {
    name: 'Pant',
    fields: [
      { name: 'Waist' },
      { name: 'Hip' },
      { name: 'Inseam' },
      { name: 'Outseam' },
      { name: 'Thigh' },
      { name: 'Knee' },
      { name: 'Bottom' },
      { name: 'Fly Length' },
    ],
  },
  [GarmentType.TSHIRT]: {
    name: 'T-Shirt',
    fields: [
      { name: 'Chest' },
      { name: 'Length' },
      { name: 'Shoulder' },
      { name: 'Sleeve Length' },
      { name: 'Neck' },
    ],
  },
  [GarmentType.KURTA]: {
    name: 'Kurta',
    fields: [
      { name: 'Chest' },
      { name: 'Waist' },
      { name: 'Hip' },
      { name: 'Length' },
      { name: 'Shoulder' },
      { name: 'Sleeve Length' },
      { name: 'Neck Round' },
    ],
  },
  [GarmentType.CUSTOM]: {
    name: 'Custom Garment',
    fields: [{ name: 'Length' }, { name: 'Chest' }, { name: 'Waist' }],
  },
};

/**
 * Ensures default garment templates exist for the given tenant.
 */
export async function ensureDefaultTemplates(tenantId: string): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    const existing = await tx.garmentTemplate.findMany({
      where: { tenantId },
      select: { garmentType: true },
    });

    const existingTypes = new Set(existing.map((t) => t.garmentType));
    const toCreate: Array<{
      tenantId: string;
      name: string;
      garmentType: GarmentType;
      fields: TemplateField[];
    }> = [];

    for (const type of [
      GarmentType.SHIRT,
      GarmentType.PANT,
      GarmentType.TSHIRT,
      GarmentType.KURTA,
    ]) {
      if (!existingTypes.has(type)) {
        const def = DEFAULT_TEMPLATES[type];
        toCreate.push({
          tenantId,
          name: def.name,
          garmentType: type,
          fields: def.fields,
        });
      }
    }

    if (toCreate.length > 0) {
      await tx.garmentTemplate.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Lists all garment templates for this tenant (auto-seeds defaults if missing).
 */
export async function listTemplates(tenantId: string): Promise<GarmentTemplate[]> {
  await ensureDefaultTemplates(tenantId);

  return withTenantContext(tenantId, async (tx) => {
    return tx.garmentTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  });
}

/**
 * Fetches a single garment template for this tenant.
 */
export async function getTemplateById(
  tenantId: string,
  templateId: string,
): Promise<GarmentTemplate> {
  return withTenantContext(tenantId, async (tx) => {
    const template = await tx.garmentTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundError('Garment template');
    }

    return template;
  });
}

/**
 * Updates garment template fields for this tenant (Shop Owner only).
 */
export async function updateTemplate(
  tenantId: string,
  templateId: string,
  data: UpdateTemplateInput,
): Promise<GarmentTemplate> {
  return withTenantContext(tenantId, async (tx) => {
    const existing = await tx.garmentTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('Garment template');
    }

    return tx.garmentTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name ?? existing.name,
        fields: data.fields,
      },
    });
  });
}

/**
 * Creates a custom template for this tenant.
 */
export async function createCustomTemplate(
  tenantId: string,
  data: CreateTemplateInput,
): Promise<GarmentTemplate> {
  return withTenantContext(tenantId, async (tx) => {
    const existing = await tx.garmentTemplate.findFirst({
      where: { tenantId, garmentType: data.garmentType },
    });

    if (existing && data.garmentType !== GarmentType.CUSTOM) {
      throw new ConflictError(
        `A template for garment type ${data.garmentType} already exists for this shop`,
      );
    }

    return tx.garmentTemplate.create({
      data: {
        tenantId,
        name: data.name,
        garmentType: data.garmentType,
        fields: data.fields,
      },
    });
  });
}
