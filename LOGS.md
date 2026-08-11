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
**Super Admin section** (`/admin`)
- Login page (mock auth via `localStorage` — `th_admin_session`)
- Dashboard with sidebar, top bar, mobile tab bar
- Stub pages: Clinics, Dentists, Users, Subscriptions, Audit, Settings

**Clinic / Dentist section** (`/app`)
- Role-selector login (`/cl-login`) — mock auth via `th_clinic_session`
- App shell with sidebar, top bar, mobile tabs
- Dashboard variants for clinic admin vs dentist
- Stub pages: Appointments, Patients, Encounters, Odontogram, Services, Staff, Reports, Settings

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
| #7 | Scaffold the Fastify API server (`apps/api`) | No API server yet; all data flows are mock/local |
| #8 | Add authentication with Better Auth | Currently using `localStorage` mock sessions |
| #12 | Let Super Admin see and search all clinics from one table | UI stub exists at `/admin/clinics` |
| #13 | Replace mock Super Admin login with real auth | Depends on #8 |

---

## Known Gaps / Tech Debt

- **No real auth** — all login is localStorage mock; `th_admin_session` / `th_clinic_session`
- **No API server** — no `apps/api`; UI stubs have no data fetching
- **Patient number sequencing** — no DB-level sequence generator; race condition possible under concurrent inserts
- **Clinic prefix required** — schema allows `prefix = ''` as default; admin UI must enforce non-empty unique prefix on clinic creation

---

## Reference

### Demo credentials (after seed)
| Role | Email | How to log in |
|------|-------|---------------|
| Super Admin | `admin@toothhub.ph` | `/admin/login` → any password (mock) |
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
npm run db:generate  # Generate a new Drizzle migration from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:seed      # Load demo data (idempotent)
npm run db:studio    # Open Drizzle Studio (requires DATABASE_URL)
```
