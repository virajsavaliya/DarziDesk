import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ConsoleProvider } from './notification.provider';

export class NotificationService {
  private provider = new ConsoleProvider();

  /**
   * Decoupled notification sending.
   * This handles logging the attempt and gracefully catching any provider errors
   * so the primary business transaction is not rolled back.
   */
  async sendNotification(params: {
    tenantId: string;
    customerId?: string | null;
    orderId?: string | null;
    channel: NotificationChannel;
    templateName: string;
    data: any;
    recipient: string;
  }): Promise<void> {
    const { tenantId, customerId, orderId, channel, templateName, data, recipient } = params;

    try {
      // 1. Check if the channel is enabled for this tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          smsEnabled: true,
          emailEnabled: true,
          whatsappEnabled: true,
        },
      });

      if (!tenant) return;

      if (channel === NotificationChannel.SMS && !tenant.smsEnabled) return;
      if (channel === NotificationChannel.EMAIL && !tenant.emailEnabled) return;
      if (channel === NotificationChannel.WHATSAPP && !tenant.whatsappEnabled) return;
      // IN_APP is always enabled

      // 2. Log as QUEUED
      const log = await prisma.notificationLog.create({
        data: {
          tenantId,
          customerId,
          orderId,
          channel,
          templateName,
          status: NotificationStatus.QUEUED,
          payload: data,
        },
      });

      // 3. Attempt to send
      try {
        await this.provider.send(channel, recipient, templateName, data);

        // Success - update to SENT
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: NotificationStatus.SENT },
        });
      } catch (providerError: any) {
        // Failure - update to FAILED, do not throw
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationStatus.FAILED,
            errorMessage: providerError?.message || 'Unknown provider error',
          },
        });
      }
    } catch (e) {
      // If the database insert itself fails, we catch it here so we still don't block
      // the business operation.
      console.error('Failed to create notification log:', e);
    }
  }
}

export const notificationService = new NotificationService();
