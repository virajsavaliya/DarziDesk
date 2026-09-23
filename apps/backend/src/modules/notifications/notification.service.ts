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
          name: true,
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

      const enrichedPayload = {
        shopName: data?.shopName || tenant.name || 'DarziDesk Tailoring Atelier',
        ...data,
      };

      // 2. Log as QUEUED
      const log = await prisma.notificationLog.create({
        data: {
          tenantId,
          customerId,
          orderId,
          channel,
          templateName,
          status: NotificationStatus.QUEUED,
          payload: enrichedPayload,
        },
      });

      // 3. Attempt to send
      try {
        await this.provider.send(channel, recipient, templateName, enrichedPayload);

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

  /**
   * Automated customer order alert dispatcher:
   * (e.g. ORDER_CONFIRMED, READY_FOR_PICKUP, ORDER_DELIVERED)
   * Dispatches via WhatsApp (and SMS if enabled), ensuring shop branding & order details are attached.
   */
  async sendCustomerOrderAlert(params: {
    tenantId: string;
    customerId?: string | null;
    orderId?: string | null;
    recipientPhone: string;
    templateName: string;
    data: any;
  }): Promise<void> {
    const { tenantId, customerId, orderId, recipientPhone, templateName, data } = params;
    if (!recipientPhone) return;

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          whatsappEnabled: true,
          smsEnabled: true,
        },
      });

      if (!tenant) return;

      const enrichedData = {
        shopName: data?.shopName || tenant.name || 'DarziDesk Tailoring Atelier',
        ...data,
      };

      // 1. WhatsApp Dispatch (Auto if enabled)
      if (tenant.whatsappEnabled) {
        await this.sendNotification({
          tenantId,
          customerId,
          orderId,
          channel: NotificationChannel.WHATSAPP,
          templateName,
          data: enrichedData,
          recipient: recipientPhone,
        });
      }

      // 2. SMS Dispatch (Auto if enabled)
      if (tenant.smsEnabled) {
        // Map to SMS-compatible template if distinct
        const smsTemplate = templateName === 'READY_FOR_PICKUP' ? 'ORDER_READY' : templateName;
        await this.sendNotification({
          tenantId,
          customerId,
          orderId,
          channel: NotificationChannel.SMS,
          templateName: smsTemplate,
          data: enrichedData,
          recipient: recipientPhone,
        });
      }
    } catch (err) {
      console.error('sendCustomerOrderAlert error:', err);
    }
  }
}

export const notificationService = new NotificationService();
