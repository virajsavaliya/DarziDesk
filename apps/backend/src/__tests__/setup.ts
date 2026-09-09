/**
 * Global test setup.
 *
 * Runs before each test file. Truncates all tables in reverse FK order
 * so every test starts with a clean DB without re-running migrations.
 *
 * Requires TEST_DATABASE_URL to be set in the environment.
 * Use a SEPARATE database from development — tests destroy all data.
 */

import { beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { resetRateLimiters } from '../middleware/rateLimiter';

// Use the test database — never the dev database
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Copy .env.example to .env and set TEST_DATABASE_URL.',
  );
}

// Override DATABASE_URL for this process so Prisma connects to the test DB
process.env.DATABASE_URL = testDatabaseUrl;

// Override JWT_SECRET to a valid test value if not set
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  process.env.JWT_SECRET = 'a'.repeat(64); // 64-char placeholder for tests
}

if (!process.env.JWT_ACCESS_EXPIRES_IN) {
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
}

// We need a separate PrismaClient that connects to the test DB
export const testPrisma = new PrismaClient({
  datasources: { db: { url: testDatabaseUrl } },
});

beforeEach(async () => {
  resetRateLimiters();
  // Truncate in reverse FK order to respect foreign key constraints
  await testPrisma.$executeRaw`
    TRUNCATE TABLE
      "notification_logs",
      "invoice_payments",
      "invoices",
      "tenant_pricing_rules",
      "order_status_logs",
      "orders",
      "fabric_stock_transactions",
      "fabrics",
      "measurement_profile_versions",
      "measurement_profiles",
      "garment_templates",
      "password_reset_tokens",
      "shop_customer_links",
      "users",
      "customers",
      "tenants"
    RESTART IDENTITY CASCADE
  `;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
