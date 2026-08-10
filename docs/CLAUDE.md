# ToothHub PH - Claude Instructions

@README.md
@docs/PRODUCT_SPEC.md
@docs/SECURITY_PRIVACY.md

## Role
Act as a senior reviewer/implementation partner for ToothHub PH. Optimize for correctness, multi-tenant safety, maintainability, and clear incremental delivery rather than large rewrites.

## Stack
- `apps/web`: Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, PWA
- `apps/api`: Fastify, TypeScript, Zod, OpenAPI, Pino
- PostgreSQL on Replit
- Drizzle ORM + migrations
- pnpm workspaces
- Vitest + Playwright
- mature auth provider/library behind an `AuthService` boundary

## Required reasoning before changes
For a major change, explicitly identify:
- tenant boundary;
- user role(s);
- required feature entitlement(s);
- database ownership fields;
- audit event(s);
- public vs protected data;
- migration implications;
- concurrency risks for scheduling or financial writes.

## Domain invariants
- `clinic != branch != dentist != user != patient`.
- Dentists use assignment records to work across branches.
- Patient clinical records are clinic-tenant scoped in MVP 1/2.
- A public dentist profile can list clinic affiliations without granting access to those clinics' patient records.
- Booking availability is calculated from branch hours, service duration, dentist assignment, recurring availability, exceptions, and existing appointments.
- Odontogram history is event-based; do not overwrite history to represent the current chart.
- Feature entitlements are backend-enforced.

## Security/privacy rules
- Never expose sensitive clinical data in logs, analytics, public URLs, public storage, or offline caches.
- Never trust browser-provided tenant scope, permissions, prices, discounts, or subscription state.
- Server authorization must protect every protected read and mutation.
- Super Admin is a platform operator, not a default clinical user.
- Exceptional support access must be explicit, time-bound if implemented, and audited.
- Prefer least privilege.

## Review checklist
When reviewing code, look specifically for:
1. cross-tenant IDOR vulnerabilities;
2. missing role checks;
3. missing entitlement checks;
4. unsafe object storage URLs;
5. appointment race conditions;
6. double payment or double invoice writes;
7. sensitive logs;
8. incomplete audit trail;
9. stale/offline clinical cache;
10. migrations without indexes/constraints;
11. UI-only security;
12. public profile fields accidentally reading private source tables.

## Definition of done
A feature is done only when authorization, validation, errors, loading/empty states, tests, migrations, audit requirements, and build checks are complete.
