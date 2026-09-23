/**
 * Centralized Platform Audit Service.
 *
 * Requirements:
 * - Append-only from application perspective (no update/delete methods).
 * - Sanitizes sensitive fields (passwords, tokens, secrets, card numbers, OTPs).
 * - Captures actor, role, action, target, before/after snapshots, IP, userAgent, and supportSessionId.
 */

import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { Request } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'secret',
  'jwt_secret',
  'otp',
  'authorization',
  'cookie',
  'creditcard',
  'cardnumber',
]);

/**
 * Deeply sanitizes any object or array to redact sensitive security attributes.
 */
export function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeAuditData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface RecordAuditLogParams {
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  tenantId?: string | null;
  supportSessionId?: string | null;
  requestId?: string | null;
  beforeData?: any;
  afterData?: any;
  reason?: string | null;
  req?: Request | null;
}

/**
 * Records an immutable, append-only platform audit entry.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (params.req) {
      const forwarded = params.req.headers['x-forwarded-for'];
      ipAddress =
        typeof forwarded === 'string'
          ? forwarded.split(',')[0].trim()
          : (params.req.headers['x-real-ip'] as string) ||
            params.req.socket.remoteAddress ||
            null;
      userAgent = params.req.headers['user-agent'] || null;
    }

    await prisma.platformAuditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        tenantId: params.tenantId || null,
        supportSessionId: params.supportSessionId || null,
        requestId: params.requestId || null,
        beforeData: params.beforeData ? sanitizeAuditData(params.beforeData) : undefined,
        afterData: params.afterData ? sanitizeAuditData(params.afterData) : undefined,
        reason: params.reason || null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // Audit logging must not crash application execution, but must log errors clearly
    logger.error({ err, action: params.action }, 'Failed to record PlatformAuditLog');
  }
}

export interface ListAuditLogsQuery {
  tenantId?: string;
  actorUserId?: string;
  action?: string;
  targetType?: string;
  page?: number;
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Retrieves paginated audit logs for Super Admin inspection.
 */
export async function listAuditLogs(query: ListAuditLogsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 25));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.tenantId) where.tenantId = query.tenantId;
  if (query.actorUserId) where.actorUserId = query.actorUserId;
  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;

  if (query.fromDate || query.toDate) {
    where.createdAt = {};
    if (query.fromDate) where.createdAt.gte = query.fromDate;
    if (query.toDate) where.createdAt.lte = query.toDate;
  }

  const [total, logs] = await Promise.all([
    prisma.platformAuditLog.count({ where }),
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        actorUser: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    data: logs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
