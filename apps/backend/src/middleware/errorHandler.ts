/**
 * Global error-handling middleware.
 *
 * Must be registered LAST in the Express middleware chain (after all routes).
 * Express identifies error handlers by their 4-argument signature.
 *
 * Behaviour:
 * - Logs the full error (including stack) via pino internally.
 * - In production: sanitized JSON — NO stack traces, generic 500 messages.
 * - In development: includes stack for debugging.
 * - Maps AppError subclasses, Prisma errors, and Zod errors to HTTP status codes.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

interface UnknownError extends Error {
  statusCode?: number;
  code?: string;
}

function mapToStatus(err: UnknownError): number {
  if (err instanceof AppError)                    return err.statusCode;
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': return 409;
      case 'P2025': return 404;
      case 'P2003': return 422;
      default:      return 400;
    }
  }
  if (err instanceof PrismaClientValidationError) return 400;
  if (err instanceof ZodError)                    return 422;
  return 500;
}

function mapToCode(err: UnknownError): string {
  if (err instanceof AppError)                       return err.code;
  if (err instanceof PrismaClientKnownRequestError)  return `PRISMA_${err.code}`;
  if (err instanceof ZodError)                       return 'VALIDATION_ERROR';
  return 'INTERNAL_SERVER_ERROR';
}

export function errorHandler(
  err: UnknownError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = mapToStatus(err);
  const code   = mapToCode(err);
  const isProd = env.NODE_ENV === 'production';

  logger.error({ err, method: req.method, url: req.url, status }, err.message);

  if (err instanceof ZodError) {
    res.status(status).json({
      error: {
        message: 'Validation failed',
        code,
        fields: err.flatten().fieldErrors,
        ...(isProd ? {} : { stack: err.stack }),
      },
    });
    return;
  }

  res.status(status).json({
    error: {
      message: isProd && status === 500 ? 'An internal error occurred' : err.message,
      code,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
