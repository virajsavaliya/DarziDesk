/**
 * Auth request/response Zod schemas.
 *
 * Centralises all validation in one place. Route handlers call
 * schema.parse(req.body) and get a typed object back — or the global
 * error handler catches the ZodError and returns a 422.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Password policy (shared)
// ---------------------------------------------------------------------------

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// ---------------------------------------------------------------------------
// Tenant slug
// ---------------------------------------------------------------------------

const slug = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

// ---------------------------------------------------------------------------
// Register tenant (shop)
// ---------------------------------------------------------------------------

export const RegisterTenantSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === 'object') {
      return {
        ...val,
        slug: val.slug || val.shopSlug,
        firstName: val.firstName || val.ownerFirstName,
        lastName: val.lastName || val.ownerLastName,
      };
    }
    return val;
  },
  z.object({
    shopName: z.string().min(2).max(100),
    slug,
    ownerEmail: z.string().email(),
    ownerPassword: password,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
  }),
);
export type RegisterTenantInput = z.infer<typeof RegisterTenantSchema>;

// ---------------------------------------------------------------------------
// Staff / Owner login
// ---------------------------------------------------------------------------

export const LoginStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  slug, // Required to scope the user lookup to a specific shop
});
export type LoginStaffInput = z.infer<typeof LoginStaffSchema>;

// ---------------------------------------------------------------------------
// Customer register
// ---------------------------------------------------------------------------

export const RegisterCustomerSchema = z.object({
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  password,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerSchema>;

// ---------------------------------------------------------------------------
// Customer login
// ---------------------------------------------------------------------------

export const LoginCustomerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(8).max(20).optional(),
    password: z.string().min(1),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or phone must be provided',
  });
export type LoginCustomerInput = z.infer<typeof LoginCustomerSchema>;

// ---------------------------------------------------------------------------
// Create staff member (by Shop Owner)
// ---------------------------------------------------------------------------

export const CreateStaffSchema = z.object({
  email: z.string().email(),
  password,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  // tenantId is intentionally absent — it always comes from the JWT
});
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

// ---------------------------------------------------------------------------
// Password reset request
// ---------------------------------------------------------------------------

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
  /** 'staff' requires a slug; 'customer' does not. */
  userType: z.enum(['staff', 'customer']),
  slug: slug.optional(),
});
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;

// ---------------------------------------------------------------------------
// Password reset confirm
// ---------------------------------------------------------------------------

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmSchema>;

// ---------------------------------------------------------------------------
// Activate / deactivate staff
// ---------------------------------------------------------------------------

export const SetActiveSchema = z.object({
  isActive: z.boolean(),
});
export type SetActiveInput = z.infer<typeof SetActiveSchema>;
