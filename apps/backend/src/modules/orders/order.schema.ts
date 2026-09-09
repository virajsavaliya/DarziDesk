/**
 * Zod validation schemas for Order pipeline module.
 */

import { z } from 'zod';
import { GarmentType, OrderStatus } from '@prisma/client';

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

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer UUID'),
  measurementProfileId: z.string().uuid('Invalid measurement profile UUID'),
  fabricId: z.string().uuid('Invalid fabric UUID'),
  garmentType: z.nativeEnum(GarmentType),
  metersUsed: positiveDecimalSchema,
  estimatedDeliveryDate: z
    .string()
    .datetime({ message: 'Must be a valid ISO datetime' })
    .optional()
    .nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const TransitionOrderStatusSchema = z.object({
  toStatus: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(500).optional().nullable(),
});

export const AssignOrderSchema = z.object({
  assignedStaffId: z.string().uuid('Invalid staff UUID'),
});

export const ListOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: z.string().uuid().optional(),
  assignedStaffId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type TransitionOrderStatusInput = z.infer<typeof TransitionOrderStatusSchema>;
export type AssignOrderInput = z.infer<typeof AssignOrderSchema>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
