# ToothHub PH — Codex Agent Instructions

Read `docs/AGENTS.md` for the full instructions.

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
4. Use `FeatureKey` from `@toothhub/shared` for entitlement checks.
5. Filter every tenant query by `clinic_id`.

**DATABASE_URL**: copy from Replit Secrets into your local `.env` (never commit it).
