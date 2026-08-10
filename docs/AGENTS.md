# ToothHub PH - Codex Repository Instructions

## Purpose
These instructions apply to Codex working in the ToothHub PH repository.

Read before major work:
- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_PRIVACY.md`
- relevant MVP and module documents

## Architecture expectations
- pnpm monorepo.
- Next.js/TypeScript frontend under `apps/web`.
- Fastify/TypeScript API under `apps/api`.
- PostgreSQL + Drizzle under `packages/db`.
- Shared Zod schemas/types under `packages/shared`.
- Vendor services are behind adapters.
- APIs are versioned under `/v1`.

## Data invariants
- Clinics, branches, dentists, users, patients, and subscriptions are distinct.
- Dentist-to-clinic/branch is many-to-many through assignments.
- Tenant-owned records have explicit tenant ownership.
- Patient/clinical data does not cross tenants by default.
- Plan/package names are not authorization rules. Use entitlement keys.
- Important clinical/admin/financial actions create audit records.

## Security invariants
- All protected reads/writes require server-side authz.
- Never accept client-supplied tenant IDs as authority.
- Never place protected files in public storage.
- Never log clinical payloads, secrets, tokens, or full private objects.
- Super Admin has platform control but no automatic routine clinical access.
- MVP 1/2 PWA is online-first for clinical data.
- Public booking endpoints require validation, rate limiting, and conflict protection.

## Work method
1. Inspect current code and docs.
2. State assumptions and affected routes/tables/services.
3. Make a focused change.
4. Add/update tests.
5. Run repository-defined lint, typecheck, tests, and build.
6. For schema changes, generate and review migrations.
7. Report tenant/security implications and remaining risk.

## Coding style
- TypeScript strict.
- Avoid `any` unless justified at a narrow boundary.
- Prefer explicit domain services over database calls scattered in route handlers.
- Use transactions for multi-write clinical/financial workflows.
- Use database constraints in addition to application validation where possible.
- Keep reusable business rules in backend/domain packages, not React components.
