# Dentra.ph

**The all-in-one dental practice management platform for the Philippines.**

Dentra.ph is a multi-tenant SaaS product that gives dental clinics a public online presence, online appointment booking, digital patient and clinical records, billing, prescriptions, private clinical files, and a Progressive Web App — all in one place. Independent dentists get their own bookable profile. Platform operators manage everything through a Super Admin panel.

Brand and frontend implementation must follow [`docs/BRANDING.md`](docs/BRANDING.md). Approved SVG assets are stored in [`docs/branding/`](docs/branding/).

---

## Product surfaces

| Surface | Route | Audience |
|---|---|---|
| Company website | `/` | Public |
| Features & Pricing | `/#features`, `/#pricing` | Public |
| Clinic directory | `/clinics` | Public |
| Dentist directory | `/dentists` | Public |
| Clinic microsite | `/clinic/[clinicSlug]` | Public |
| Online booking | `/clinic/[clinicSlug]/appointment` | Public |
| Dentist profile | `/dentists/[dentistSlug]` | Public |
| Remote photo consultation | `/consult/[clinicId]` | Public patients |
| Clinic / staff login | `/cl-login` | Auth |
| Clinic PWA | `/app/*` | Clinic staff & dentists |
| Super Admin panel | `/dentra-admin/*` | Platform operators |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router · React 18 · TypeScript · Tailwind CSS |
| **Backend** | Fastify 5 · TypeScript · Zod · Pino |
| **Database** | PostgreSQL · Drizzle ORM · Drizzle Kit migrations |
| **Private files** | Replit Object Storage · short-lived signed access |
| **Auth** | Better Auth (behind an `AuthService` boundary) |
| **Shared** | `@dentra/shared` — Zod schemas, enums, `FeatureKey` constants |
| **Testing** | Vitest · TypeScript checks · production builds · Chrome responsive QA |

---

## Repository layout

```
apps/
  web/          # Next.js — public site, clinic PWA, admin panels
  api/          # Fastify API (hosted on Replit)

packages/
  db/           # Drizzle schema, migrations, DB client
  shared/       # Shared TypeScript enums, Zod schemas, FeatureKey constants

docs/           # Full product spec, architecture, MVP plans, API contracts
scripts/        # Migration helpers, post-merge automation

DEVELOPER.md    # ← Start here to get the project running locally
AGENTS.md       # Codex agent instructions (quick reference)
CLAUDE.md       # Claude reviewer instructions
replit.md       # Replit Agent instructions
.env.example    # Environment variable reference
```

---

## MVP roadmap

| MVP | Focus | Status |
|---|---|---|
| **MVP 1** | Foundation, booking, clinical workflows, billing lite, e-Rx, private files, PWA | ✅ Complete |
| **MVP 2** | Clinic business — AI assistance, tele-dentistry, HMO claims, inventory, reports | 🟡 In progress |
| **MVP 3** | Ecosystem — patient portal, reviews, custom domains, API | Planned |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (copy and fill in DATABASE_URL)
cp .env.example .env

# 3. Apply database migrations
npm run db:migrate

# Optional: set SUPER_ADMIN_PASSWORD and CLINIC_DEMO_PASSWORD in .env,
# then load the fully synthetic demo dataset
npm run db:seed

# Optional: prepare and validate a same-day synthetic presentation scenario
npm run demo:prepare

# 4. Start the frontend (local port 5001)
npm run dev

# 5. In another terminal, start the API (port 3001)
npm run api:dev
```

See **[DEVELOPER.md](DEVELOPER.md)** for full setup instructions across Replit, VS Code, and Codex.
For the repeatable presentation flow, see **[docs/PRESENTATION_DEMO.md](docs/PRESENTATION_DEMO.md)**.

The API exposes Better Auth under `/v1/auth/*`. Authenticated clients can call
`GET /v1/session-context` to receive platform roles and active clinic
memberships resolved by the backend.

Local URLs after startup:

- Website and public directories: `http://localhost:5001`
- Clinic login/PWA: `http://localhost:5001/cl-login` and `/app`
- Super Admin: `http://localhost:5001/dentra-admin/login`
- API health: `http://localhost:3001/health`

## MVP 1 delivered

- Protected Super Admin clinic, dentist, package, subscription, entitlement, and immutable audit management.
- Publication-safe clinic/dentist directories, microsites, profiles, and conflict-safe public booking.
- Tenant/branch-scoped Clinic PWA dashboards, appointment status workflows, patient records, versioned histories, encounters, treatment records, and append-only odontogram corrections.
- Service pricing, tenant-scoped invoices and payments, live daily collections, and printable receipts.
- Immutable prescriptions with amendment history and printable Philippine e-Rx layouts.
- Private clinical X-ray/photo/document uploads with validated multipart handling and short-lived access.
- Direct invoice, payment, prescription, and clinical-file APIs enforce canonical feature entitlements and tenant/branch ownership; the Professional demo plan enables all MVP 1 business basics.
- Installable PWA shell with an offline fallback and network-only handling for every protected API response.
- Synthetic demo seed plus 228 automated API tests and release gates for tenant isolation, entitlement denial, publication boundaries, booking races, audit integrity, and responsive layouts.

## MVP 2 delivered so far

- Review-only AI note, recall, treatment-sequence, and voice-input assistance with metadata-only interaction records.
- Public remote photo consultation intake and a protected dentist assessment queue.
- HMO payer catalogs, patient memberships, claim preparation/status tracking, and atomic claim-to-invoice payment handling.

---

## Documentation

| Document | Purpose |
|---|---|
| [`DEVELOPER.md`](DEVELOPER.md) | Installation, local DB setup, migration workflow, troubleshooting |
| [`docs/README.md`](docs/README.md) | Full product spec — domain rules, roles, architecture |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | General product and operating guide |
| [`docs/USER_GUIDE_SUPER_ADMIN.md`](docs/USER_GUIDE_SUPER_ADMIN.md) | Super Admin platform operations manual |
| [`docs/USER_GUIDE_CLINICS.md`](docs/USER_GUIDE_CLINICS.md) | Clinic staff and dentist manual |
| [`docs/USER_GUIDE_PATIENTS.md`](docs/USER_GUIDE_PATIENTS.md) | Patient booking, portal, payment, and privacy manual |
| [`docs/MVP_1.md`](docs/MVP_1.md) | MVP 1 detailed scope and acceptance criteria |
| [`docs/MVP1_RELEASE_CHECKLIST.md`](docs/MVP1_RELEASE_CHECKLIST.md) | Verified MVP 1 release gates and evidence |
| [`tasks/mvp1/00-overview.md`](tasks/mvp1/00-overview.md) | Completed MVP 1 implementation task checklist |
| [`LOGS.md`](LOGS.md) | Chronological implementation record, current gaps, and operational reference |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Codex full instructions |
| [`AGENTS.md`](AGENTS.md) | Codex quick reference |
| [`CLAUDE.md`](CLAUDE.md) | Claude reviewer checklist |
| [`replit.md`](replit.md) | Replit Agent instructions |
| [`.env.example`](.env.example) | All environment variables with descriptions |

---

## Key rules (non-negotiable)

1. **One database, multi-tenant.** Do not create a separate database per clinic.
2. **`clinic_id` is the tenant boundary.** Every protected query must filter by it.
3. **Never trust client-supplied IDs or roles.** Derive tenant scope server-side from authenticated sessions.
4. **Use `FeatureKey` for entitlements.** Never check plan names (`plan === "pro"`) in code.
5. **Patient records don't cross clinic boundaries.** Same phone ≠ same patient across clinics.
6. **Migrations through Drizzle Kit only.** Never hand-edit applied migrations or run raw SQL on shared databases.
7. **Secrets in Replit Secrets.** Never commit `.env` files or credentials.
