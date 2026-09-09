/**
 * Zod validation schemas for Fabric inventory module.
 */

import { z } from 'zod';

const decimalNumberSchema = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const n = typeof val === 'number' ? val : parseFloat(val);
      return !isNaN(n) && isFinite(n);
    },
    { message: 'Must be a valid decimal number' },
  )
  .transform((val) => (typeof val === 'number' ? val.toString() : val.trim()));

const positiveDecimalSchema = decimalNumberSchema.refine(
  (val) => parseFloat(val) > 0,
  { message: 'Must be greater than 0' },
);

const nonNegativeDecimalSchema = decimalNumberSchema.refine(
  (val) => parseFloat(val) >= 0,
  { message: 'Must be greater than or equal to 0' },
);

const nonZeroDecimalSchema = decimalNumberSchema.refine(
  (val) => parseFloat(val) !== 0,
  { message: 'Adjustment meters cannot be 0' },
);

export const CreateFabricSchema = z.object({
  name: z.string().trim().min(1, 'Fabric name is required').max(100),
  color: z.string().trim().min(1, 'Color is required').max(50),
  type: z.string().trim().min(1, 'Fabric type is required').max(50),
  pricePerMeter: positiveDecimalSchema,
  initialMeters: nonNegativeDecimalSchema.optional().default('0'),
  lowStockThreshold: nonNegativeDecimalSchema.optional().default('0'),
  photoUrl: z.string().url().optional().nullable(),
  supplierName: z.string().trim().max(100).optional().nullable(),
  purchaseNotes: z.string().trim().max(500).optional().nullable(),
});

export const UpdateFabricSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  color: z.string().trim().min(1).max(50).optional(),
  type: z.string().trim().min(1).max(50).optional(),
  pricePerMeter: positiveDecimalSchema.optional(),
  lowStockThreshold: nonNegativeDecimalSchema.optional(),
  photoUrl: z.string().url().optional().nullable(),
  supplierName: z.string().trim().max(100).optional().nullable(),
  purchaseNotes: z.string().trim().max(500).optional().nullable(),
});

export const AddStockSchema = z.object({
  meters: positiveDecimalSchema,
  supplierName: z.string().trim().max(100).optional().nullable(),
  purchaseNotes: z.string().trim().max(500).optional().nullable(),
});

export const ReserveStockSchema = z.object({
  meters: positiveDecimalSchema,
  orderId: z.string().uuid('Invalid order UUID').optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const ReleaseStockSchema = z.object({
  meters: positiveDecimalSchema,
  orderId: z.string().uuid('Invalid order UUID').optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const ConsumeStockSchema = z.object({
  meters: positiveDecimalSchema,
  orderId: z.string().uuid('Invalid order UUID').optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const AdjustStockSchema = z.object({
  meters: nonZeroDecimalSchema,
  note: z.string().trim().min(1, 'Note is required for stock adjustments').max(500),
});

export const ListFabricsQuerySchema = z.object({
  search: z.string().trim().optional(),
  isArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export type CreateFabricInput = z.infer<typeof CreateFabricSchema>;
export type UpdateFabricInput = z.infer<typeof UpdateFabricSchema>;
export type AddStockInput = z.infer<typeof AddStockSchema>;
export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;
export type ReleaseStockInput = z.infer<typeof ReleaseStockSchema>;
export type ConsumeStockInput = z.infer<typeof ConsumeStockSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type ListFabricsQuery = z.infer<typeof ListFabricsQuerySchema>;
