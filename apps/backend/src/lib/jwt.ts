/**
 * JWT sign and verify helpers.
 *
 * Design principles:
 * 1. Uses `jose` — enforces algorithm explicitly; immune to the 'none' algorithm attack.
 * 2. Two separate audiences: 'darzi:staff' and 'darzi:customer'.
 *    Tokens are NOT interchangeable — verifyStaffToken rejects customer tokens and vice versa.
 * 3. The audience is checked by `jose` before this code even sees the payload,
 *    making audience enforcement a library guarantee rather than our custom logic.
 * 4. JWT_SECRET is read from the validated env singleton — never hardcoded.
 */

import { SignJWT, jwtVerify, decodeJwt, errors as JoseErrors, type JWTPayload } from 'jose';
import { type UserRole } from '@prisma/client';
import { env } from '../config/env';
import { AuthenticationError, ForbiddenError } from './errors';

// The secret is encoded once at module load. It is never exposed outside this module.
const secret = new TextEncoder().encode(env.JWT_SECRET);

// ---------------------------------------------------------------------------
// Payload types (also exported for use in Express type augmentation)
// ---------------------------------------------------------------------------

export interface StaffJwtPayload {
  sub: string;
  aud: 'darzi:staff';
  role: UserRole;
  /** null for SUPER_ADMIN only */
  tenantId: string | null;
  iat: number;
  exp: number;
}

export interface CustomerJwtPayload {
  sub: string;
  aud: 'darzi:customer';
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

type SignStaffInput = Pick<StaffJwtPayload, 'sub' | 'role' | 'tenantId'>;
type SignCustomerInput = Pick<CustomerJwtPayload, 'sub'>;

export async function signStaffToken(input: SignStaffInput): Promise<string> {
  return new SignJWT({ role: input.role, tenantId: input.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.sub)
    .setAudience('darzi:staff')
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret);
}

export async function signCustomerToken(input: SignCustomerInput): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.sub)
    .setAudience('darzi:customer')
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRES_IN)
    .sign(secret);
}

// ---------------------------------------------------------------------------
// Verify — separate functions per audience type
// ---------------------------------------------------------------------------

function toStaffPayload(raw: JWTPayload): StaffJwtPayload {
  return {
    sub: raw.sub as string,
    aud: 'darzi:staff',
    role: raw.role as UserRole,
    tenantId: (raw.tenantId as string | null) ?? null,
    iat: raw.iat as number,
    exp: raw.exp as number,
  };
}

function toCustomerPayload(raw: JWTPayload): CustomerJwtPayload {
  return {
    sub: raw.sub as string,
    aud: 'darzi:customer',
    iat: raw.iat as number,
    exp: raw.exp as number,
  };
}

/**
 * Verifies a staff token.
 * Throws AuthenticationError on invalid/expired token.
 * Throws ForbiddenError on audience mismatch (e.g. customer token used here).
 */
export async function verifyStaffToken(token: string): Promise<StaffJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: 'darzi:staff',
      algorithms: ['HS256'],
    });
    return toStaffPayload(payload);
  } catch (err) {
    if (err instanceof JoseErrors.JWTExpired) {
      throw new AuthenticationError('Token expired');
    }
    // JWTClaimValidationFailed covers aud mismatch — check if it's a customer token
    if (err instanceof JoseErrors.JWTClaimValidationFailed) {
      try {
        const decoded = decodeJwt(token);
        if (decoded.aud === 'darzi:customer') {
          throw new ForbiddenError('Token audience mismatch — customer token rejected on staff route');
        }
      } catch (decodeErr) {
        if (decodeErr instanceof ForbiddenError) throw decodeErr;
      }
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Invalid token');
  }
}

/**
 * Verifies a customer token.
 * Throws AuthenticationError on invalid/expired token.
 * Throws ForbiddenError on audience mismatch (e.g. staff token used here).
 */
export async function verifyCustomerToken(token: string): Promise<CustomerJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: 'darzi:customer',
      algorithms: ['HS256'],
    });
    return toCustomerPayload(payload);
  } catch (err) {
    if (err instanceof JoseErrors.JWTExpired) {
      throw new AuthenticationError('Token expired');
    }
    if (err instanceof JoseErrors.JWTClaimValidationFailed) {
      try {
        const decoded = decodeJwt(token);
        if (decoded.aud === 'darzi:staff') {
          throw new ForbiddenError('Token audience mismatch — staff token rejected on customer route');
        }
      } catch (decodeErr) {
        if (decodeErr instanceof ForbiddenError) throw decodeErr;
      }
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Invalid token');
  }
}
