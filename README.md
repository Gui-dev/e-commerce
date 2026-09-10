# KronoStore

Full-stack e-commerce learning project built with modern TypeScript tools.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Node.js, Fastify, TypeScript |
| Frontend | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL, Drizzle ORM |
| Cache | Redis, BullMQ |
| Auth | Better Auth |
| Payments | Stripe (card, PIX, boleto) |
| Storage | MinIO (S3-compatible) |
| Validation | Zod + @fastify/type-provider-zod |
| Linting | Biome |
| Testing | Vitest (unit), Playwright (e2e) |
| CI/CD | GitHub Actions |
| Monorepo | Turborepo, pnpm |

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL, Redis, MinIO (or use the infra scripts)
- Stripe CLI (for webhook forwarding)

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO, Mailpit)
pnpm infra:up

# Create database schema
pnpm db:push

# Seed catalog data (products, categories, coupons)
pnpm db:seed

# Start development servers (API on :3001, Web on :3000)
pnpm dev
```

### Stripe Webhooks

Card payments require the Stripe CLI to forward webhook events:

```bash
pnpm stripe:listen
```

This forwards events to `http://localhost:3001/webhooks/stripe`. The signing secret is in `apps/api/.env` as `STRIPE_WEBHOOK_SECRET`.

## Project Structure

```
kronostore/
├── apps/
│   ├── api/                # Fastify API
│   │   └── src/
│   │       ├── modules/    # Feature modules (hexagonal architecture)
│   │       ├── lib/        # Shared infra (db, redis, auth, mailer, storage)
│   │       └── routes/     # Route registration
│   └── web/                # Next.js storefront
│       └── src/
│           ├── app/        # App Router pages
│           ├── components/ # React components
│           ├── stores/     # Zustand stores
│           └── lib/        # Utilities, API client, Stripe
├── packages/
│   └── shared/             # Shared utilities (slug, etc.)
└── docs/                   # Plans and documentation
```

### API Architecture (Hexagonal)

Each module under `apps/api/src/modules/` follows:

```
{module}/
├── domain/          # Entities, repository contracts, errors
├── infra/           # Repository implementations (in-memory, Drizzle)
├── use-cases/       # Business logic (one file per use-case)
├── schemas/         # Zod validation schemas
└── routes/          # Fastify route definitions
```

## Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:api                # API only (port 3001)
pnpm dev:web                # Frontend only (port 3000)

# Build
pnpm build                  # Build all packages

# Testing
pnpm --filter @kronostore/api test          # API unit tests
pnpm --filter @kronostore/web test          # Frontend unit tests
pnpm --filter @kronostore/web test:e2e      # Playwright e2e tests

# Linting
pnpm lint                   # Biome check
pnpm format                 # Biome fix + format

# Database
pnpm db:push                # Push schema changes
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed catalog data
pnpm db:studio              # Open Drizzle Studio

# Infrastructure
pnpm infra:up               # Start services (podman/docker)
pnpm infra:down             # Stop services

# Payments
pnpm stripe:listen          # Forward Stripe webhooks
```

## Testing

- **API**: Unit tests co-located with use-cases (`*.spec.ts`), integration tests use in-memory repositories
- **Frontend**: Component tests (`*.spec.tsx`), hook tests (`*.spec.ts`), MSW for API mocking
- **E2E**: Playwright tests in `apps/web/tests/e2e/`, uses `db:seed --clean` in global setup

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs 4 parallel jobs:

- **Lint** - Biome check across all packages
- **Typecheck** - TypeScript type checking (API + Next.js typegen)
- **Unit Tests** - API tests with PostgreSQL/Redis services, frontend tests
- **Build** - Full production build
