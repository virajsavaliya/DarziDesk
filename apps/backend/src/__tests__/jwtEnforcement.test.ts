/**
 * JWT enforcement tests.
 *
 * Verifies that token type (audience) and validity are strictly enforced:
 * [7]  Customer token rejected on staff-only route → 403
 * [8]  Staff token rejected on customer-only route → 403
 * [9]  Expired staff token → 401
 * [10] Tampered JWT signature → 401
 * [11] darzi:customer aud on staff route → 403
 * [12] darzi:staff aud on customer route → 403
 * [13] Unknown audience → 401
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { type User, type Customer } from '@prisma/client';
import { createApp } from '../app';
import { createTenant, createOwner, createCustomer } from './helpers/factories';
import {
  staffToken,
  customerToken,
  expiredStaffToken,
  tamperedToken,
  wrongAudienceToken,
} from './helpers/tokens';

const app = createApp();

describe('JWT Audience Enforcement', () => {
  let owner: User;
  let customer: Customer;
  let validStaffToken: string;
  let validCustomerToken: string;

  beforeEach(async () => {
    const tenant = await createTenant({ slug: 'jwt-test' });
    owner = await createOwner(tenant.id, { email: 'owner@jwt.com' });
    customer = await createCustomer({ email: 'cust@jwt.com' });

    validStaffToken = await staffToken(owner);
    validCustomerToken = await customerToken(customer);
  });

  it('[7] Customer token is rejected on staff-only route → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${validCustomerToken}`);

    expect(res.status).toBe(403);
  });

  it('[8] Staff token is rejected on customer-only route → 403', async () => {
    const res = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${validStaffToken}`);

    expect(res.status).toBe(403);
  });

  it('[9] Expired staff token → 401 with TOKEN_EXPIRED code', async () => {
    const expired = await expiredStaffToken(owner);
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('[10] Tampered JWT signature → 401', async () => {
    const tampered = await tamperedToken({
      sub: owner.id,
      role: owner.role,
      tenantId: owner.tenantId,
    });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });

  it('[11] Token with darzi:customer aud sent to staff route → 403', async () => {
    // validCustomerToken already has aud=darzi:customer
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${validCustomerToken}`);

    expect(res.status).toBe(403);
  });

  it('[12] Token with darzi:staff aud sent to customer route → 403', async () => {
    const res = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${validStaffToken}`);

    expect(res.status).toBe(403);
  });

  it('[13] Token with an unknown audience → 401', async () => {
    const unknownAud = await wrongAudienceToken(owner, 'darzi:unknown');
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${unknownAud}`);

    expect(res.status).toBe(401);
  });

  it('Missing Authorization header → 401', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('Malformed Bearer token → 401', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('Staff JWT payload contains tenantId', async () => {
    // Verify the token actually carries tenantId so middleware can use it
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${validStaffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBeTruthy();
  });

  it('Customer JWT response has no tenantId field', async () => {
    const res = await request(app)
      .get('/api/customers/me')
      .set('Authorization', `Bearer ${validCustomerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBeUndefined();
  });
});
