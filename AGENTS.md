# KronoStore - Agent Instructions

## Project Overview

KronoStore is a full-stack e-commerce learning project built with:
- **API**: Node.js/Fastify with TypeScript
- **Frontend**: Next.js with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis with BullMQ
- **Auth**: Better Auth
- **Storage**: MinIO (S3-compatible)
- **Validation**: Zod with @fastify/type-provider-zod
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Monorepo**: Turborepo

## Architecture

Hexagonal Architecture (Ports & Adapters):
- `domain/` - Entities, repository contracts, business errors
- `infra/` - Repository implementations (in-memory for tests, Drizzle for production)
- `use-cases/` - Business logic (one use-case per file)
- `routes/` - Fastify route definitions
- `schemas/` - Zod validation schemas

## Code Conventions

### Naming
- Files: `kebab-case.ts`
- Types/Interfaces: `PascalCase`
- Functions/Variables: `camelCase`
- Use-case classes: `VerbNounUseCase` (e.g., `CreateProductUseCase`)
- Domain errors: `ModuleNameError` extending `DomainError`

### File Structure
```
src/modules/{module}/
├── domain/
│   ├── {entity}.ts           # Types, errors
│   └── {entity}-repository.ts # Repository contract + re-exports
├── infra/
│   └── in-memory-{entity}-repository.ts
├── use-cases/
│   ├── {verb}-{noun}.use-case.ts
│   └── {verb}-{noun}.use-case.spec.ts
├── schemas/
│   └── {entity}.schema.ts    # Zod schemas
└── routes/
    └── index.ts              # Fastify routes
```

### Validation
- Use Zod schemas for route validation (body, params, query, headers)
- Use `app.withTypeProvider<ZodTypeProvider>()` in routes
- Remove manual validation from use-cases (Zod handles it)

### Testing (API)
- Unit tests: Co-located with use-cases, suffix `.spec.ts`
- Integration tests: Use in-memory repositories
- Run tests: `pnpm --filter @kronostore/api test`
- Run typecheck: `pnpm --filter @kronostore/api typecheck`

### Testing (Frontend)
- Unit tests: Co-located with components, suffix `.spec.tsx`
- Hook tests: Co-located with hooks, suffix `.spec.ts`
- E2E tests: Centralized in `tests/e2e/`
- MSW for API mocking at network boundary
- Run tests: `pnpm --filter @kronostore/web test`
- Run E2E: `pnpm --filter @kronostore/web test:e2e`

### Git Commits
- Use Conventional Commits in English
- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`
- Scope: module name (e.g., `products`, `cart`, `orders`)
- Commit at each relevant function/feature completion

## Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:api                # Start API only
pnpm dev:web                # Start frontend only

# Testing
pnpm test                   # Run all tests
pnpm --filter @kronostore/api test        # API tests
pnpm --filter @kronostore/api typecheck   # Type checking

# Linting
pnpm lint                   # Check lint
pnpm format                 # Fix lint + format

# Database
pnpm db:push                # Push schema changes
pnpm db:migrate             # Run migrations
pnpm db:studio              # Open Drizzle Studio

# Infrastructure
pnpm infra:up               # Start PostgreSQL, Redis, MinIO, Mailpit
pnpm infra:down             # Stop infrastructure
```

## Current Status

### Completed
- Foundation (Task 1): Monorepo, API skeleton, DB schema, auth, middleware
- Catalog (Task 2): Products, categories, variants, stock, images
- Cart & Checkout (Task 2.5): Cart, coupons, checkout
- Payments & Orders (Task 3): Payment simulation, webhooks
- Async Processing (Task 4): BullMQ workers, email, webhooks
- Admin Panel (Task 5): Admin routes and UI
- Frontend (Task 6): Next.js customer storefront

### In Progress
- (none)

### Pending
- (none)
