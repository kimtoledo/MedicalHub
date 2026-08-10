# ToothHub PH

ToothHub PH is a product software platform for the Philippine dental market. It combines a multi-tenant dental practice management system, public clinic microsites, independent dentist profiles, online appointment booking, subscription/package-based feature access, and an installable Progressive Web App (PWA).

This repository is intended to be the shared source of truth for Replit Agent, Claude, Codex, and human developers.

## 1. Product surfaces

| Surface | Primary route | Audience |
|---|---|---|
| ToothHub company website | `/` | Public |
| Features | `/features` | Public |
| Pricing | `/pricing` | Public |
| Clinic directory | `/clinics` | Public |
| Dentist directory | `/dentists` | Public |
| Clinic microsite | `/clinic/[clinicSlug]` | Public |
| Clinic booking | `/clinic/[clinicSlug]/appointment` | Public |
| Dentist profile | `/dentists/[dentistSlug]` | Public |
| Dentist booking | `/dentists/[dentistSlug]/appointment` | Public |
| Clinic/staff login | `/cl-login` | Auth |
| Clinic PWA | `/app` | Clinic users |
| ToothHub Super Admin | `/th-admin` | Platform users |

## 2. Demo deployment architecture

For the demo stage, use a split deployment:

```text
Browser / Installed PWA
        |
        v
Vercel Hobby (demo frontend)
Next.js + React + PWA
        |
        | HTTPS /api/* proxy or direct API call
        v
Replit Backend
Fastify + TypeScript
        |
        v
Replit PostgreSQL
```

Recommended domains:

- Frontend: `https://toothhubph.com`
- Backend API: `https://api.toothhubph.com`

For the demo, Vercel Hobby is treated as temporary hosting only. Before commercial launch, review the current hosting plan terms, capacity, privacy, backups, and production requirements.

## 3. Recommended technical stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- PWA manifest + service worker

### Backend
- Node.js
- Fastify
- TypeScript
- Zod request/response validation
- OpenAPI documentation
- Pino structured logging

### Data
- PostgreSQL on Replit
- Drizzle ORM
- Drizzle Kit migrations
- UUID identifiers
- private object storage through a storage adapter

### Authentication and authorization
- Use a mature authentication library such as Better Auth behind an `AuthService` boundary.
- Use secure server-side sessions/cookies where possible.
- Authorization is always enforced by the backend API.
- Role permissions and subscription entitlements are different systems and both must pass.

### Quality
- Vitest for unit/service tests
- Playwright for important browser workflows
- ESLint
- TypeScript strict mode
- automated build checks before demo publication

## 4. Repository layout

```text
apps/
  web/                  # Next.js public site + PWA + admin UIs
  api/                  # Fastify API hosted on Replit
packages/
  db/                   # Drizzle schema, migrations, seed helpers
  shared/               # shared types, Zod schemas, constants
  config/               # shared config and feature keys
  ui/                   # optional shared UI package

docs/
  PRODUCT_SPEC.md
  ARCHITECTURE.md
  ROUTES.md
  DATABASE_SCHEMA.md
  API_CONTRACT.md
  ROLE_PERMISSION_MATRIX.md
  FEATURE_ENTITLEMENTS.md
  APPOINTMENT_ENGINE.md
  ODONTOGRAM.md
  PWA.md
  SECURITY_PRIVACY.md
  DEPLOYMENT.md
  MVP_1.md
  MVP_2.md
  MVP_3.md
  DEVELOPMENT_WORKFLOW.md
prompts/
  REPLIT_INITIAL_PROMPT.md
  CLAUDE_REVIEW_PROMPT.md
  CODEX_IMPLEMENTATION_PROMPT.md
README.md
CLAUDE.md
AGENTS.md
replit.md
.env.example
pnpm-workspace.yaml
```

Do not create separate applications or databases per clinic. ToothHub is one multi-tenant product.

## 5. Core domain rules

1. `Clinic`, `Branch`, `Dentist`, `User`, `Patient`, and `Subscription` are separate entities.
2. A dentist may work at many clinic branches through assignment records.
3. A clinic may have one or many branches.
4. A patient clinical record is tenant-scoped in MVP 1 and MVP 2. Do not automatically share patient records across clinics.
5. Public clinic and dentist pages only expose explicitly publishable fields.
6. Every protected read/write must derive tenant scope from the authenticated user's membership, not from a trusted browser-supplied ID.
7. Feature access uses entitlement keys such as `inventory.manage`; do not scatter checks for package names like `plan === "PRO"`.
8. Super Admin manages the platform, clinics, packages, subscriptions, and support operations. Super Admin is not a default universal viewer of patient clinical records.
9. Clinical changes, privileged administration, permissions, entitlements, billing adjustments, and support access must be auditable.
10. Do not cache sensitive clinical data for offline use in MVP 1 or MVP 2.

## 6. Initial roles

Platform roles:
- Super Admin
- Platform Support (optional later; restricted)

Clinic roles:
- Clinic Owner
- Clinic Admin
- Dentist
- Receptionist
- Dental Assistant
- Cashier (MVP 2)
- Inventory Staff (MVP 2)

Independent dentists are represented as dentists plus user accounts. Their permissions depend on whether they are acting on their own public profile or inside a clinic membership.

## 7. MVP roadmap

### MVP 1 - Foundation + Core Dental Operations
- company website and basic directories
- Super Admin clinic/dentist/package management
- clinic onboarding and public microsites
- dentist public profiles and clinic affiliations
- public clinic/dentist booking
- staff login/RBAC
- installable clinic PWA shell
- patient profiles and histories
- appointment calendar
- encounters
- adult odontogram baseline
- treatment records
- basic dashboard
- audit baseline

See `docs/MVP_1.md`.

### MVP 2 - Clinic Business Operations
- treatment plans
- procedure/service catalog and pricing
- invoices, payments, balances
- prescriptions
- radiographs/photos/documents
- inventory
- reminders and recall automation
- reports
- clinic website customization
- plan upgrades/add-ons and usage tracking

See `docs/MVP_2.md`.

### MVP 3 - Ecosystem + Scale
- patient accounts/portal
- advanced clinic/dentist discovery
- verification and moderation
- reviews
- enterprise multi-branch management
- online payments
- advanced analytics
- custom domains/themes
- integrations and public API
- optional secure offline-limited workflows after dedicated threat modeling

See `docs/MVP_3.md`.

## 8. Local/Replit setup

1. Import the GitHub repository into Replit.
2. Ensure Replit Agent reads `replit.md`, `README.md`, and the active MVP document.
3. Add a PostgreSQL development database.
4. Store credentials only in Replit Secrets/environment variables.
5. Install dependencies from the monorepo root.
6. Run migrations only against the intended development database.
7. Seed synthetic demo data. Never use real patient information for development/demo.
8. Start the backend API and web application.
9. Test public booking, clinic isolation, role denials, and Super Admin controls.

Suggested commands:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Database scripts should follow the repository `package.json`, for example:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

## 9. Vercel demo setup

Configure the Vercel project root as `apps/web`.

Use environment variables such as:

```env
NEXT_PUBLIC_APP_URL=https://toothhubph.com
NEXT_PUBLIC_API_URL=https://api.toothhubph.com
```

Prefer one of these API patterns:

1. Frontend calls `https://api.toothhubph.com/v1/...` and Replit API uses an explicit CORS allowlist; or
2. Vercel rewrites `/api/backend/*` to the Replit API so the browser mostly stays on the ToothHub origin.

Do not put the PostgreSQL connection string in Vercel client-exposed variables.

## 10. Environment variables

See `.env.example`. Actual secrets must never be committed.

## 11. AI agent workflow

- Replit Agent reads `replit.md`.
- Claude reads `CLAUDE.md`.
- Codex reads `AGENTS.md`.
- All agents must follow `docs/PRODUCT_SPEC.md`, `docs/SECURITY_PRIVACY.md`, and the active MVP file.

Before a major change, the agent must:

1. identify affected routes, tables, services, permissions, and entitlements;
2. propose a small implementation plan;
3. identify migrations;
4. implement one complete slice;
5. add tests for success and denial cases;
6. run lint, typecheck, tests, and build;
7. summarize changes and remaining risks.

## 12. Definition of done

A feature is not complete until:
- the happy path works;
- tenant isolation is enforced server-side;
- role and entitlement checks are enforced server-side;
- input is validated;
- loading, empty, denied, and error states exist;
- important writes are audited;
- migrations are included and reviewed;
- tests cover important success and denial cases;
- lint, typecheck, tests, and build pass;
- no sensitive data is leaked to logs, URLs, public storage, or offline cache.
