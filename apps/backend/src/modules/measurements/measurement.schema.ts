import { z } from 'zod';
import { GarmentType, MeasurementUnit, FitPreference } from '@prisma/client';

export const MeasurementValuesSchema = z.record(
  z.union([z.number(), z.string().regex(/^[0-9]+(\.[0-9]+)?$/, 'Value must be numeric')]),
);

export const CreateMeasurementProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(100),
  garmentType: z.nativeEnum(GarmentType),
  notes: z.string().max(500).optional(),
  unit: z.nativeEnum(MeasurementUnit).default(MeasurementUnit.INCHES),
  fitPreference: z.nativeEnum(FitPreference).default(FitPreference.REGULAR),
  fitNotes: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  values: MeasurementValuesSchema,
});
export type CreateMeasurementProfileInput = z.infer<typeof CreateMeasurementProfileSchema>;

export const CreateMeasurementVersionSchema = z.object({
  unit: z.nativeEnum(MeasurementUnit).optional(),
  fitPreference: z.nativeEnum(FitPreference).optional(),
  fitNotes: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  values: MeasurementValuesSchema,
});
export type CreateMeasurementVersionInput = z.infer<typeof CreateMeasurementVersionSchema>;
