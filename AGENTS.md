# Dentra.ph — Codex Agent Instructions

Read `docs/AGENTS.md` for the full instructions.

For frontend and PWA work, read and follow `docs/BRANDING.md`. Do not introduce a competing visual system without explicit approval.

## Quick reference

- Schema: `packages/db/src/schema/`
- Migrations: `packages/db/migrations/`
- Shared enums/schemas: `packages/shared/src/`
- Drizzle config: `packages/db/drizzle.config.ts`

## Database & Migrations (summary)

Full details in `docs/AGENTS.md` → **Database & Migrations** section.

```bash
# Schema change workflow
npm run db:generate    # 1. generate migration SQL
# review packages/db/migrations/<new>.sql
git add packages/db/src/schema/ packages/db/migrations/
git commit -m "db: <description>"
# merge → post-merge.sh auto-applies on Replit
```

**Golden rules:**
1. Never hand-edit an applied migration.
2. Never run raw SQL against the shared DB — use `drizzle-kit migrate`.
3. Always commit the `.sql` file before merging.
4. Use `FeatureKey` from `@dentra/shared` for entitlement checks.
5. Filter every tenant query by `clinic_id`.

**DATABASE_URL**: copy from Replit Secrets into your local `.env` (never commit it).

## Task planning

All planned work is documented in `tasks/`:
- `tasks/README.md` — status badge legend + **golden rule** (any change needs a task first)
- `tasks/mvp1/` — 17 files covering Foundation + Core Dental Operations
- `tasks/mvp2/` — 13 files covering Complete Clinic Business Operations
- `tasks/mvp3/` — 12 files covering Ecosystem + Scale

Before making any code change, check `tasks/` to find the relevant task file and confirm a project task exists in the Replit task panel.

## LOGS.md — keep it current

`LOGS.md` (root) is the running record of everything built, in progress, and queued.

**Update it after every task or session that changes the project:**
- Move completed items into the **Completed** section with a short summary.
- Update the **Queued** table to reflect the latest task states.
- Add new entries to **Known Gaps / Tech Debt** if anything was deferred.
- Update the **Reference** section if credentials, prefixes, or scripts change.

Do not skip this step — future agents (and humans) rely on `LOGS.md` as the first place to understand current project state.
