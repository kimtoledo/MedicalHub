# Dentra.ph - Codex Repository Instructions

## Purpose
These instructions apply to Codex working in the Dentra.ph repository.

For frontend and PWA work, read and follow `BRANDING.md`. Do not introduce a competing visual system without explicit approval.

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

## Database & Migrations

### Stack
- `packages/db/src/schema/` — Drizzle ORM table definitions (one file per entity)
- `packages/db/migrations/` — generated SQL migration files (source of truth)
- `packages/db/drizzle.config.ts` — points to `process.env.DATABASE_URL`
- `packages/shared/src/enums.ts` — `FeatureKey`, `AuditAction`, role enums
- `packages/shared/src/schemas.ts` — shared Zod validation schemas

### Required workflow for every schema change
```bash
# 1. Edit schema in packages/db/src/schema/<entity>.ts
# 2. Generate the migration
npm run db:generate
# 3. Review packages/db/migrations/<new-file>.sql
# 4. Commit BOTH the schema change AND the migration file
git add packages/db/src/schema/ packages/db/migrations/
git commit -m "db: <what changed and why>"
# 5. Push — on Replit, post-merge.sh applies it automatically
```

### Golden rules — must not violate
1. **Never hand-edit a migration file** that has been applied to any shared environment.
2. **Never run raw `ALTER TABLE`** against the shared Replit DB — always go through `drizzle-kit migrate`.
3. **Always commit the generated `.sql`** before merging. A schema change without its migration file will break the DB on merge.
4. **Use `FeatureKey` values** from `@dentra/shared` for entitlement checks — never compare plan names.
5. **Filter every tenant-scoped query by `clinic_id`** — never return records across clinic boundaries.

### Getting DATABASE_URL for local dev
- Replit: already set as a Replit Secret — no action needed.
- VS Code / local: copy the value from Replit Secrets → paste into `.env` (never commit `.env`).
- Codex: set `DATABASE_URL` as an environment variable in your Codex session.

### Useful commands
```bash
npm run db:generate    # diff schema → emit new migration SQL
npm run db:migrate     # apply pending migrations (idempotent)
npm run db:studio      # open Drizzle Studio browser UI
```

## Coding style
- TypeScript strict.
- Avoid `any` unless justified at a narrow boundary.
- Prefer explicit domain services over database calls scattered in route handlers.
- Use transactions for multi-write clinical/financial workflows.
- Use database constraints in addition to application validation where possible.
- Keep reusable business rules in backend/domain packages, not React components.
