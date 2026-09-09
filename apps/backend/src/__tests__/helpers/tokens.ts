/**
 * Token helpers for tests.
 *
 * These helpers bypass the HTTP layer and sign tokens directly,
 * so tests can control exact payload values (e.g., expired tokens,
 * wrong audience) without needing to call the login endpoint first.
 */

import { type User, type Customer } from '@prisma/client';
import { signStaffToken, signCustomerToken, type StaffJwtPayload } from '../../lib/jwt';
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'a'.repeat(64));

/** Sign a valid staff token for a given User record. */
export function staffToken(user: User): Promise<string> {
  return signStaffToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });
}

/** Sign a valid customer token for a given Customer record. */
export function customerToken(customer: Customer): Promise<string> {
  return signCustomerToken({ sub: customer.id });
}

/** Sign a staff token that is already expired (1 second in the past). */
export function expiredStaffToken(user: User): Promise<string> {
  return new SignJWT({ role: user.role, tenantId: user.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setAudience('darzi:staff')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // expired 60s ago
    .sign(secret);
}

/** Sign a token with a wrong audience (to test cross-type rejection). */
export function wrongAudienceToken(user: User, fakeAud: string): Promise<string> {
  return new SignJWT({ role: user.role, tenantId: user.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setAudience(fakeAud)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

/** A token signed with a different (wrong) secret — simulates a tampered token. */
export function tamperedToken(payload: Pick<StaffJwtPayload, 'sub' | 'role' | 'tenantId'>): Promise<string> {
  const wrongSecret = new TextEncoder().encode('wrong-secret'.repeat(6));
  return new SignJWT({ role: payload.role, tenantId: payload.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setAudience('darzi:staff')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(wrongSecret);
}
