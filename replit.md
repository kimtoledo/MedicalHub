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
  db/         # Drizzle schema + migrations (not yet scaffolded)
  shared/     # Shared types, Zod schemas, constants (not yet scaffolded)
docs/         # Product spec, architecture, MVP plans, API contracts
```

## Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend** (planned): Fastify, TypeScript, Drizzle ORM, PostgreSQL
- **Auth** (planned): Better Auth
- **Design**: Tonik-inspired — teal palette, rounded cards, pill buttons

## Key docs (read before major changes)

- `docs/README.md` — product overview and domain rules
- `docs/replit.md` — Replit agent instructions
- `docs/MVP_1.md` — MVP 1 scope
- `docs/PRODUCT_SPEC.md` — full product spec

## User preferences

- Landing page design theme: similar to tonikbank.com (bold colors, rounded cards, playful but professional)
- Primary color: teal (#0d9488)
- Accent: cyan gradient
