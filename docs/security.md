# DarziDesk Enterprise Security & Governance Reference

This document details the security architecture, controls, threat mitigations, and compliance measures implemented across DarziDesk.

---

## 1. Zero Trust Multi-Tenant Isolation

### 1.1. Client Header Deprecation
- **Policy**: Client-injected `x-tenant-id` headers are strictly dead and untrusted across the entire API surface.
- **Enforcement**: In `apps/backend/src/middleware/tenantContext.ts`, any client header attempting to assert tenant identity is ignored.
- **Tenant Derivation**:
  1. For regular users (`SHOP_OWNER`, `STAFF`): Derived solely from verified JWT claims (`res.locals.auth.tenantId`).
  2. For `SUPER_ADMIN`: Derived strictly via an active, validated `SupportSession` authenticated by `x-support-session-token`.
  3. For `CUSTOMER`: Scoped to `customerId` through `ShopCustomerLink`.

### 1.2. Dual-Layer Isolation
1. **Application Scoping**: All Prisma queries include `{ where: { tenantId } }`.
2. **PostgreSQL Row-Level Security (RLS)**: Activated with `FORCE ROW LEVEL SECURITY` on all tenant tables, parameterized per transaction with `set_config('app.tenant_id', ..., true)`.

---

## 2. Super Admin Support Session Architecture

### 2.1. Principle of Least Privilege
Super Admins do not have ambient or wildcard access to tenant databases or endpoints. All access requires a dedicated `SupportSession`:

- **Token Security**:
  - Tokens are 32-byte cryptographically secure random values formatted as `darzi_sup_<64-hex>`.
  - Tokens are never stored in plaintext in PostgreSQL; only their SHA-256 hash is persisted.
  - The plaintext token is shown only once upon creation.
- **Default Scope**: `READ_ONLY`.
  - Under `READ_ONLY`, any HTTP state mutation (`POST`, `PUT`, `PATCH`, `DELETE`) is rejected with `403 SUPPORT_READ_ONLY`.
- **Audited Elevation**:
  - Elevating to `READ_WRITE` requires explicit business justification recorded in the platform audit log.
- **Time Limits**:
  - Sessions automatically expire (default: 1 hour, maximum: 4 hours).
  - Can be revoked instantly via the Super Admin Control Plane.

---

## 3. Dynamic Server-Side Authorization & Permissions

### 3.1. Dynamic Permission Verification
- JWTs represent authentication context (`userId`, `role`, `tenantId`, `authzVersion`), **not** an immutable permissions contract.
- The `requirePermission(permission)` middleware queries server-side permission lists (or in-memory cache validated against DB `authzVersion`).
- When a user's permissions or archetype is updated, `invalidateUserPermissions(userId)` increments their DB `authzVersion`, immediately invalidating all cached permissions across the fleet.

---

## 4. Tenant Lifecycle & Suspension

### 4.1. Decoupled Lifecycle States
- `TenantLifecycleState`: `REGISTERED`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `ARCHIVED`.
- `SubscriptionStatus`: `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`.
- Suspending a tenant updates `tenant.lifecycleState = SUSPENDED` and `tenant.isActive = false`, without mutating billing subscription status.
- Suspended tenants immediately block staff/owner access with `403 TENANT_SUSPENDED`.
- End-customers can still view existing orders and invoices via the Customer Portal.

---

## 5. Centralized Audit Logging & Sensitive Data Redaction

### 5.1. Append-Only Audit Trail
- All administrative and governance actions are logged to `PlatformAuditLog`.
- Every audit entry captures: `actorUserId`, `actorRole`, `action`, `targetType`, `targetId`, `tenantId`, `reason`, `beforeData`, `afterData`, `ipAddress`, and `userAgent`.

### 5.2. Recursive Credential Redaction
All payload snapshots (`beforeData`, `afterData`) pass through `deepScrubSensitiveData` which recursively redacts matching sensitive keys (e.g. `password`, `token`, `secret`, `otp`, `cardnumber`, `cvv`) to `[REDACTED]`.

---

## 6. Concurrency Control & Idempotency

1. **Optimistic Locking**:
   - `Order.version` prevents lost updates. Concurrent or stale transitions fail with `409 CONFLICT`.
2. **Pessimistic Locking**:
   - Fabric inventory uses `SELECT ... FOR UPDATE` for atomic stock reservation and consumption.
3. **Idempotency**:
   - Critical billing and payment endpoints enforce `Idempotency-Key`, storing and replaying response payloads with `X-Idempotent-Replay: true`.

---

## 7. Security Test Suite

Comprehensive automated penetration and attack scenario tests are located in:
- `apps/backend/src/__tests__/security_and_super_admin.test.ts` (Zero trust, support sessions, lifecycle, permissions, optimistic locking, idempotency)
- `apps/backend/src/__tests__/penetration.test.ts` (Tenant isolation, SQL injection, parameter tampering)
- `apps/backend/src/__tests__/tenantIsolation.test.ts` (Cross-tenant boundary verification)
- `apps/backend/src/__tests__/rateLimiting.test.ts` (Brute-force protection & RFC headers)
