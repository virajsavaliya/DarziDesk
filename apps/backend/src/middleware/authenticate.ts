/**
 * Authentication middleware.
 *
 * Reads `Authorization: Bearer <token>` from the request header.
 * Verifies the JWT signature and audience, then sets res.locals.auth.
 *
 * - authenticateStaff   — accepts only 'darzi:staff' audience tokens
 * - authenticateCustomer — accepts only 'darzi:customer' audience tokens
 *
 * On success: sets res.locals.auth and calls next().
 * On failure:
 *   - Missing/malformed header → 401
 *   - Expired token → 401 with TOKEN_EXPIRED code
 *   - Wrong audience (e.g. customer token on staff route) → 403
 *   - Invalid signature → 401
 */

import type { RequestHandler } from 'express';
import { verifyStaffToken, verifyCustomerToken } from '../lib/jwt';
import { AuthenticationError, ForbiddenError } from '../lib/errors';
import { logger } from '../lib/logger';

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export const authenticateStaff: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }

  try {
    const payload = await verifyStaffToken(token);
    res.locals.auth = payload;
    next();
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }
    logger.error({ err }, 'Unexpected error in authenticateStaff');
    res.status(401).json({
      error: { message: 'Authentication failed', code: 'UNAUTHORIZED' },
    });
  }
};

export const authenticateCustomer: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }

  try {
    const payload = await verifyCustomerToken(token);
    res.locals.auth = payload;
    next();
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: { message: err.message, code: err.code },
      });
      return;
    }
    logger.error({ err }, 'Unexpected error in authenticateCustomer');
    res.status(401).json({
      error: { message: 'Authentication failed', code: 'UNAUTHORIZED' },
    });
  }
};
