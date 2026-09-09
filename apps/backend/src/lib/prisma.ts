/**
 * PrismaClient singleton + tenant-context transaction helper.
 *
 * withTenantContext()
 * ──────────────────
 * Every database operation that touches tenant-scoped data must go through
 * this helper. It:
 *
 *   1. Opens a Prisma transaction.
 *   2. Sets `app.tenant_id` for the duration of that transaction using
 *      `set_config(..., true)` — the `true` flag makes it transaction-local
 *      (equivalent to `SET LOCAL`), meaning it vanishes when the transaction
 *      ends and cannot bleed into concurrent connections.
 *   3. Executes the caller-provided callback with the transactional client.
 *
 * This pairs with the Postgres RLS policies (see migration phase1_rls) that
 * enforce `tenant_id = current_setting('app.tenant_id', true)`. Together they
 * form two independent enforcement layers:
 *
 *   Layer 1 (app)  — Prisma WHERE clause includes { tenantId } on every query.
 *   Layer 2 (DB)   — RLS USING policy blocks rows that don't match app.tenant_id.
 *
 * CRITICAL: tenantId must ALWAYS come from the verified JWT payload
 * (res.locals.auth.tenantId). It must NEVER be sourced from request body,
 * query params, or headers.
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  client.$on('query', (e: Prisma.QueryEvent) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma query');
  });

  client.$on('error', (e: Prisma.LogEvent) => {
    logger.error({ target: e.target, message: e.message }, 'Prisma error');
  });

  client.$on('warn', (e: Prisma.LogEvent) => {
    logger.warn({ target: e.target, message: e.message }, 'Prisma warning');
  });

  return client;
}

export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis.__prisma ??= createPrismaClient());

// ---------------------------------------------------------------------------
// Tenant-scoped transaction helper (RLS enforcement)
// ---------------------------------------------------------------------------

/**
 * TransactionClient type — matches what Prisma passes into $transaction callbacks.
 * Using Parameters<> ensures it stays in sync with the installed Prisma version.
 */
export type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Wraps a database operation in a transaction that sets `app.tenant_id` for
 * the duration, activating the Postgres RLS policies on tenant-scoped tables.
 *
 * For SuperAdmin (tenantId === null): runs without setting app.tenant_id,
 * which allows the RLS permissive policy to pass all rows through.
 *
 * @param tenantId - From the verified JWT payload only. Never from the request.
 * @param fn       - Your database operations — use the `tx` client, not `prisma`.
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (tenantId !== null) {
      // set_config(name, value, is_local=true) is transaction-scoped SET LOCAL
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    return fn(tx);
  });
}
