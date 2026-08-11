# ToothHub PH

**The all-in-one dental practice management platform for the Philippines.**

ToothHub PH is a multi-tenant SaaS product that gives dental clinics a public online presence, online appointment booking, digital patient records, staff management, and a Progressive Web App — all in one place. Independent dentists get their own bookable profile. Platform operators manage everything through a Super Admin panel.

---

## Product surfaces

| Surface | Route | Audience |
|---|---|---|
| Company website | `/` | Public |
| Features & Pricing | `/features`, `/pricing` | Public |
| Clinic directory | `/clinics` | Public |
| Dentist directory | `/dentists` | Public |
| Clinic microsite | `/clinic/[clinicSlug]` | Public |
| Online booking | `/clinic/[clinicSlug]/appointment` | Public |
| Dentist profile | `/dentists/[dentistSlug]` | Public |
| Clinic / staff login | `/cl-login` | Auth |
| Clinic PWA | `/app/*` | Clinic staff & dentists |
| Super Admin panel | `/th-admin/*` | Platform operators |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router · React 18 · TypeScript · Tailwind CSS · shadcn/ui |
| **Backend** | Fastify · TypeScript · Zod · OpenAPI · Pino |
| **Database** | PostgreSQL (Replit) · Drizzle ORM · Drizzle Kit migrations |
| **Auth** | Better Auth (behind an `AuthService` boundary) |
| **Shared** | `@toothhub/shared` — Zod schemas, enums, `FeatureKey` constants |
| **Testing** | Vitest · Playwright |

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
| **MVP 1** | Foundation — website, booking, patient records, PWA shell | 🚧 In progress |
| **MVP 2** | Clinic business — billing, prescriptions, inventory, reports | Planned |
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

# 4. Start the frontend (port 5000)
npm run dev

# 5. In another terminal, start the API (port 3001)
npm run api:dev
```

See **[DEVELOPER.md](DEVELOPER.md)** for full setup instructions across Replit, VS Code, and Codex.

The API exposes Better Auth under `/v1/auth/*`. Authenticated clients can call
`GET /v1/session-context` to receive platform roles and active clinic
memberships resolved by the backend.

---

## Documentation

| Document | Purpose |
|---|---|
| [`DEVELOPER.md`](DEVELOPER.md) | Installation, local DB setup, migration workflow, troubleshooting |
| [`docs/README.md`](docs/README.md) | Full product spec — domain rules, roles, architecture |
| [`docs/MVP_1.md`](docs/MVP_1.md) | MVP 1 detailed scope and acceptance criteria |
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
