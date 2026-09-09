/**
 * Mailer stub — Phase 1.
 *
 * In development: logs the reset token to pino stdout so developers can
 * copy-paste it without needing a real inbox.
 *
 * In test: is a no-op (prevents log noise during test runs).
 *
 * In production: throws a clear error reminding you to wire up a real
 * email provider (SendGrid, Resend, SES, etc.) before going live.
 *
 * The token is logged at the 'warn' level in development so it is visually
 * distinct and easy to find. In production logs this function never runs,
 * so real tokens never appear in logs.
 */

import { logger } from './logger';
import { env } from '../config/env';

export const mailer = {
  sendPasswordResetEmail(
    recipientEmail: string,
    token: string,
  ): Promise<void> {
    if (env.NODE_ENV === 'test') {
      // Silent no-op — tests inspect the DB directly if they need the token
      return Promise.resolve();
    }

    if (env.NODE_ENV === 'development') {
      logger.warn(
        {
          to: recipientEmail,
          // Token is logged only in dev — safe because dev DB has no real data
          resetToken: token,
          note: 'DEVELOPMENT ONLY — wire up a real email provider before going live',
        },
        '📧 [DEV] Password reset token (use this to test /api/auth/password-reset/confirm)',
      );
      return Promise.resolve();
    }

    // Production path — a real provider must be configured
    throw new Error(
      '[mailer] sendPasswordResetEmail: no email provider configured. ' +
        'Integrate SendGrid / Resend / SES before deploying to production.',
    );
  },
};
