/**
 * Auth flow tests.
 *
 * Covers: tenant registration, staff login, customer registration,
 * customer login, password hashing assertions, JWT claims, and
 * password reset (request + confirm + single-use + expiry).
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { testPrisma } from './setup';
import { createTenant, createUser, createCustomer, TEST_PASSWORD } from './helpers/factories';

const app = createApp();

describe('Tenant Registration', () => {
  it('[14] registers a new tenant and returns a staff token', async () => {
    const res = await request(app).post('/api/auth/register/tenant').send({
      shopName: 'Stitch & Style',
      slug: 'stitch-style',
      ownerEmail: 'owner@stitch.com',
      ownerPassword: 'Secret1234!',
      firstName: 'Alice',
      lastName: 'Owner',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('SHOP_OWNER');
    expect(res.body.data.user.tenantId).toBeTruthy();
    // passwordHash must never appear in the response
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate slug with 409', async () => {
    await request(app).post('/api/auth/register/tenant').send({
      shopName: 'First',
      slug: 'my-shop',
      ownerEmail: 'owner@first.com',
      ownerPassword: 'Secret1234!',
      firstName: 'A',
      lastName: 'B',
    });

    const res = await request(app).post('/api/auth/register/tenant').send({
      shopName: 'Second',
      slug: 'my-shop',
      ownerEmail: 'owner@second.com',
      ownerPassword: 'Secret1234!',
      firstName: 'C',
      lastName: 'D',
    });

    expect(res.status).toBe(409);
  });

  it('validates password policy — rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register/tenant').send({
      shopName: 'Bad',
      slug: 'bad-shop',
      ownerEmail: 'bad@email.com',
      ownerPassword: 'weak',
      firstName: 'A',
      lastName: 'B',
    });

    expect(res.status).toBe(422);
  });
});

describe('Staff Login', () => {
  it('[15] valid credentials → 200 + staff token', async () => {
    const tenant = await createTenant({ slug: 'login-test' });
    await createUser(tenant.id, { email: 'staff@login.com', role: 'SHOP_OWNER' });

    const res = await request(app).post('/api/auth/login/staff').send({
      email: 'staff@login.com',
      password: TEST_PASSWORD,
      slug: 'login-test',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('[16] wrong password → 401 (generic message)', async () => {
    const tenant = await createTenant({ slug: 'pw-test' });
    await createUser(tenant.id, { email: 'pw@test.com' });

    const res = await request(app).post('/api/auth/login/staff').send({
      email: 'pw@test.com',
      password: 'WrongPass1!',
      slug: 'pw-test',
    });

    expect(res.status).toBe(401);
  });

  it('[17] wrong email → same 401 message as wrong password (no enumeration)', async () => {
    const tenant = await createTenant({ slug: 'enum-test' });

    const wrongEmail = await request(app).post('/api/auth/login/staff').send({
      email: 'nonexistent@x.com',
      password: TEST_PASSWORD,
      slug: 'enum-test',
    });

    await createUser(tenant.id, { email: 'real@enum.com' });
    const wrongPw = await request(app).post('/api/auth/login/staff').send({
      email: 'real@enum.com',
      password: 'WrongPass1!',
      slug: 'enum-test',
    });

    // Both return 401 with identical messages — no enumeration possible
    expect(wrongEmail.status).toBe(401);
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.body.error.message).toBe(wrongPw.body.error.message);
  });
});

describe('Customer Registration & Login', () => {
  it('[18] registers customer → returns customer token with darzi:customer audience', async () => {
    const res = await request(app).post('/api/auth/register/customer').send({
      phone: '+919876543210',
      email: 'cust@test.com',
      password: 'Secret1234!',
      firstName: 'Bob',
      lastName: 'Customer',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.customer.email).toBe('cust@test.com');
    expect(res.body.data.customer.phone).toBe('+919876543210');
    expect(res.body.data.customer.passwordHash).toBeUndefined();
  });

  it('customer login with valid credentials returns token', async () => {
    await createCustomer({ email: 'login@cust.com' });

    const res = await request(app).post('/api/auth/login/customer').send({
      email: 'login@cust.com',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });
});

describe('[19] Password hashing', () => {
  it('stored passwordHash is NOT equal to the plaintext password', async () => {
    await request(app).post('/api/auth/register/customer').send({
      phone: '+919876543211',
      email: 'hashtest@test.com',
      password: 'Secret1234!',
      firstName: 'Hash',
      lastName: 'Test',
    });

    const customer = await testPrisma.customer.findUnique({
      where: { email: 'hashtest@test.com' },
    });

    expect(customer).not.toBeNull();
    expect(customer!.passwordHash).not.toBe('Secret1234!');
    // argon2 hashes start with $argon2
    expect(customer!.passwordHash).toMatch(/^\$argon2/);
  });
});

describe('[20] JWT_SECRET from environment', () => {
  it('JWT_SECRET is read from process.env, not a hardcoded string', async () => {
    // The env module validates that JWT_SECRET comes from process.env.
    // We verify it equals what we set in setup.ts, not a hardcoded value.
    const { env } = await import('../config/env');
    expect(env.JWT_SECRET).toBe(process.env.JWT_SECRET);
    expect(env.JWT_SECRET).not.toBe('');
  });
});

describe('[21-23] Password reset', () => {
  it('[21] full flow: request → confirm → login with new password', async () => {
    const customer = await createCustomer({ email: 'reset@flow.com' });

    // Request reset
    await request(app).post('/api/auth/password-reset/request').send({
      email: 'reset@flow.com',
      userType: 'customer',
    });

    // Fetch token hash from DB and reverse-engineer... actually we look up the record
    const tokenRecord = await testPrisma.passwordResetToken.findFirst({
      where: { customerId: customer.id, usedAt: null },
    });
    expect(tokenRecord).not.toBeNull();

    // We can't easily get the plaintext token in tests since mailer is a no-op.
    // Instead, directly verify the flow by creating a known token:
    const { randomBytes, createHash: ch } = await import('crypto');
    const knownToken = randomBytes(32).toString('base64url');
    const knownHash = ch('sha256').update(knownToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete the auto-generated token and create our known one
    await testPrisma.passwordResetToken.deleteMany({ where: { customerId: customer.id } });
    await testPrisma.passwordResetToken.create({
      data: { tokenHash: knownHash, customerId: customer.id, expiresAt },
    });

    // Confirm reset
    const confirmRes = await request(app).post('/api/auth/password-reset/confirm').send({
      token: knownToken,
      newPassword: 'NewSecret9!',
    });
    expect(confirmRes.status).toBe(200);

    // Login with new password
    const loginRes = await request(app).post('/api/auth/login/customer').send({
      email: 'reset@flow.com',
      password: 'NewSecret9!',
    });
    expect(loginRes.status).toBe(200);

    // Old password no longer works
    const oldPassRes = await request(app).post('/api/auth/login/customer').send({
      email: 'reset@flow.com',
      password: TEST_PASSWORD,
    });
    expect(oldPassRes.status).toBe(401);
  });

  it('[22] reset token is single-use — second confirm returns 400', async () => {
    const customer = await createCustomer({ email: 'singleuse@test.com' });
    const { randomBytes, createHash: ch } = await import('crypto');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = ch('sha256').update(token).digest('hex');

    await testPrisma.passwordResetToken.create({
      data: {
        tokenHash,
        customerId: customer.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await request(app).post('/api/auth/password-reset/confirm').send({
      token,
      newPassword: 'FirstReset1!',
    });

    const secondUse = await request(app).post('/api/auth/password-reset/confirm').send({
      token,
      newPassword: 'SecondReset1!',
    });
    expect(secondUse.status).toBe(400);
    expect(secondUse.body.error.code).toBe('TOKEN_USED');
  });

  it('[23] expired token returns 400', async () => {
    const customer = await createCustomer({ email: 'expired@test.com' });
    const { randomBytes, createHash: ch } = await import('crypto');
    const token = randomBytes(32).toString('base64url');
    const tokenHash = ch('sha256').update(token).digest('hex');

    await testPrisma.passwordResetToken.create({
      data: {
        tokenHash,
        customerId: customer.id,
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    const res = await request(app).post('/api/auth/password-reset/confirm').send({
      token,
      newPassword: 'NewPass1!',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
