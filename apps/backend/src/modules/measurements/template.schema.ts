import { z } from 'zod';
import { GarmentType } from '@prisma/client';

export const TemplateFieldSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});
export type TemplateField = z.infer<typeof TemplateFieldSchema>;

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  garmentType: z.nativeEnum(GarmentType),
  fields: z.array(TemplateFieldSchema).min(1, 'At least one field is required'),
});
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fields: z.array(TemplateFieldSchema).min(1, 'At least one field is required'),
});
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
