/**
 * Password reset service.
 *
 * SECURITY DESIGN:
 *
 * 1. Token generation: 32 cryptographically random bytes → base64url string.
 *    Only this plaintext token is sent to the user (via email in production,
 *    logged in development). It is NEVER stored in the database.
 *
 * 2. Token storage: SHA-256(token) is stored. An attacker who reads the DB
 *    cannot derive the plaintext token from the hash.
 *
 * 3. requestPasswordReset always returns void with the SAME response body
 *    regardless of whether the email exists. This prevents email enumeration.
 *    An artificial 200ms delay is added on non-existent-email paths to
 *    prevent timing attacks.
 *
 * 4. confirmPasswordReset marks the token as usedAt in the SAME transaction
 *    as the password update. If either fails, neither is committed — the
 *    user can retry.
 *
 * 5. Old unused tokens for the same user/customer are deleted on new request
 *    to prevent accumulation.
 */

import { randomBytes, createHash } from 'crypto';
import argon2 from 'argon2';
import { prisma } from '../../lib/prisma';
import { mailer } from '../../lib/mailer';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import type {
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
} from './auth.schema';

// ---------------------------------------------------------------------------
// Request reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  data: PasswordResetRequestInput,
): Promise<void> {
  let userId: string | null = null;
  let customerId: string | null = null;
  let recipientEmail: string | null = null;

  if (data.userType === 'staff') {
    if (!data.slug) {
      // Slug required for staff resets — silent fail (same response as success)
      await artificialDelay();
      return;
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (tenant?.isActive) {
      const user = await prisma.user.findFirst({
        where: { tenantId: tenant.id, email: data.email, isActive: true },
      });
      if (user) {
        userId = user.id;
        recipientEmail = user.email;
      }
    }
  } else {
    const customer = await prisma.customer.findUnique({ where: { email: data.email } });
    if (customer) {
      customerId = customer.id;
      recipientEmail = customer.email;
    }
  }

  if (!userId && !customerId) {
    // Add delay to prevent timing attacks (non-existent email vs slow argon2)
    await artificialDelay();
    return; // Silently succeed — caller always sees 200
  }

  // Generate 32-byte random token, base64url encoded
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(
    Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000,
  );

  // Invalidate any prior unused tokens for this subject
  await prisma.passwordResetToken.deleteMany({
    where: {
      ...(userId ? { userId } : { customerId }),
      usedAt: null,
    },
  });

  // Store only the hash — never the plaintext
  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId,
      customerId,
      expiresAt,
    },
  });

  // Deliver token (logged in dev, real email in production via Phase 2 provider)
  await mailer.sendPasswordResetEmail(recipientEmail!, token);
}

// ---------------------------------------------------------------------------
// Confirm reset
// ---------------------------------------------------------------------------

export async function confirmPasswordReset(
  data: PasswordResetConfirmInput,
): Promise<void> {
  const tokenHash = createHash('sha256').update(data.token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken) {
    throw new AppError(
      'Invalid or expired reset token',
      'INVALID_RESET_TOKEN',
      400,
    );
  }

  if (resetToken.usedAt !== null) {
    throw new AppError('Reset token has already been used', 'TOKEN_USED', 400);
  }

  if (new Date() > resetToken.expiresAt) {
    throw new AppError('Reset token has expired', 'TOKEN_EXPIRED', 400);
  }

  const passwordHash = await argon2.hash(data.newPassword);

  // Atomic: password update + token mark-as-used in one transaction
  await prisma.$transaction(async (tx) => {
    if (resetToken.userId) {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
    } else if (resetToken.customerId) {
      await tx.customer.update({
        where: { id: resetToken.customerId },
        data: { passwordHash },
      });
    }

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 200ms pause to equalise timing between found/not-found paths. */
function artificialDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200));
}
