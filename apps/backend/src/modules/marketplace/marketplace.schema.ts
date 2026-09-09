import { z } from 'zod';

export const MarketplaceSettingsSchema = z.object({
  isListedOnMarketplace: z.boolean().optional(),
  city: z.string().trim().min(1).max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  specialtyTags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  coverPhotoUrl: z.string().url().optional().nullable().or(z.literal('')),
  portfolioPhotoUrls: z.array(z.string().url()).max(10).optional(),
  workingHours: z.record(z.any()).optional().nullable(),
});

export type MarketplaceSettingsInput = z.infer<typeof MarketplaceSettingsSchema>;

export const MarketplaceQuerySchema = z.object({
  city: z.string().trim().optional(),
  specialty: z.string().trim().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type MarketplaceQueryInput = z.infer<typeof MarketplaceQuerySchema>;

export const CreateReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const FlagReviewSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500),
});

export type FlagReviewInput = z.infer<typeof FlagReviewSchema>;

export const RejectListingSchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(500),
});

export type RejectListingInput = z.infer<typeof RejectListingSchema>;

export const ResolveReviewSchema = z.object({
  action: z.enum(['DISMISS', 'REMOVE']),
});

export type ResolveReviewInput = z.infer<typeof ResolveReviewSchema>;
