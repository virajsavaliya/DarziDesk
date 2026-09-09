import { NotificationChannel } from '@prisma/client';

export interface NotificationProvider {
  send(
    channel: NotificationChannel,
    recipient: string,
    templateName: string,
    data: any,
  ): Promise<void>;
}

export class ConsoleProvider implements NotificationProvider {
  // A flag used purely for our automated test suite to verify decoupling
  public static simulateFailure = false;

  async send(
    channel: NotificationChannel,
    recipient: string,
    templateName: string,
    data: any,
  ): Promise<void> {
    if (ConsoleProvider.simulateFailure) {
      throw new Error('Simulated notification provider failure');
    }

    console.log(`\n[NOTIFICATION: ${channel}] To: ${recipient}`);
    console.log(`Template: ${templateName}`);
    console.log(`Payload: ${JSON.stringify(data, null, 2)}\n`);
    
    // In a real provider, we would use Twilio / SendGrid / WhatsApp API here.
  }
}
