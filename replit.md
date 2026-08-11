# ToothHub PH

A dental SaaS platform for the Philippine market. Multi-tenant practice management, public clinic/dentist directories, online booking, and an installable PWA.

## Running the app

The Next.js web frontend runs from `apps/web`:

```bash
cd apps/web && npx next dev -p 5000
```

The workflow **"Start application"** handles this automatically. The app is served at port 5000.

## Project structure

```
apps/
  web/        # Next.js 14 App Router — public site, landing page, future PWA
  api/        # Fastify TypeScript API (not yet scaffolded)
packages/
  db/         # Drizzle ORM schema, migrations, DB client
  shared/     # Shared TypeScript enums, Zod schemas, FeatureKey constants
docs/         # Product spec, architecture, MVP plans, API contracts
scripts/      # Migration helpers and post-merge automation
```

## Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend** (planned): Fastify, TypeScript, Drizzle ORM, PostgreSQL
- **Auth** (planned): Better Auth
- **Design**: Tonik-inspired — violet palette, rounded cards, pill buttons

## Key docs (read before major changes)

- `docs/README.md` — product overview and domain rules
- `docs/replit.md` — Replit agent instructions (full architecture + migration workflow)
- `docs/MVP_1.md` — MVP 1 scope
- `docs/PRODUCT_SPEC.md` — full product spec

---

## Database & Migrations

### Stack
- **ORM**: Drizzle ORM — schema in `packages/db/src/schema/`
- **Migrations**: Drizzle Kit — SQL files in `packages/db/migrations/`
- **Driver**: postgres.js
- **Database**: Replit PostgreSQL — `DATABASE_URL` from Replit Secrets

### Schema overview
| File | Tables |
|---|---|
| `clinics.ts` | `clinics` |
| `branches.ts` | `branches` |
| `dentists.ts` | `dentists`, `dentist_branch_assignments` |
| `users.ts` | `users`, `clinic_memberships` |
| `patients.ts` | `patients`, `patient_medical_histories` |
| `appointments.ts` | `services`, `appointments`, `appointment_status_history` |
| `subscriptions.ts` | `packages`, `package_features`, `clinic_subscriptions`, `clinic_feature_overrides` |
| `audit.ts` | `audit_events` |

### Workflow — for every schema change
```
1. Edit packages/db/src/schema/<entity>.ts
2. npm run db:generate          ← creates .sql in packages/db/migrations/
3. Review the generated SQL
4. git commit the schema + migration file together
5. Push / merge on Replit
6. post-merge.sh runs automatically → applies migration to Replit PostgreSQL
```

### Golden rules
- **Never hand-edit** a migration file that has already been applied.
- **Never bypass drizzle-kit** with raw SQL on the shared DB.
- **Always commit the `.sql` file** alongside the schema change — it is the source of truth.
- **Use `FeatureKey`** from `@toothhub/shared` for entitlement checks, never plan names.
- **Filter by `clinic_id`** on every tenant-scoped query.

### Getting DATABASE_URL locally (VS Code / Codex)
1. Copy `DATABASE_URL` from Replit Secrets
2. Paste into your local `.env` file (see `.env.example`)
3. Never commit `.env`

### Commands
```bash
npm run db:generate   # generate migration from schema diff
npm run db:migrate    # apply pending migrations
npm run db:studio     # open Drizzle Studio UI
./scripts/generate-migration.sh   # guided migration generator
./scripts/apply-migrations.sh     # apply migrations with checks
```

### Post-merge automation
`scripts/post-merge.sh` is Replit's registered post-merge script. After every merge it runs `npm install` then `drizzle-kit migrate` — no manual step needed on Replit.

---

## LOGS.md — keep it current

`LOGS.md` (root) is the running record of everything built, in progress, and queued.

**Update it after every task or session that changes the project:**
- Move completed items into the **Completed** section with a short summary.
- Update the **Queued** table to reflect the latest task states.
- Add new entries to **Known Gaps / Tech Debt** if anything was deferred.
- Update the **Reference** section if credentials, prefixes, or scripts change.

Do not skip this step — future agents (and humans) rely on `LOGS.md` as the first place to understand current project state.

---

## User preferences

- Landing page design theme: similar to tonikbank.com (bold colors, rounded cards, playful but professional)
- Primary color: violet (#7c3aed)
- Accent: purple gradient
