import { NotificationChannel } from '@prisma/client';
import { openwaService } from './openwa.service';

export interface NotificationProvider {
  send(
    channel: NotificationChannel,
    recipient: string,
    templateName: string,
    data: any,
  ): Promise<void>;
}

/**
 * Format domain templates into customer-friendly WhatsApp messages with styling
 */
export function formatWhatsAppMessage(templateName: string, data: any): string {
  const shopName = data?.shopName || 'DarziDesk Tailoring Atelier';
  const customerName = data?.customerName || 'Valued Customer';
  const orderNumber = data?.orderNumber || (data?.orderId ? String(data.orderId).slice(0, 8).toUpperCase() : '');

  const parseFormattedDate = (val: any) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  switch (templateName) {
    case 'ORDER_CONFIRMED':
    case 'ORDER_CREATED':
    case 'ORDER_PLACED': {
      const deliveryDateStr = parseFormattedDate(data?.deliveryDate || data?.estimatedDeliveryDate);
      return (
        `✨ *${shopName}* — Order Confirmed!\n\n` +
        `Namaste ${customerName}, your bespoke tailoring order #${orderNumber} has been placed successfully.\n\n` +
        (data?.garmentType ? `👗 *Garment:* ${data.garmentType}\n` : '') +
        (deliveryDateStr ? `📅 *Target Delivery:* ${deliveryDateStr}\n` : '') +
        (data?.portalUrl ? `🔗 *Track Progress:* ${data.portalUrl}\n\n` : '\n') +
        `Thank you for placing your trust in our atelier craftsmanship!`
      );
    }

    case 'MEASUREMENT_CONFIRMED':
    case 'ORDER_MEASUREMENTS_CONFIRMED':
      return (
        `📏 *${shopName}* — Measurements Verified!\n\n` +
        `Namaste ${customerName}, your bespoke measurements for order #${orderNumber}` +
        (data?.garmentType ? ` (${data.garmentType})` : '') +
        ` have been verified by our master tailor.\n\n` +
        `Pattern drafting is now underway in our workshop.\n\n` +
        `Thank you for choosing ${shopName}!`
      );

    case 'ORDER_CUTTING':
    case 'CUTTING':
      return (
        `✂️ *${shopName}* — Fabric Cutting Started!\n\n` +
        `Namaste ${customerName}, work on your bespoke order #${orderNumber}` +
        (data?.garmentType ? ` (${data.garmentType})` : '') +
        ` has advanced to the cutting stage.\n\n` +
        (data?.fabricName ? `🧵 *Fabric:* ${data.fabricName}\n` : '') +
        `Our master craftsman is precision-cutting your fabric according to your bespoke pattern.`
      );

    case 'ORDER_STITCHING':
    case 'STITCHING':
      return (
        `🪡 *${shopName}* — Stitching in Progress!\n\n` +
        `Namaste ${customerName}, our artisan tailors have started stitching your bespoke order #${orderNumber}` +
        (data?.garmentType ? ` (${data.garmentType})` : '') +
        `.\n\n` +
        `Every seam, dart, and stitch is being assembled with bespoke tailoring precision.`
      );

    case 'ORDER_QUALITY_CHECK':
    case 'QUALITY_CHECK':
      return (
        `🔍 *${shopName}* — Quality Check & Finishing!\n\n` +
        `Namaste ${customerName}, tailoring for order #${orderNumber}` +
        (data?.garmentType ? ` (${data.garmentType})` : '') +
        ` is almost complete!\n\n` +
        `It is now undergoing our meticulous quality inspection, hand-finishing, and steam pressing. We will notify you once it is ready for collection.`
      );

    case 'ORDER_CANCELLED':
    case 'CANCELLED':
      return (
        `⚠️ *${shopName}* — Order Cancelled\n\n` +
        `Namaste ${customerName}, your order #${orderNumber}` +
        (data?.garmentType ? ` (${data.garmentType})` : '') +
        ` has been marked as cancelled.\n\n` +
        (data?.note ? `*Note:* ${data.note}\n\n` : '') +
        `If you have any questions, please reach out to us at ${shopName}.`
      );

    case 'MEASUREMENTS_RECORDED':
      return (
        `📏 *${shopName}* — Measurements Saved\n\n` +
        `Hi ${customerName}, your bespoke measurement profile (${data?.profileName || 'Default'}) has been recorded in our digital master book.\n` +
        `Our master cut craftsman will begin pattern drafting soon.`
      );

    case 'TRIAL_READY':
      return (
        `🪡 *${shopName}* — Trial Fitting Ready!\n\n` +
        `Namaste ${customerName}, your bespoke garment for order #${orderNumber} is now ready for your trial fitting.\n\n` +
        `Please drop by the studio at your convenience so we can verify the drape and precision contour before final stitching!`
      );

    case 'ORDER_READY':
    case 'READY_FOR_PICKUP':
      return (
        `🎉 *${shopName}* — Order Ready for Pickup!\n\n` +
        `Namaste ${customerName}, your order #${orderNumber} has finished final pressing and inspection.\n\n` +
        (data?.garmentType ? `👗 *Garment:* ${data.garmentType}\n` : '') +
        (data?.balanceDue && Number(data.balanceDue) > 0 ? `💰 *Balance Due:* ₹${data.balanceDue}\n` : '') +
        `Your item is neatly packaged and waiting for you at the counter. Please visit our shop to collect your item. We look forward to seeing you!`
      );

    case 'ORDER_DELIVERED':
    case 'ORDER_COLLECTED':
      return (
        `🌟 *${shopName}* — Order Collected!\n\n` +
        `Namaste ${customerName}, your order #${orderNumber} has been collected successfully.\n\n` +
        (data?.garmentType ? `👗 *Garment:* ${data.garmentType}\n` : '') +
        `We hope your bespoke fit exceeds expectations! Thank you for choosing ${shopName}. Please let us know if any alterations or touch-ups are ever needed.`
      );

    case 'INVOICE_GENERATED':
    case 'PAYMENT_RECEIVED':
      return (
        `🧾 *${shopName}* — Invoice Update\n\n` +
        `Hi ${customerName},\n` +
        (data?.invoiceNumber ? `Invoice: *#${data.invoiceNumber}*\n` : '') +
        (data?.amount ? `Amount: *₹${data.amount}*\n` : '') +
        (data?.balanceDue ? `Balance: *₹${data.balanceDue}*\n` : '') +
        (data?.portalUrl ? `View & Download: ${data.portalUrl}\n\n` : '\n') +
        `Thank you for your prompt business!`
      );

    case 'CUSTOM_ALERT':
    default:
      if (data?.message) {
        return `💬 *${shopName}*\n\n${data.message}`;
      }
      return `💬 *${shopName}*\n\nHi ${customerName}, you have an update regarding your order: ${JSON.stringify(data, null, 2)}`;
  }
}

/**
 * OpenWA-backed provider for real WhatsApp messaging with fallback logging
 */
export class OpenWaWhatsAppProvider implements NotificationProvider {
  // A flag used purely for our automated test suite to verify decoupling
  public static simulateFailure = false;

  async send(
    channel: NotificationChannel,
    recipient: string,
    templateName: string,
    data: any,
  ): Promise<void> {
    if (ConsoleProvider.simulateFailure || OpenWaWhatsAppProvider.simulateFailure) {
      throw new Error('Simulated notification provider failure');
    }

    if (channel === NotificationChannel.WHATSAPP) {
      const messageText = formatWhatsAppMessage(templateName, data);

      if (process.env.NODE_ENV === 'test') {
        console.log(`\n[TEST MOCK: WHATSAPP] Delivered to ${recipient}:\n${messageText}\n`);
        return;
      }

      try {
        console.log(`\n[OPEN-WA: WHATSAPP] Sending to ${recipient}...`);
        const result = await openwaService.sendTextMessage(recipient, messageText);
        console.log(`[OPEN-WA: WHATSAPP] Delivered successfully! MessageId: ${result.messageId}\n`);
      } catch (err: any) {
        console.error(`[OPEN-WA: WHATSAPP] Failed to send to ${recipient}:`, err.message);
        // Re-throw so NotificationService logs the specific failure reason into NotificationLog
        throw err;
      }
      return;
    }

    // Default console fallback for SMS, EMAIL, IN_APP
    console.log(`\n[NOTIFICATION: ${channel}] To: ${recipient}`);
    console.log(`Template: ${templateName}`);
    console.log(`Payload: ${JSON.stringify(data, null, 2)}\n`);
  }
}

// Backward-compatible alias for existing test references
export class ConsoleProvider extends OpenWaWhatsAppProvider {}
