# DarziDesk Architecture & Development Reference

This document serves as the canonical technical reference for DarziDesk. Refer to this document during future missions instead of re-scanning the entire codebase.

---

## 1. Monorepo & Directory Structure

DarziDesk is structured as an npm workspaces monorepo:

```
Darzi_desk/
├── apps/
│   ├── backend/                     # Express + TypeScript + Prisma + PostgreSQL
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema definitions & enums
│   │   │   └── migrations/          # Versioned SQL migrations (includes RLS)
│   │   ├── src/
│   │   │   ├── app.ts               # Express application configuration & router mounting
│   │   │   ├── index.ts             # Server entrypoint (Port 3001)
│   │   │   ├── lib/                 # Core system infrastructure
│   │   │   │   ├── prisma.ts        # Prisma singleton + withTenantContext (RLS)
│   │   │   │   └── logger.ts        # Pino logging configuration
│   │   │   ├── middleware/          # Security, auth, error handling
│   │   │   │   ├── authenticate.ts  # JWT verification (Staff vs Customer)
│   │   │   │   ├── rbac.ts          # Role-based access control (OWNER, STAFF)
│   │   │   │   ├── errorHandler.ts  # Centralized AppError handling
│   │   │   │   ├── validate.ts      # Zod request validation middleware
│   │   │   │   └── rateLimiter.ts   # IP & credential rate limiting
│   │   │   ├── modules/             # Domain modules
│   │   │   │   ├── auth/            # Staff & Customer authentication, password reset
│   │   │   │   ├── customers/       # Customer records & ShopCustomerLink management
│   │   │   │   ├── fabrics/         # Fabric inventory, stock rolls, transactions
│   │   │   │   ├── invoices/        # Pricing rules, invoice generation, payments, PDFKit
│   │   │   │   ├── measurements/    # Customer measurement profiles, versions, garment keys
│   │   │   │   ├── notifications/   # Decoupled notification engine & channel config
│   │   │   │   ├── orders/          # Core bespoke order state machine & staff queue
│   │   │   │   ├── portal/          # Customer-facing bespoke portal endpoints
│   │   │   │   ├── staff/           # Staff dashboard tasks & daily summary
│   │   │   │   └── dev/             # Dev-only demo session seeder (/api/dev/demo-session)
│   │   │   └── __tests__/           # Integration & unit test suites (Vitest)
│   ├── frontend/                    # Vite + React 19 + TypeScript + TailwindCSS v4
│   │   ├── src/
│   │   │   ├── App.tsx              # Application root, persona state, top-level routing
│   │   │   ├── index.css            # Design tokens, CSS variables, theme styles
│   │   │   ├── types/dashboard.ts   # Canonical frontend domain & API types
│   │   │   ├── components/
│   │   │   │   ├── layout/          # Sidebar (role-aware), Navbar
│   │   │   │   ├── common/          # Reusable UI primitives (StatusBadge, etc.)
│   │   │   │   ├── dashboard/       # Staff tailoring queue & order details drawer
│   │   │   │   ├── invoices/        # Owner invoice list, payment modal, invoice drawer
│   │   │   │   └── portal/          # Customer portal (Orders, Catalog, Measurements, Invoices)
└── docs/
    ├── design.md                    # Single source of truth for UI/UX & design tokens
    └── architecture.md              # Architectural & domain guidelines
```

---

## 2. Domain Locations & Responsibilities

| Domain | Backend Module Path | Key Router File | Key Schemas | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `src/modules/auth/` | `auth.router.ts` | `auth.schema.ts` | Staff login, customer OTP/portal auth, JWT signing/verifying (`darzi:staff` vs `darzi:customer`), rate limiting. |
| **Customers** | `src/modules/customers/` | `customer.router.ts` | `customer.schema.ts` | Phone-indexed customer directory, cross-tenant identity, `ShopCustomerLink` tracking. |
| **Fabrics** | `src/modules/fabrics/` | `fabric.router.ts` | `fabric.schema.ts` | Fabric catalog, meter tracking (`availableMeters`, `reservedMeters`), stock roll logs, purchase receipts. |
| **Orders** | `src/modules/orders/` | `order.router.ts` | `order.schema.ts` | Bespoke order lifecycle, order creation, fabric reservation, state transitions, status auditing. |
| **Invoices** | `src/modules/invoices/` | `invoice.router.ts` | `invoice.schema.ts` | Automatic price calculations, tax application, sequential numbering, manual payments, PDFKit invoice generation. |
| **Notifications** | `src/modules/notifications/` | `notification.router.ts` | `notification.schema.ts` | Decoupled event-triggered messages, channel dispatch (SMS/Email/WhatsApp), audit logging (`NotificationLog`). |
| **Portal** | `src/modules/portal/` | `portal.router.ts` | `portal.schema.ts` | Customer-facing APIs: public fabric catalog, customer order commission, cross-shop order/invoice aggregation. |
| **Measurements** | `src/modules/measurements/`| `measurement.router.ts` | `measurement.schema.ts` | Garment-specific measurement parameters, version history, tailor verification. |
| **Staff Queue** | `src/modules/staff/` | `staff.router.ts` | `staff.schema.ts` | Staff personal workbench, task assignment, daily summary KPIs. |

---

## 3. Tenant Isolation Pattern (Dual-Layer Defense)

DarziDesk strictly implements a **two-layer tenant isolation architecture**:

### Layer 1: Application-Level Scoping (`Prisma`)
- Every database query touching tenant-scoped models must explicitly filter by `where: { tenantId }`.
- `tenantId` is **ALWAYS** derived from the verified JWT payload (`res.locals.auth.tenantId`).
- **NEVER** accept `tenantId` from request parameters, request body, query strings, or client headers.

### Layer 2: Database-Level Row Level Security (`Postgres RLS`)
Implemented in `apps/backend/src/lib/prisma.ts` via `withTenantContext`:

```typescript
export async function withTenantContext<T>(
  tenantId: string | null,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (tenantId !== null) {
      // Transaction-local SET LOCAL configuration
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    return fn(tx);
  });
}
```

- **Postgres Tables with RLS Forced**:
  - `users`, `shop_customer_links`, `garment_templates`, `measurement_profiles`, `measurement_profile_versions`
  - `fabrics`, `fabric_stock_transactions`, `orders`, `order_status_logs`
  - `tenant_pricing_rules`, `invoices`, `invoice_payments`, `notification_logs`, `notification_configs`
- **Postgres Policy**:
  - `USING (tenant_id = current_setting('app.tenant_id', true))`
  - The `true` parameter makes `set_config` transaction-scoped, preventing connection pool cross-contamination.
- **Cross-Shop Aggregation Exception**:
  - In customer portal endpoints (`/api/portal/orders`, `/api/portal/invoices`), queries are scoped to the authenticated customer ID (`customerId`) joined with `ShopCustomerLink` to strictly ensure customer ownership across linked ateliers without data bleeding from unlinked shops.

---

## 4. Key Reusable Service Functions

Avoid creating duplicate business logic. Always reuse these core functions:

### 1. Order Creation & State Machine (`apps/backend/src/modules/orders/order.service.ts`)
- `createOrder(tenantId, staffUserId, input)`:
  - Validates garment and customer link.
  - Automatically invokes `reserveStock` on the selected fabric.
  - Generates an `Order` in `PLACED` status.
  - Writes the initial `OrderStatusLog`.
  - Dispatches an asynchronous `ORDER_PLACED` customer notification.
  - **Used By**: Both staff order creation and customer portal order placement.
- `transitionOrderStatus(tenantId, staffUserId, orderId, input)`:
  - Enforces valid transition paths (`PLACED` -> `MEASUREMENT_CONFIRMED` -> `CUTTING` -> `STITCHING` -> `QUALITY_CHECK` -> `READY` -> `DELIVERED`, or `CANCELLED`).
  - Upon transitioning to `CUTTING`, automatically calls `consumeReservedStock`.
  - Emits `ORDER_READY` notification when transitioning to `READY`.
  - Checks fabric `lowStockThreshold` and alerts the shop owner if stock is depleted.
- `listOrders(tenantId, query)`: Filtered, paginated order listing.
- `getOrderById(tenantId, orderId)`: Deep retrieval with status logs, customer, fabric, and measurements.

### 2. Fabric Inventory Management (`apps/backend/src/modules/fabrics/fabric.service.ts`)
- `reserveStock(tx, tenantId, fabricId, orderId, meters, userId)`:
  - Decrements `availableMeters`, increments `reservedMeters`.
  - Inserts a `RESERVATION` transaction record.
  - Fails if `availableMeters < meters`.
- `consumeReservedStock(tx, tenantId, fabricId, orderId, meters, userId)`:
  - Decrements `reservedMeters`.
  - Inserts a `CONSUMPTION` transaction record.
  - Checks `lowStockThreshold` and returns alert flag.
- `releaseReservedStock(tx, tenantId, fabricId, orderId, meters, userId)`:
  - Reverts reservation on order cancellation (increments `availableMeters`, decrements `reservedMeters`).
  - Inserts a `CANCELLATION_RELEASE` transaction record.
- `adjustStock(tenantId, fabricId, meters, reason, userId)`:
  - Manual stock reconciliation for damage or audit discrepancies.
- `recordPurchase(tenantId, fabricId, meters, costPerMeter, supplier, invoiceRef, userId)`:
  - Adds meters to `availableMeters` and logs a `PURCHASE` transaction.

### 3. Invoicing Engine (`apps/backend/src/modules/invoices/invoice.service.ts`)
- `createInvoiceForOrder(tenantId, staffUserId, orderId)`:
  - Fetches garment stitching charge from `TenantPricingRule` (or garment default).
  - Calculates fabric cost from order `metersUsed * fabric.pricePerMeter`.
  - Computes tax using `tenant.taxRatePercent`.
  - Generates a sequential invoice number: `INV-YYYYMM-XXXX`.
  - Emits `INVOICE_GENERATED` notification.
- `recordPayment(tenantId, staffUserId, invoiceId, input)`:
  - Records payment with method: `CASH`, `UPI_MANUAL`, `BANK_TRANSFER` (and forward-compatible `GATEWAY`).
  - Calculates updated `paidAmount` and `balanceDue`.
  - Transitions invoice status (`ISSUED` -> `PARTIALLY_PAID` -> `PAID`).
  - Emits `PAYMENT_RECORDED` notification.
- `generateInvoicePdfBuffer(tenantId, invoiceId)` (`pdf/invoicePdf.ts`):
  - Streams a clean, branded PDF invoice document using PDFKit.

### 4. Notification Engine (`apps/backend/src/modules/notifications/notification.service.ts`)
- `notify(tenantId, customerId, template, payload, options)`:
  - Non-blocking post-transaction event notification.
  - Logs every attempt in `NotificationLog` (`QUEUED`, `SENT`, or `FAILED`).
  - Respects shop owner notification preferences (`smsEnabled`, `emailEnabled`, `whatsappEnabled`).

---

## 5. UI/UX & Component Guidelines

### Source of Truth: `docs/design.md`
All frontend development **MUST** adhere strictly to `docs/design.md`.

- **Color Tokens**:
  - `bg-brand` (`#1A365D` - Deep Atelier Navy)
  - `bg-accent` (`#D97706` - Warm Ochre Gold)
  - `bg-surface` (`#FFFFFF` in light mode, `#1E293B` in dark mode)
  - `bg-background` (`#F8FAFC` in light mode, `#0F172A` in dark mode)
  - `border-border` (`#E2E8F0` / `#334155`)
  - `text-text-primary` (`#0F172A` / `#F8FAFC`)
  - `text-text-secondary` (`#475569` / `#94A3B8`)
- **Status Badges (`apps/frontend/src/components/common/StatusBadge.tsx`)**:
  - Never style order or invoice status badges inline with arbitrary colors.
  - Always use `<StatusBadge status={order.status} />` or predefined `STATUS_CONFIG` / `INVOICE_STATUS_CONFIG` mappings.
- **Garment Types**:
  - Enum: `SHIRT`, `PANT`, `KURTA`, `TSHIRT`, `CUSTOM`.
- **User Roles & Personas**:
  - `SHOP_OWNER`: Full administrative access (orders, fabrics, invoices, staff, settings).
  - `STAFF`: Focused tailor workspace (`tasks`, `orders`, `customers`, `measurements`).
  - `CUSTOMER`: Bespoke customer portal (`orders`, `catalog`, `measurements`, `invoices`).

---

## 6. Testing & Quality Standards

- **Backend Unit & Integration Tests**: Run with `npx vitest run`.
- **Database Migrations**: When changing models in `schema.prisma`, always generate a named migration and apply it to both `darzi_desk_dev` and `darzi_desk_test` Postgres instances.
- **Frontend Build Validation**: Always run `npm run build` (`tsc -b && vite build`) in `apps/frontend` before declaring any frontend task complete to guarantee strict TypeScript compliance.
