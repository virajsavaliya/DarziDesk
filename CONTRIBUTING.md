# Contributing to DarziDesk

Thank you for your interest in contributing to **DarziDesk**! We welcome contributions from developers, designers, and tailoring industry practitioners of all experience levels.

Please review this document before submitting your contribution to ensure an efficient and consistent workflow.

---

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

---

## Getting Started

### 1. Fork & Clone

1. Fork the repository on GitHub: [`https://github.com/virajsavaliya/DarziDesk`](https://github.com/virajsavaliya/DarziDesk)
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/DarziDesk.git
   cd DarziDesk
   ```

### 2. Environment Setup

1. Use Node.js 20 LTS:
   ```bash
   nvm use
   ```
2. Install monorepo dependencies:
   ```bash
   npm install
   ```
3. Set up the development database:
   ```bash
   # Start local PostgreSQL via Docker
   docker compose up -d

   # Or ensure local PostgreSQL is running on localhost:5432
   cp apps/backend/.env.example apps/backend/.env

   # Generate Prisma client and synchronize schema
   npm run db:generate --workspace=apps/backend
   npx prisma db push --schema=apps/backend/prisma/schema.prisma

   # Seed development workflow data
   npx tsx apps/backend/src/scripts/reset_and_seed.ts
   ```

---

## Development Workflow

### Branch Naming Conventions

Create a topic branch from `main` using standard prefixes:
- `feat/add-fabric-qr-scanning`
- `fix/measurement-outseam-validation`
- `docs/update-architecture-guide`
- `perf/optimize-kanban-drag-drop`
- `refactor/modularize-billing-service`

### Commits & Git Messages

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` Introduces a new feature or user capability
- `fix:` Patches a bug or regression
- `docs:` Changes or additions to documentation
- `refactor:` Code restructuring without behavioral changes
- `perf:` Performance improvements
- `test:` Adding or updating test suites
- `chore:` Dependency updates, config tweaks, tooling changes

*Example:* `feat(measurements): add 3D silhouette landmark hover indicator`

---

## Code Standards & Monorepo Structure

DarziDesk is structured as an npm workspaces monorepo:
- `apps/backend`: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL RLS.
- `apps/frontend`: React 19, TypeScript, Vite, Tailwind CSS v4.
- `packages/types`: Canonical cross-stack TypeScript contracts.

### Architectural Rules
1. **Tenant Isolation**: Never bypass `withTenantContext` or omit `where: { tenantId }` in tenant queries. Do not accept client-supplied `x-tenant-id` headers.
2. **Type Safety**: Strictly avoid `any`. Define and export interfaces in `packages/types` when shared across backend and frontend.
3. **Validation**: All API endpoints must enforce Zod schema validation via `validateRequest` middleware.
4. **Design Tokens**: Follow `docs/design.md` for UI tokens, color palettes, and typography.

---

## Quality Checklist Before Submitting a PR

Run all validation scripts from the root directory:

```bash
# 1. Typecheck all workspaces
npm run typecheck

# 2. Lint all workspaces
npm run lint

# 3. Run test suites
npm run test --workspace=apps/backend

# 4. Verify production build
npm run build
```

---

## Submitting Pull Requests

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `virajsavaliya/DarziDesk`.
3. Fill out the provided [Pull Request Template](.github/pull_request_template.md).
4. Ensure all GitHub Actions CI checks pass.
5. Address any code review feedback respectfully.

---

## Need Help?

If you encounter any issues or have questions:
- Open a GitHub Issue for bug reports or feature requests.
- Contact the maintainer: **Viraj Savaliya** ([virajsavaliya@gmail.com](mailto:virajsavaliya@gmail.com)).
