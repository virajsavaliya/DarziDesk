import { z } from 'zod';
import { InteractionSource } from '@prisma/client';

export const CreateWalkInCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20),
  email: z.string().email().optional(),
  firstInteractionSource: z.nativeEnum(InteractionSource).default(InteractionSource.WALK_IN),
});
export type CreateWalkInCustomerInput = z.infer<typeof CreateWalkInCustomerSchema>;

export const UpdateCustomerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
});
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const SearchCustomersQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type SearchCustomersQueryInput = z.infer<typeof SearchCustomersQuerySchema>;
