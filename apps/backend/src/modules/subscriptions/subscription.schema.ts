import { z } from 'zod';
import {
  SubscriptionBillingCycle,
  SubscriptionPaymentMethod,
} from '@prisma/client';

export const CreatePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  priceMonthly: z.coerce.number().min(0, 'Monthly price must be non-negative'),
  priceYearly: z.coerce.number().min(0, 'Yearly price must be non-negative'),
  maxStaffAccounts: z.coerce.number().int().min(1, 'Max staff accounts must be at least 1'),
  maxOrdersPerMonth: z.coerce.number().int().min(1, 'Max orders per month must be at least 1'),
  maxSmsCredits: z.coerce.number().int().min(0).default(100),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false).optional(),
});

export const UpdatePlanSchema = CreatePlanSchema.partial();

export const ChangePlanSchema = z.object({
  planId: z.string().uuid('Valid plan ID required'),
  effectiveImmediate: z.boolean().default(true),
  billingCycle: z.nativeEnum(SubscriptionBillingCycle).optional(),
});

export const RecordSubscriptionPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be positive'),
  paymentMethod: z.nativeEnum(SubscriptionPaymentMethod),
  referenceNote: z.string().optional(),
  extendMonths: z.coerce.number().int().min(1).default(1),
});

export const AdminTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
  plan: z.string().optional(),
  search: z.string().optional(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
export type ChangePlanInput = z.infer<typeof ChangePlanSchema>;
export type RecordSubscriptionPaymentInput = z.infer<typeof RecordSubscriptionPaymentSchema>;
export type AdminTenantsQueryInput = z.infer<typeof AdminTenantsQuerySchema>;
