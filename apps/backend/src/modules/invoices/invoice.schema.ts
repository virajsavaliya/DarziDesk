/**
 * Zod validation schemas for Invoicing & Pricing Rules (Phase 7A).
 *
 * CRITICAL SECURITY INVARIANT:
 * Client-supplied `totalAmount`, `taxAmount`, `fabricCost`, `stitchingCharge`,
 * and `balanceDue` are NEVER accepted. They are deliberately omitted from
 * input schemas. Even if an attacker passes them, Zod parsing strips them.
 */

import { z } from 'zod';
import { GarmentType, InvoiceStatus, PaymentMethod } from '@prisma/client';

export const generateInvoiceSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  urgentSurcharge: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return '0.00';
      const num = Number(val);
      if (isNaN(num) || num < 0) throw new Error('urgentSurcharge must be a non-negative number');
      return num.toFixed(2);
    }),
  initialAdvancePaid: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return '0.00';
      const num = Number(val);
      if (isNaN(num) || num < 0) throw new Error('initialAdvancePaid must be a non-negative number');
      return num.toFixed(2);
    }),
  notes: z.string().max(500).optional(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num) || num <= 0) throw new Error('Payment amount must be greater than zero');
      return num.toFixed(2);
    }),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const listInvoicesQuerySchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const updatePricingRuleSchema = z.object({
  garmentType: z.nativeEnum(GarmentType),
  stitchingCharge: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0) throw new Error('Stitching charge must be a non-negative number');
      return num.toFixed(2);
    }),
});

export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;

export const updateTaxRateSchema = z.object({
  taxRatePercent: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 100) {
        throw new Error('Tax rate percent must be between 0 and 100');
      }
      return num.toFixed(2);
    }),
});

export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
