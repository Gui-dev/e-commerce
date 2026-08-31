# Testing — Repository Adaptations

Project-specific deviations from the generic skills:
- API: [`docs/skills/TESTING_API_GUIDELINE.md`](./skills/TESTING_API_GUIDELINE.md)
- Frontend: [`docs/skills/TESTING_FRONTEND_GUIDELINE.md`](./skills/TESTING_FRONTEND_GUIDELINE.md)

This file records how each skill maps to this repository.

## Deviations

1. **Test file suffix:** `.spec.ts` (not `.test.ts`) — unit tests co-located at `apps/api/src/**/*.spec.ts`; integration tests at `apps/api/tests/integration/*.spec.ts`.
2. **Location:** unit tests are co-located with the files they test (same directory, same base name). Integration tests (Testcontainers, full HTTP) are centralized in `apps/api/tests/integration/`.
3. **Scope:** the pattern applies only to domain modules we write (`modules/<domain>/` with `domain/` contract, `infra/` implementations, `use-cases/`). Persistence owned by Better Auth (organizations, members, sessions) stays outside the pattern.
4. **Production repositories:** `Drizzle*Repository` classes are not unit-tested — they are covered by integration tests (`pnpm --filter @pm/api test:integration`), which exercise routes + real SQL.
5. **Shared contract suites:** when both in-memory and Drizzle implementations exist, a shared `*-contract-test.ts` file is written once and called by both the unit spec (in-memory) and integration spec (Drizzle), ensuring identical behavior.

## Commands

```bash
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock   # podman socket for Testcontainers

pnpm test                                # unit suite (turbo)
pnpm --filter @pm/api test:unit          # unit only (vitest run src)
pnpm --filter @pm/api test:integration   # integration (spins Postgres/Redis containers)
pnpm --filter @pm/web test:e2e           # e2e (requires compose stack + pnpm dev running)
pnpm --filter @pm/api test:coverage      # coverage report with threshold enforcement
```

## Reference Implementation

The pattern is implemented in `apps/api/src/modules/organizations/`:

```
modules/organizations/
├── domain/
│   ├── organization-member.ts            # OrgMember types + OrganizationsRepositoryContract
│   └── organization-member.spec.ts       # co-located domain tests (if any)
├── infra/
│   ├── drizzle-organization-repository.ts
│   ├── in-memory-organization-repository.ts
│   ├── in-memory-organization-repository.spec.ts   # co-located + shared contract suite
│   └── organizations-repository.contract-test.ts   # shared contract assertions
└── use-cases/
    ├── list-organization-members.use-case.ts
    └── list-organization-members.use-case.spec.ts  # co-located
```

---

## Frontend Testing

Guideline: [`docs/skills/TESTING_FRONTEND_GUIDELINE.md`](./skills/TESTING_FRONTEND_GUIDELINE.md)

### Deviations

1. **E2E only (current state):** the web app currently has only Playwright E2E tests. Unit/component testing (Vitest + RTL + MSW) is not yet installed — the guideline documents the target setup for when it is added.
2. **E2E test location:** `apps/web/tests/e2e/*.spec.ts` (centralized, per Playwright convention).
3. **E2E helpers:** `apps/web/tests/e2e/helpers/mailpit.ts` — polls MailPit API for emails, extracts verification/reset links. Used across all E2E specs.
4. **Base URL:** E2E tests run against `http://localhost:3000` (Next.js dev server). The API at `http://localhost:3001` must be running.
5. **Auth in E2E:** tests create users through the UI (sign-up flow + email verification via MailPit) — no programmatic auth seeding.

### Commands

```bash
pnpm --filter @pm/web test:e2e           # playwright test (requires compose stack + pnpm dev)
pnpm --filter @pm/web test:unit          # vitest run src (not yet configured — see guideline)
```

### Reference

E2E tests: `apps/web/tests/e2e/auth.spec.ts`, `apps/web/tests/e2e/organizations.spec.ts`
Helpers: `apps/web/tests/e2e/helpers/mailpit.ts`
Config: `apps/web/playwright.config.ts`
