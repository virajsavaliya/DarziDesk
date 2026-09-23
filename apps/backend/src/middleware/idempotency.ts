/**
 * Idempotency Middleware.
 *
 * Protects critical financial and lifecycle mutations against duplicate submissions
 * using client-provided Idempotency-Key headers.
 */

import type { RequestHandler, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export function idempotency(options?: { ttlHours?: number }): RequestHandler {
  const ttlHours = options?.ttlHours || 24;

  return async (req, res, next) => {
    const rawKey = req.headers['idempotency-key'] as string | undefined;

    // Only apply if client sends the header on mutating methods
    if (!rawKey || !['POST', 'PATCH', 'PUT'].includes(req.method.toUpperCase())) {
      next();
      return;
    }

    const key = rawKey.trim();
    if (key.length < 8 || key.length > 128) {
      res.status(400).json({
        error: {
          message: 'Idempotency-Key must be between 8 and 128 characters.',
          code: 'INVALID_IDEMPOTENCY_KEY',
        },
      });
      return;
    }

    const tenantId = (res.locals.tenantId as string) || null;
    const userId = (res.locals.auth?.sub as string) || null;
    const scopedKey = `idem:${tenantId || 'global'}:${key}`;

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key: scopedKey },
      });

      if (existing && existing.expiresAt > new Date()) {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(existing.statusCode).json(existing.responseBody);
        return;
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);

      res.json = function (body: any): Response {
        const statusCode = res.statusCode;

        // Persist successful mutations for idempotency
        if (statusCode >= 200 && statusCode < 400) {
          const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
          prisma.idempotencyRecord
            .upsert({
              where: { key: scopedKey },
              update: {
                statusCode,
                responseBody: body,
                expiresAt,
              },
              create: {
                key: scopedKey,
                tenantId,
                userId,
                endpoint: req.originalUrl,
                statusCode,
                responseBody: body,
                expiresAt,
              },
            })
            .catch((err) => {
              logger.error({ err, key: scopedKey }, 'Failed to persist idempotency record');
            });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
