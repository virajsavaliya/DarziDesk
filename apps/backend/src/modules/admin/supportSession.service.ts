/**
 * Support Session Service.
 *
 * Implements server-authoritative, time-limited, audited tenant support access
 * for Super Admins. Default scope is strictly READ_ONLY.
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { SupportSessionScope, SupportSessionStatus, UserRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { recordAuditLog } from './audit.service';
import type { Request } from 'express';

export interface CreateSupportSessionInput {
  tenantId: string;
  reason: string;
  scope?: SupportSessionScope;
  durationMinutes?: number;
}

export interface SupportSessionResult {
  session: {
    id: string;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    adminUserId: string;
    reason: string;
    scope: SupportSessionScope;
    status: SupportSessionStatus;
    expiresAt: Date;
    createdAt: Date;
  };
  token: string; // Plaintext token returned ONCE on creation
}

/**
 * Creates a new, time-limited, server-authoritative SupportSession for a Super Admin.
 */
export async function createSupportSession(
  adminUserId: string,
  input: CreateSupportSessionInput,
  req?: Request,
): Promise<SupportSessionResult> {
  // 1. Verify admin user
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { id: true, role: true, isActive: true },
  });

  if (!admin || !admin.isActive || admin.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Only active Super Admins can initiate a support session');
  }

  // 2. Verify target tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, name: true, slug: true, lifecycleState: true },
  });

  if (!tenant) {
    throw new NotFoundError('Target Tenant');
  }

  if (tenant.lifecycleState === 'ARCHIVED') {
    throw new ForbiddenError('Cannot initiate a support session for an archived tenant');
  }

  // 3. Duration & Scope defaults
  const duration = Math.min(240, Math.max(5, input.durationMinutes || 60));
  const scope = input.scope === SupportSessionScope.READ_WRITE ? SupportSessionScope.READ_WRITE : SupportSessionScope.READ_ONLY;
  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  // 4. Generate cryptographically strong opaque token & store SHA-256 hash
  const rawToken = `darzi_sup_${crypto.randomBytes(32).toString('hex')}`;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  if (req) {
    const forwarded = req.headers['x-forwarded-for'];
    ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : (req.headers['x-real-ip'] as string) ||
          req.socket.remoteAddress ||
          null;
    userAgent = req.headers['user-agent'] || null;
  }

  const session = await prisma.supportSession.create({
    data: {
      tokenHash,
      adminUserId,
      tenantId: input.tenantId,
      reason: input.reason.trim(),
      scope,
      status: SupportSessionStatus.ACTIVE,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // 5. Centralized Audit Log
  await recordAuditLog({
    actorUserId: adminUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: 'SUPPORT_SESSION_CREATED',
    targetType: 'TENANT',
    targetId: input.tenantId,
    tenantId: input.tenantId,
    supportSessionId: session.id,
    reason: input.reason,
    afterData: {
      sessionId: session.id,
      scope,
      expiresAt: expiresAt.toISOString(),
      durationMinutes: duration,
    },
    req,
  });

  return {
    session: {
      id: session.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      adminUserId,
      reason: session.reason,
      scope: session.scope,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    },
    token: rawToken,
  };
}

/**
 * Validates a support session token against the database.
 * Returns the session record with tenant details if valid, active, and unexpired.
 */
export async function validateSupportSessionToken(rawToken: string) {
  if (!rawToken || !rawToken.startsWith('darzi_sup_')) {
    return null;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const session = await prisma.supportSession.findUnique({
    where: { tokenHash },
    include: {
      adminUser: {
        select: { id: true, role: true, isActive: true, email: true },
      },
      tenant: {
        select: { id: true, name: true, slug: true, lifecycleState: true, isActive: true },
      },
    },
  });

  if (!session) return null;

  // Verify status
  if (session.status !== SupportSessionStatus.ACTIVE) {
    return null;
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    // Lazily mark expired
    await prisma.supportSession.update({
      where: { id: session.id },
      data: { status: SupportSessionStatus.EXPIRED },
    });
    return null;
  }

  // Verify admin is still active Super Admin
  if (!session.adminUser.isActive || session.adminUser.role !== UserRole.SUPER_ADMIN) {
    return null;
  }

  return session;
}

/**
 * Revokes an active support session immediately.
 */
export async function revokeSupportSession(
  sessionId: string,
  revokedByUserId: string,
  req?: Request,
) {
  const session = await prisma.supportSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundError('SupportSession');
  }

  if (session.status === SupportSessionStatus.REVOKED) {
    return session;
  }

  const updated = await prisma.supportSession.update({
    where: { id: sessionId },
    data: {
      status: SupportSessionStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy: revokedByUserId,
    },
  });

  await recordAuditLog({
    actorUserId: revokedByUserId,
    actorRole: UserRole.SUPER_ADMIN,
    action: 'SUPPORT_SESSION_REVOKED',
    targetType: 'SUPPORT_SESSION',
    targetId: sessionId,
    tenantId: session.tenantId,
    supportSessionId: sessionId,
    reason: 'Explicit Super Admin revocation',
    req,
  });

  return updated;
}

/**
 * Lists active support sessions with tenant details.
 */
export async function listActiveSupportSessions() {
  const now = new Date();
  return prisma.supportSession.findMany({
    where: {
      status: SupportSessionStatus.ACTIVE,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      adminUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      tenant: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

/**
 * Lists full support session audit history.
 */
export async function listSupportSessionHistory(page = 1, limit = 25) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const [total, sessions] = await Promise.all([
    prisma.supportSession.count(),
    prisma.supportSession.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    data: sessions,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
