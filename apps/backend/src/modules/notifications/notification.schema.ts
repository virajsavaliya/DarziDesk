import { z } from 'zod';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export const updateNotificationPreferencesSchema = z.object({
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;

export const sendNotificationSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  channel: z.nativeEnum(NotificationChannel),
  templateName: z.string().min(1),
  recipient: z.string().min(1).optional(),
  message: z.string().optional(),
  data: z.record(z.any()).optional(),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

export const listNotificationsQuerySchema = z.object({
  channel: z.nativeEnum(NotificationChannel).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  orderId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;
