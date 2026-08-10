# ToothHub PH - Replit Agent Instructions

## Mission
Build ToothHub PH as a multi-tenant dental SaaS product and PWA. During the demo stage, the backend API and PostgreSQL database run on Replit while the Next.js frontend may be deployed to Vercel Hobby. The codebase must remain portable so production hosting can change later without rewriting domain logic.

## Read first
Before a major task, read:
- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_PRIVACY.md`
- the relevant `docs/MVP_*.md`

For scheduling, charting, permissions, or packages also read the dedicated document.

## Architecture
- Monorepo using pnpm workspaces.
- `apps/web`: Next.js App Router frontend, public website, PWA, clinic UI, Super Admin UI.
- `apps/api`: Fastify TypeScript API running on Replit.
- `packages/db`: PostgreSQL/Drizzle schema, migrations, and seed utilities.
- `packages/shared`: shared Zod schemas, DTOs, feature keys, and enums.
- Replit PostgreSQL is the source of truth for application data during demo/MVP development.
- Never connect the browser directly to PostgreSQL.

## Required routes
Public frontend:
- `/`
- `/features`
- `/pricing`
- `/clinics`
- `/dentists`
- `/clinic/[clinicSlug]`
- `/clinic/[clinicSlug]/appointment`
- `/dentists/[dentistSlug]`
- `/dentists/[dentistSlug]/appointment`

Authenticated frontend:
- `/cl-login`
- `/app/*`
- `/th-admin/*`

Backend APIs use `/v1/...` and must be versioned.

## Non-negotiable domain rules
1. Clinic, branch, dentist, user, patient, and subscription are separate entities.
2. Dentists may be assigned to many branches.
3. Patient/clinical records are tenant-scoped. Never infer that a person with the same email or phone across clinics should share records.
4. Public clinic/dentist profiles use approved publishable fields only.
5. Subscription packages grant feature entitlements. UI checks are convenience only; backend checks are authoritative.
6. Super Admin does not automatically receive broad clinical-record access.
7. Important clinical/admin/billing changes generate audit events.

## Security rules
- Treat patient clinical/medical data as highly sensitive.
- Do not log clinical notes, diagnoses, radiograph URLs, auth tokens, secrets, or full request bodies for protected endpoints.
- Do not trust client-supplied `clinicId`, `branchId`, `role`, feature flags, prices, discounts, or payment status.
- Derive tenant context from authenticated membership and server-side records.
- Use private object storage and signed/authorized retrieval for protected files.
- No protected clinical data in PWA offline cache for MVP 1/2.
- Never commit secrets. Use Replit Secrets.
- Add rate limiting to authentication and public booking endpoints.

## PWA
- Build an installable PWA from `apps/web`.
- Use a web manifest and service worker.
- Cache static/public resources only unless explicitly approved.
- When offline on protected pages, show a safe offline state; do not silently serve stale patient records.

## Implementation workflow
For each major feature:
1. Inspect existing implementation and docs.
2. List affected routes, API endpoints, database tables, permissions, entitlements, and audit events.
3. Propose a small milestone plan.
4. Make schema changes through Drizzle migrations.
5. Implement backend authorization first or in the same slice as UI.
6. Add tests for cross-tenant denial and role/entitlement denial.
7. Run lint, typecheck, unit tests, integration tests, and production build.
8. Summarize changes and unresolved risks.

## Do not
- do not create one database per clinic;
- do not hard-code plan names throughout the code;
- do not create a hidden Super Admin bypass to clinical records;
- do not use patient names or IDs in public route slugs;
- do not use public buckets for patient files;
- do not hand-edit migrations already applied to shared environments;
- do not rewrite stable modules unrelated to the requested task.
