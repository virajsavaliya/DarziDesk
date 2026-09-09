import { z } from 'zod';
import { GarmentType, MeasurementUnit, FitPreference } from '@prisma/client';

export const CustomerCreateOrderSchema = z
  .object({
    fabricId: z.string().uuid('Invalid fabric ID'),
    garmentType: z.nativeEnum(GarmentType, {
      errorMap: () => ({ message: 'Invalid garment type' }),
    }),
    measurementProfileId: z.string().uuid('Invalid measurement profile ID').optional(),
    inStoreFitting: z.boolean().optional().default(false),
    metersUsed: z
      .string()
      .regex(/^\d+(\.\d{1,3})?$/, 'Must be a valid decimal string with up to 3 decimal places'),
    estimatedDeliveryDate: z.string().datetime('Must be a valid ISO 8601 date string').optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => Boolean(data.measurementProfileId) || data.inStoreFitting === true,
    {
      message: 'Must provide either a measurementProfileId or specify inStoreFitting: true',
      path: ['measurementProfileId'],
    },
  );

export type CustomerCreateOrderInput = z.infer<typeof CustomerCreateOrderSchema>;

export const CustomerCreateMeasurementProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(100),
  garmentType: z.nativeEnum(GarmentType, {
    errorMap: () => ({ message: 'Invalid garment type' }),
  }),
  values: z
    .record(z.union([z.string(), z.number()]))
    .refine((v) => Object.keys(v).length > 0, {
      message: 'At least one measurement value is required',
    }),
  unit: z.nativeEnum(MeasurementUnit).default(MeasurementUnit.INCHES),
  fitPreference: z.nativeEnum(FitPreference).default(FitPreference.REGULAR),
  fitNotes: z.string().max(500).optional(),
});

export type CustomerCreateMeasurementProfileInput = z.infer<
  typeof CustomerCreateMeasurementProfileSchema
>;
