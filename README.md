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

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| **0** | Project foundation (this phase) | ✅ In progress |
| 1 | Authentication + tenant model | 🔜 |
| 2 | Core helpdesk entities (tickets, agents) | 🔜 |
| 3 | Multi-tenancy isolation | 🔜 |
# DarziDesk
