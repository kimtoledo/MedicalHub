# Dentra.ph — Project Logs

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

### ✅ Super Admin subscription ledger
- Added protected, paginated `GET /v1/admin/subscriptions` with clinic/package search and status/package filters
- Preserves and displays historical as well as current effective-dated assignments instead of flattening subscription history
- Replaced the subscriptions stub with a responsive filterable ledger linked to clinic detail
- Verified authorization, filter validation, and response behavior with 102 passing API tests and repository-wide typecheck

### ✅ Super Admin package catalog management
- Added a human-readable package price display and a database uniqueness constraint for package-to-feature mappings through migration `0004_bored_sumo.sql`
- Added protected package list/create/edit/deactivate APIs backed exclusively by canonical `FeatureKey` values
- Replaced the package stub with responsive plan cards and a create/edit feature-toggle drawer
- Reports enabled feature count and effective active clinic count per package and audits catalog mutations
- Verified authorization, normalization, feature-key validation, and duplicate handling with 99 passing API tests and repository-wide typecheck

### ✅ Complete Super Admin dentist management
- Added confirmed verify/revoke and publish/unpublish actions with exact Super Admin authorization
- Enforces verification before public profile publication and uses conditional updates to prevent stale state transitions
- Appends immutable verification and publication audit events with previous/next state metadata
- Completed live listing, creation, detail, affiliation, verification, and publication across all five Task 03 steps
- Verified the completed module with 94 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Super Admin dentist affiliation management
- Added protected add/remove affiliation endpoints and responsive controls on dentist detail
- Resolves clinic scope from the selected branch instead of accepting a client-supplied tenant ID
- Rejects archived/deleted branch targets, duplicate active affiliations, and cross-dentist removals
- Preserves removal history through deactivation and appends tenant-scoped affiliated/unaffiliated audit events transactionally
- Verified authorization, tenant injection denial, scoping, and audit behavior with 89 passing API tests and repository-wide typecheck

### ✅ Super Admin dentist detail
- Added protected `GET /v1/admin/dentists/:dentistId` and linked directory rows to the dentist detail page
- Shows professional profile fields, verification/publication state, and active clinic-branch affiliations
- Keeps the platform response limited to dentist and affiliation metadata with no patient or clinical records
- Verified authorization, identifier validation, and response behavior with 82 passing API tests and repository-wide typecheck

### ✅ Super Admin dentist creation
- Added protected `POST /v1/admin/dentists` with strict normalization and rejection of client-injected fields
- Creates dentist profiles with safe `unverified` and private `draft` defaults, while enforcing globally unique public slugs
- Appends an immutable platform-level `dentist.created` audit event in the same transaction as profile creation
- Added an accessible responsive slide-over with automatic slug generation, inline errors, and a successful refresh into the live directory
- Verified authorization, validation, duplicate handling, audit behavior, and safe defaults with 79 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Live Super Admin dentist list
- Added protected `GET /v1/admin/dentists` with validated search, verification-state filtering, and pagination
- Enforced exact database-resolved `super_admin` authorization before any dentist query runs
- Returned dentist profile metadata and distinct active clinic-affiliation counts without exposing clinic, patient, or clinical records
- Replaced the `/dentra-admin/dentists` stub with a responsive server-rendered table, filter controls, pagination, loading, empty, and API error states
- Verified authorization and filter behavior with 72 passing API tests, repository-wide typecheck, and web/API production builds

### ✅ Complete Super Admin clinic management
- Added effective-dated package assignment with preserved subscription history and current-period entitlement resolution
- Added reasoned, optionally expiring feature overrides with audited set/remove operations
- Added audited microsite publish/unpublish controls with operational-status and `FeatureKey.MICROSITE_PUBLISH` enforcement
- Added confirmation-based responsive controls and same-origin proxy routes for all three workflows
- Verified authorization, validation, tenant scoping, effective-date rules, audit behavior, entitlement enforcement, 68 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic branch creation
- Added protected `POST /v1/admin/clinics/:clinicId/branches` with strict normalized validation and route-owned tenant scope
- Serializes branch creation per clinic, automatically makes the first branch main, and rejects a second active main branch
- Creates the branch and immutable audit event atomically without patient or clinical data exposure
- Added an accessible two-step add/review/confirm workflow with inline success and error states
- Verified authorization, validation, tenant-injection rejection, main-branch rules, audit behavior, 49 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic status actions
- Added protected, validated activate, suspend, archive, and reactivate transitions
- Uses a conditional transactional update and appends an audit event containing the actor and previous/next status
- Suspended and archived clinics no longer resolve active clinic-member authorization
- Added accessible confirmation dialogs and inline success/error feedback on the clinic detail page
- Verified Super Admin authorization boundaries, transition rules, audit action mapping, 39 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic detail
- Added protected `GET /v1/admin/clinics/:clinicId` and `/dentra-admin/clinics/[clinicId]`
- Shows tenant account metadata, owner, branches, subscription dates, active overrides, and effective feature-key entitlements
- Excludes patient and clinical records from the platform-management response
- Verified against seeded local data, authenticated page rendering, 26 API tests, typecheck, and web/API production builds

### ✅ Super Admin clinic onboarding
- Added the create-clinic page, live active-package options, and protected `POST /v1/admin/clinics`
- Clinic, pending owner membership, initial trial subscription, and audit events are written atomically
- Kept owner login email separate from public clinic contact information
- Verified Super Admin authorization, local package options, authenticated page rendering, 21 API tests, typecheck, and web/API production builds

### ✅ Inter typography and icon alignment
- Aligned the app, Tailwind/global font tokens, brand guidance, and editable wordmarks with Inter
- Applied Next.js's generated Inter class directly to the document body with a safe CSS fallback
- Confirmed Lucide React as the single UI icon system
- Verified live port 5050 output, typecheck, all 15 API tests, and web/API production builds

### ✅ Dentra.ph brand and technical migration
- Replaced customer-facing naming across the public site, Super Admin, Clinic/Dentist app, metadata, and offline experience
- Integrated the approved SVG logo pack through a shared logo component and regenerated PWA/Apple-touch icons
- Migrated npm workspaces to `@dentra/*`, the local PostgreSQL target to `dentra_local`, API identifiers to Dentra, and the seeded Super Admin to `admin@dentra.ph`
- Migrated the Super Admin route to `/dentra-admin`
- Verified the renamed login, migrations, typecheck, 15 API tests, and production build

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
| Super Admin | 1 | `admin@dentra.ph` |
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
**Super Admin section** (`/dentra-admin`)
- Better Auth email/password login with an HTTP-only database session
- Server-side `super_admin` role enforcement on every admin shell route
- Real logout with server-side session invalidation
- Dashboard with sidebar, top bar, mobile tab bar
- Stub pages: Clinics, Dentists, Packages, Subscriptions, Audit, Settings

**Clinic / Dentist section** (`/app`)
- Better Auth email/password login with an HTTP-only database session
- Server-side clinic membership enforcement on every app shell route
- Clinic staff versus dentist navigation derived from database membership
- Installable clinic PWA with manifest, app icons, service worker, and safe offline fallback
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
- Replaced the legacy Super Admin localStorage session flag with Better Auth sign-in and logout
- Added same-origin Next.js auth/session proxy routes so secure cookies work across the split web/API deployment
- Protected `/dentra-admin/(shell)` with a server-rendered backend session and exact `super_admin` role check
- Seeded Super Admin credentials idempotently from the ignored `SUPER_ADMIN_PASSWORD` environment variable
- Admin identity in the shell is populated from the authenticated database user rather than hardcoded authorization state
- Verified the full flow manually: denied before login → successful login → protected page 200 → logout → denied again
- Added the web workspace to the repository-wide TypeScript check

### ✅ Live Super Admin clinic list (task #12)
- Added protected `GET /v1/admin/clinics` with validated search, status, and pagination filters
- Enforced an exact database-resolved `super_admin` role before any clinic query runs
- Returned clinic account metadata with latest package name and active branch count; no patient or clinical data is exposed
- Replaced the `/dentra-admin/clinics` stub with a responsive server-rendered table
- Added search by clinic name/slug/prefix, status filtering, pagination, loading, empty, and API error states
- Added API denial and success coverage; API suite now has 15 passing tests

### ✅ Real Clinic and Dentist sign-in
- Replaced the legacy Clinic localStorage session flag and client-selected role with Better Auth email/password sign-in
- Added a server-rendered clinic membership guard for `/app/(shell)` routes
- Derived clinic staff versus dentist access from `/v1/session-context`
- Added real session invalidation on logout and removed `ClinicAuthGuard.tsx`
- Seeded idempotent credential accounts for clinic staff and Dr. Maria Reyes using `CLINIC_DEMO_PASSWORD`

### ✅ Clinic PWA static shell
- Added a clinic-scoped web app manifest and install icons
- Added a minimal service worker with network-first navigation and an offline fallback
- Explicitly excluded `/api/*` and `/v1/*` requests from caching so protected clinical data is not served stale

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

- **Clinic owner invitation delivery** — clinic creation links or creates a pending owner identity and membership, but invite email delivery and password setup remain a separate onboarding step.
- **Clinic membership selection** — authenticated users currently enter their first active clinic membership; explicit clinic/branch switching remains part of the PWA shell real-data work.
- **PWA entitlement and branch context remain static** — the required entitlement and branch-listing API endpoints are not implemented yet.
- **Most domain API routes remain queued** — Task 02 clinic management and Task 03 dentist listing/creation are implemented; dentist detail/affiliation actions, branch editing, and other domain modules still need backend routes.
- **Patient number sequencing** — no DB-level sequence generator; race condition possible under concurrent inserts
- **Clinic prefix required** — schema allows `prefix = ''` as default; admin UI must enforce non-empty unique prefix on clinic creation
- **Dependency upgrades pending** — `npm audit` reports 2 high advisories in the existing Next.js/PostCSS stack and 4 moderate build-tool advisories through Drizzle Kit. The runtime Drizzle ORM, new Fastify API, and Vitest test runner were upgraded to patched releases; the remaining fixes require separate tested framework/tooling upgrades.

---

## Reference

### Demo credentials (after seed)
| Role | Email | How to log in |
|------|-------|---------------|
| Super Admin | `admin@dentra.ph` | `/dentra-admin/login` → password from local/Replit `SUPER_ADMIN_PASSWORD` |
| Clinic Admin (SBD) | `admin@smilebrightdental.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |
| Clinic Admin (BSM) | `admin@brightsmile.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |
| Dentist | `dr.reyes@smilebrightdental.ph` | `/cl-login` → password from local/Replit `CLINIC_DEMO_PASSWORD` |

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
