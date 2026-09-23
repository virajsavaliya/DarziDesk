# DarziDesk

Multi-tenant SaaS helpdesk platform — monorepo.

## Repository Structure

```
darzi-desk/
├── apps/
│   ├── backend/     # Node.js + Express + TypeScript + Prisma
│   └── frontend/    # React + Vite + TypeScript + Tailwind CSS
├── packages/
│   └── types/       # Shared TypeScript types
├── .github/
│   └── workflows/
│       └── ci.yml   # Lint + typecheck + build on every PR
└── docker-compose.yml
```

## Prerequisites

- **Node.js** 20 LTS ([nvm](https://github.com/nvm-sh/nvm) recommended — `.nvmrc` present)
- **Docker Desktop** (for local PostgreSQL)
- **npm** 10+

## Local Setup

### 1. Use the correct Node version

```bash
nvm use   # reads .nvmrc → Node 20
```

### 2. Start PostgreSQL

```bash
docker compose up -d
# Postgres available at localhost:5432
# DB: darzi_desk_dev | User: darzi | Password: darzi_secret
```

### 3. Install all dependencies

```bash
npm install   # installs all workspaces from root
```

### 4. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
# The default values match the docker-compose service — no edits needed for local dev
```

### 5. Run database migrations

```bash
npm run db:migrate --workspace=apps/backend
# Creates/applies Prisma migrations and generates the client
```

### 6. Start the backend

```bash
npm run dev:backend
# Express API on http://localhost:3001
# Health check: curl http://localhost:3001/api/health
```

### 7. Start the frontend

```bash
npm run dev:frontend
# Vite dev server on http://localhost:5173
```

## Available Scripts (root)

| Script | Description |
|---|---|
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run dev:backend` | Start backend in dev mode |
| `npm run dev:frontend` | Start frontend in dev mode |

## Health Check

```bash
curl http://localhost:3001/api/health
# { "status": "ok", "timestamp": "...", "uptime": 12.34 }
```

## CI

GitHub Actions runs on every PR to `main`:
- ESLint across all workspaces
- TypeScript type-check (`tsc --noEmit`)
- Build (`tsc` for backend, `vite build` for frontend)

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Demo & Default Login Credentials

All seeded test accounts share the same password: **`Password123!`**

Navigate to the login page at **[http://localhost:5173/login](http://localhost:5173/login)**.

### 🏢 1. Business Sign In (Shop Owner & Staff)

Use the **"Business"** tab on `/login`.

| Role | Shop URL (Slug) | Email (ID) | Password | Persona & Capabilities |
|---|---|---|---|---|
| **Shop Owner** | `demo` *(or `shree-ganesh-tailors`)* | `demo@gmail.com` *(or `owner@shreeganesh.com`)* | `demo123` *(or `Password123!`)* | **Ramesh Patel**: Full atelier owner dashboard, revenue analytics, orders Kanban, fabric inventory, staff management, invoices, and marketplace profile. |
| **Staff (Master Cutter)** | `demo` *(or `shree-ganesh-tailors`)* | `karan.cutter@shreeganesh.com` | `Password123!` | **Karan Sharma**: Digital measurement book, cutting table order milestones, cutter slips. |
| **Staff (Senior Stitcher)** | `demo` *(or `shree-ganesh-tailors`)* | `suresh.tailor@shreeganesh.com` | `Password123!` | **Suresh Mistry**: Task station, stitching milestones, garment quality checks. |
| **Staff (Fabric Consultant)** | `demo` *(or `shree-ganesh-tailors`)* | `priya.sales@shreeganesh.com` | `Password123!` | **Priya Dave**: Customer intake, fabric ledger lookup, order creation. |

---

### 🛡️ 2. Platform Super Admin

Use the **"Business"** tab on `/login` (Shop URL can be left as `admin` or any slug).

| Role | Email (ID) | Password | Capabilities |
|---|---|---|---|
| **Super Admin** | `admin@darzidesk.com` | `Password123!` | **Karan Singhania**: Platform-wide tenant management, subscription tier oversight, marketplace atelier approvals, and review moderation. |

---

### 👤 3. Customer Portal Accounts

Use the **"Customer"** tab on `/login` (no shop URL needed).

| Customer Name | Email (ID) | Password | Portal Features |
|---|---|---|---|
| **Amit Verma** | `amit.verma@example.com` | `Password123!` | View active tailoring orders, digital measurement profile, invoices, and live tracking. |
| **Rajesh Mehta** | `rajesh.mehta@example.com` | `Password123!` | Marketplace orders, garment status notifications, invoice receipts. |
| **Vikramaditya Roy** | `vikram.roy@example.com` | `Password123!` | Custom bespoke suits, measurement history, and order trial schedules. |

---

### 💡 Quick Dev Mode Switching

In development mode, you can also switch between demo personas instantly using the **demo user dropdown** in the dashboard top navigation bar, or seed fresh sample data anytime via:

```bash
npm run db:reset-and-seed --workspace=apps/backend
```

