/**
 * Zod validation schemas for Staff dashboard endpoints.
 */

import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const ListStaffOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  sort: z.enum(['estimatedDeliveryDate', 'createdAt']).default('estimatedDeliveryDate'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListStaffOrdersQuery = z.infer<typeof ListStaffOrdersQuerySchema>;
