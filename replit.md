# Dentra.ph

For frontend and PWA work, read and follow `docs/BRANDING.md`. Do not introduce a competing visual system without explicit approval.

A dental SaaS platform for the Philippine market. Multi-tenant practice management, public clinic/dentist directories, online booking, and an installable PWA.

## Running the app

The Next.js web frontend runs from `apps/web`:

```bash
cd apps/web && npx next dev -p 5000
```

The workflow **"Start application"** handles this automatically. The app is served at port 5000.

The Fastify API runs separately:

```bash
npm run api:dev
```

The workflow **"Start API"** handles this automatically. The API is served at port 3001.

## Project structure

```
apps/
  web/        # Next.js 14 App Router — public site, clinic app, Super Admin, PWA
  api/        # Fastify 5 TypeScript API — live, served at port 3001
    src/
      app.ts          # Fastify app factory
      server.ts       # Entry point — wires services, starts server
      config.ts       # Environment config
      database.ts     # Drizzle DB client
      auth/           # Better Auth setup, session helpers, authorization guards
      admin/          # Super Admin service (clinic CRUD, status, branches)
      clinic/         # Clinic-scoped services: billing, prescriptions, files,
                      #   encounters, patients, AI assistance, remote consults, HMO
      routes/         # Fastify route registrations (one file per domain)
      ai/             # AI provider client wrappers
    test/           # Vitest test suite (unit + service-layer tests)
packages/
  db/         # Drizzle ORM schema, migrations, DB client
  shared/     # Shared TypeScript enums (FeatureKey, ClinicRole, AuditAction, …),
              #   Zod schemas, SubscriptionStatus, InvoiceStatus, PaymentMethod
docs/         # Product spec, architecture, MVP plans, API contracts
scripts/      # Migration helpers and post-merge automation
```

### Stack
- **ORM**: Drizzle ORM — schema in `packages/db/src/schema/`
- **Migrations**: Drizzle Kit — SQL files in `packages/db/migrations/`
- **Driver**: postgres.js
- **Database**: Replit PostgreSQL — `DATABASE_URL` from Replit Secrets

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

| Schema file | Tables / columns of note |
|---|---|
| `clinics.ts` | `clinics` |
| `branches.ts` | `branches` |
| `dentists.ts` | `dentists`, `dentist_branch_assignments` |
| `users.ts` | `users`, `clinic_memberships` |
| `auth.ts` | `accounts`, `sessions`, `verifications` (Better Auth) |
| `patients.ts` | `patients`, `patient_medical_histories`, `patient_dental_histories` |
| `appointments.ts` | `services` (+ `price_php`, `is_hmo_covered`, `hmo_standard_rate_php`), `appointments`, `appointment_status_history` |
| `subscriptions.ts` | `packages`, `package_features`, `clinic_subscriptions`, `clinic_feature_overrides` |
| `audit.ts` | `audit_events` |
| `encounters.ts` | `encounters`, `treatment_records` |
| `odontogram.ts` | `odontogram_events` |
| `billing.ts` | `invoices`, `invoice_line_items`, `invoice_payments` |
| `prescriptions.ts` | `prescriptions`, `prescription_items` |
| `clinical-files.ts` | `clinical_files` (Object Storage metadata) |
| `ai-interactions.ts` | `ai_interactions` |
| `remote-assessments.ts` | `remote_assessments` (private photo metadata stored as JSON) |
| `hmo.ts` | `hmo_payers`, `patient_hmo_memberships`, `hmo_claims` |

### Applied migrations

| Migration | Contents |
|---|---|
| `0000_talented_speedball` | Base tables: clinics → audit_events |
| `0001_overrated_loners` | `patient_dental_histories`, `encounters`, `treatment_records`, `odontogram_events` |
| `0002_sleepy_lethal_legion` | `prefix` column + unique constraint on `clinics` |
| `0003_great_zemo` | Better Auth `accounts`, `sessions`, `verifications`; auth fields on `users` |
| `0004_bored_sumo` | Package display price and unique package-feature mappings |
| `0005_faithful_azazel` | Structured clinic hero text and branch operating hours |
| `0006_dazzling_legion` | Tenant-scoped patient-number uniqueness |
| `0007_audit_immutability` | Append-only audit trigger |
| `0008_billing_lite` | `price_php` on `services`; `invoices`, `invoice_line_items`, `invoice_payments` |
| `0009_prescriptions` | `prescriptions`, `prescription_items` |
| `0010_clinical_files` | `clinical_files` (Object Storage metadata) |
| `0011_ai_interactions` | `ai_interactions` |
| `0012_remote_assessments` | `remote_assessments` with private photo metadata |
| `0013_hmo_claims` | `hmo_payers`, `patient_hmo_memberships`, `hmo_claims`; HMO columns on `services` |
| `0014_merge_history_reconciliation` | Idempotent reconciliation for both merged migration histories |

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
- **Use `FeatureKey`** from `@dentra/shared` for entitlement checks, never plan names.
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

## API routes (apps/api)

| Route prefix | File | Auth |
|---|---|---|
| `GET /health`, `GET /v1/health` | `routes/health.ts` | Public |
| `POST /v1/auth/*` | `routes/auth.ts` | Public (Better Auth) |
| `GET /v1/session-context` | `routes/auth.ts` | Authenticated |
| `GET /v1/admin/clinics` | `routes/admin-clinics.ts` | Super Admin |
| `POST /v1/admin/clinics` | `routes/admin-clinics.ts` | Super Admin |
| `GET /v1/admin/clinics/:id` | `routes/admin-clinics.ts` | Super Admin |
| `PATCH /v1/admin/clinics/:id/status` | `routes/admin-clinics.ts` | Super Admin |
| `POST /v1/admin/clinics/:id/branches` | `routes/admin-clinics.ts` | Super Admin |
| `GET/PATCH /v1/clinic/:id/services` | `routes/clinic-billing.ts` | Clinic member |
| `POST /v1/clinic/:id/invoices` | `routes/clinic-billing.ts` | Clinic member |
| `GET /v1/clinic/:id/invoices` | `routes/clinic-billing.ts` | Clinic member |
| `GET /v1/clinic/:id/invoices/:iid` | `routes/clinic-billing.ts` | Clinic member |
| `POST /v1/clinic/:id/invoices/:iid/payments` | `routes/clinic-billing.ts` | Clinic member |
| `GET /v1/clinic/:id/earnings/today` | `routes/clinic-billing.ts` | Clinic member |
| `GET/POST /v1/clinic/:id/prescriptions` | `routes/clinic-prescriptions.ts` | Clinic member |
| `GET/POST /v1/clinic/:id/files/*` | `routes/clinic-files.ts` | Clinic member |
| `GET/POST /v1/clinic/:id/encounters/*` | `routes/clinic-encounters.ts` | Clinic member |
| `GET/POST /v1/clinic/:id/patients/*` | `routes/clinic-patients.ts` | Clinic member |
| `POST /v1/clinic/:id/ai/*` | `routes/clinic-ai.ts` | Clinic member |
| `GET/POST /v1/clinic/:id/hmo/*` | `routes/hmo.ts` | Clinic member / Admin |
| `POST /v1/public/consult/:id` | `routes/remote-consults.ts` | Public |
| `GET/POST /v1/clinic/:id/remote-consults/*` | `routes/remote-consults.ts` | Clinic member |

---

## LOGS.md — keep it current

`LOGS.md` (root) is the running record of everything built, in progress, and queued. It is secondary to this file — use `replit.md` as the primary orientation point, then `LOGS.md` for the detailed change history.

**Update it after every task or session that changes the project:**
- Move completed items into the **Completed** section with a short summary.
- Update the **Queued** table to reflect the latest task states.
- Add new entries to **Known Gaps / Tech Debt** if anything was deferred.
- Update the **Reference** section if credentials, prefixes, or scripts change.

---

## User preferences

- Landing page design theme: similar to tonikbank.com (bold colors, rounded cards, playful but professional)
- Primary color: violet (#7c3aed)
- Accent: purple gradient
