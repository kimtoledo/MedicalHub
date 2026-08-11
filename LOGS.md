# ToothHub PH — Project Logs

Chronological record of what has been built, what is in progress, and what is next.
Updated manually after each session or merged task.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done & merged |
| 🔄 | In progress |
| 📋 | Proposed / queued |
| ❌ | Cancelled |

---

## Completed

### ✅ Monorepo scaffolding
- **npm workspaces** set up: `apps/web`, `apps/api` (placeholder), `packages/db`, `packages/shared`
- Root `package.json` with shared scripts (`dev`, `build`, `db:generate`, `db:migrate`, `db:seed`)
- TypeScript configured across all packages

### ✅ Shared packages
- `packages/shared/src/enums.ts` — `PlatformRole`, `ClinicRole`, `FeatureKey`, `AuditAction`, `AppointmentStatus`, `SubscriptionStatus`, etc.
- `packages/shared/src/schemas.ts` — Zod validation schemas

### ✅ Database schema (packages/db)
All Drizzle ORM schema files created:

| File | Tables |
|------|--------|
| `clinics.ts` | `clinics` (+ `prefix` column for short IDs) |
| `branches.ts` | `branches` |
| `dentists.ts` | `dentists`, `dentist_branch_assignments` |
| `users.ts` | `users`, `clinic_memberships` |
| `patients.ts` | `patients`, `patient_medical_histories`, `patient_dental_histories` |
| `appointments.ts` | `appointments`, `appointment_status_history`, `services` |
| `subscriptions.ts` | `packages`, `package_features`, `clinic_subscriptions`, `clinic_feature_overrides` |
| `audit.ts` | `audit_events` |
| `encounters.ts` | `encounters`, `treatment_records` |
| `odontogram.ts` | `odontogram_events` |

### ✅ Database migrations (applied to live DB)

| File | Contents |
|------|---------|
| `0000_talented_speedball.sql` | All base tables (clinics → audit_events) |
| `0001_overrated_loners.sql` | `patient_dental_histories`, `encounters`, `treatment_records`, `odontogram_events` |
| `0002_sleepy_lethal_legion.sql` | `prefix` column + unique constraint on `clinics` |
| `0003_great_zemo.sql` | Better Auth `accounts`, `sessions`, and `verifications`; auth identity fields on `users` |

### ✅ Demo seed data (live in DB)
Script: `scripts/seed-demo.ts` — run with `npm run db:seed`

| Entity | Count | Notes |
|--------|-------|-------|
| Super Admin | 1 | `admin@toothhub.ph` |
| Packages | 3 | Starter, Professional, Enterprise |
| Clinics | 2 | Smile Bright Dental (SBD), BrightSmile Dental (BSM) |
| Branches | 3 | 2 for SBD, 1 for BSM |
| Dentists | 4 | Dr. Reyes, Dr. Santos, Dr. Cruz, Dr. Garcia |
| Staff users | 6 | 3 per clinic (admin, receptionist, assistant) |
| Services | 12 | 6 per clinic |
| Patients | 40 | 20 per clinic, Filipino names + Metro Manila addresses |
| Appointments | 30 | 15 per clinic, spread ±7 days, mixed statuses |
| Encounters | 16 | 1 per completed appointment |
| Treatment records | 16 | 1 per encounter |
| Odontogram events | 16 | 1 per encounter |

**Patient number format:** `{PREFIX}{NNNNNN}` — e.g. `SBD000001`, `BSM000012`

### ✅ Web app shell (apps/web — Next.js 14)
**Super Admin section** (`/th-admin`)
- Better Auth email/password login with an HTTP-only database session
- Server-side `super_admin` role enforcement on every admin shell route
- Real logout with server-side session invalidation
- Dashboard with sidebar, top bar, mobile tab bar
- Stub pages: Clinics, Dentists, Packages, Subscriptions, Audit, Settings

**Clinic / Dentist section** (`/app`)
- Role-selector login (`/cl-login`) — mock auth via `th_clinic_session`
- App shell with sidebar, top bar, mobile tabs
- Dashboard variants for clinic admin vs dentist
- Stub pages: Appointments, Patients, Staff, Profile, Settings, plus dentist Schedule, Encounters, Odontogram, Patients, and Profile

### ✅ Fastify API foundation (apps/api)
- Fastify 5 TypeScript workspace with development, build, start, typecheck, and test scripts
- `GET /health` liveness endpoint
- `GET /v1/health` readiness endpoint backed by a real PostgreSQL query
- Explicit credentialed CORS allowlist for the frontend origin
- Helmet security headers and cookie parsing ready for the authentication task
- Structured JSON errors for unknown routes and server failures
- Authorization and cookie headers are redacted from API logs
- Graceful shutdown closes the shared PostgreSQL connection pool
- Vitest coverage for liveness, database readiness/failure, and CORS

### ✅ Better Auth backend foundation
- Better Auth mounted at `/v1/auth/*` with database-backed, seven-day sessions
- Email/password sign-in enabled; public sign-up disabled until invite/onboarding flows exist
- `GET /v1/session-context` returns only backend-resolved platform roles and active clinic memberships
- Reusable `superAdmin` and tenant/clinic role guards enforce server-side authorization boundaries
- Auth tokens/cookies remain redacted from logs; secure, HTTP-only, SameSite cookies are configured
- Fastify and Better Auth rate limits protect auth endpoints, with a stricter email sign-in limit
- Migration `0003_great_zemo.sql` applied and verified on local PostgreSQL
- API authorization/auth-route test suite expanded to 11 passing tests

### ✅ Real Super Admin sign-in (task #13)
- Replaced `localStorage.th_admin_session` with Better Auth sign-in and logout
- Added same-origin Next.js auth/session proxy routes so secure cookies work across the split web/API deployment
- Protected `/th-admin/(shell)` with a server-rendered backend session and exact `super_admin` role check
- Seeded Super Admin credentials idempotently from the ignored `SUPER_ADMIN_PASSWORD` environment variable
- Admin identity in the shell is populated from the authenticated database user rather than hardcoded authorization state
- Verified the full flow manually: denied before login → successful login → protected page 200 → logout → denied again
- Added the web workspace to the repository-wide TypeScript check

### ✅ Live Super Admin clinic list (task #12)
- Added protected `GET /v1/admin/clinics` with validated search, status, and pagination filters
- Enforced an exact database-resolved `super_admin` role before any clinic query runs
- Returned clinic account metadata with latest package name and active branch count; no patient or clinical data is exposed
- Replaced the `/th-admin/clinics` stub with a responsive server-rendered table
- Added search by clinic name/slug/prefix, status filtering, pagination, loading, empty, and API error states
- Added API denial and success coverage; API suite now has 15 passing tests

### ✅ Scripts & automation
- `scripts/post-merge.sh` — auto-runs migrations after task merges
- `scripts/generate-migration.sh` — helper to generate new migration files
- `scripts/apply-migrations.sh` — applies pending migrations
- `scripts/seed-demo.ts` — idempotent demo data seeder

### ✅ Documentation
- `README.md` — project overview
- `DEVELOPER.md` — local setup, conventions, workflow
- `AGENTS.md` — agent coordination rules
- `replit.md` — Replit-specific setup notes
- `tasks/README.md` + `tasks/mvp1/`, `tasks/mvp2/`, `tasks/mvp3/` — 42 scoped task files

---

## Queued (Proposed Tasks)

| # | Title | Notes |
|---|-------|-------|
| #6 | Connect Replit PostgreSQL and apply the first migration | DB is live; `DATABASE_URL` already set by Replit. Task may be redundant — migrations are already applied. |

---

## Known Gaps / Tech Debt

- **Clinic auth UI still mocked** — `/cl-login` still uses `th_clinic_session`; clinic roles and credentials must be wired to Better Auth in the remaining Platform Foundation work.
- **Most domain API routes remain queued** — clinic listing is now live, while create/detail/status/branch/package/override operations and other UI stubs still need backend routes.
- **Patient number sequencing** — no DB-level sequence generator; race condition possible under concurrent inserts
- **Clinic prefix required** — schema allows `prefix = ''` as default; admin UI must enforce non-empty unique prefix on clinic creation
- **Dependency upgrades pending** — `npm audit` reports 2 high advisories in the existing Next.js/PostCSS stack and 4 moderate build-tool advisories through Drizzle Kit. The runtime Drizzle ORM, new Fastify API, and Vitest test runner were upgraded to patched releases; the remaining fixes require separate tested framework/tooling upgrades.

---

## Reference

### Demo credentials (after seed)
| Role | Email | How to log in |
|------|-------|---------------|
| Super Admin | `admin@toothhub.ph` | `/th-admin/login` → password from local/Replit `SUPER_ADMIN_PASSWORD` |
| Clinic Admin (SBD) | `admin@smilebrightdental.ph` | `/cl-login` → select Clinic Admin |
| Clinic Admin (BSM) | `admin@brightsmile.ph` | `/cl-login` → select Clinic Admin |
| Dentist | `dr.reyes@smilebrightdental.ph` | `/cl-login` → select Dentist |

### Clinic prefixes
| Clinic | Prefix | Status |
|--------|--------|--------|
| Smile Bright Dental | `SBD` | Active, Professional plan |
| BrightSmile Dental Clinic | `BSM` | Trial, Starter plan |

### Useful scripts
```bash
npm run dev          # Start Next.js on port 5000
npm run api:dev      # Start Fastify API on port 3001
npm run api:start    # Start the production API bundle
npm run test         # Run workspace tests
npm run typecheck    # Run workspace TypeScript checks
npm run db:generate  # Generate a new Drizzle migration from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Load demo data (idempotent)
npm run db:studio    # Open Drizzle Studio (requires DATABASE_URL)
```
