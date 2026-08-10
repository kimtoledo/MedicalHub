#!/bin/bash
# =============================================================================
# Generate a new Drizzle migration from schema changes.
#
# Usage:
#   ./scripts/generate-migration.sh
#
# This compares the current schema (packages/db/src/schema/) against the
# existing migrations and writes a new SQL file to packages/db/migrations/.
#
# IMPORTANT: Always commit the generated .sql file before merging.
# =============================================================================
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌  DATABASE_URL is not set."
  echo "    Copy it from Replit Secrets into your local .env file and re-run."
  exit 1
fi

echo "==> Generating migration..."
cd packages/db
DRIZZLE_MIGRATION=true npx drizzle-kit generate --config=drizzle.config.ts
echo "✅  Migration file written to packages/db/migrations/"
echo ""
echo "Next steps:"
echo "  1. Review the generated .sql file in packages/db/migrations/"
echo "  2. git add packages/db/migrations/"
echo "  3. git commit -m 'db: add migration for <description>'"
echo "  4. Push / open PR — migrations run automatically on Replit after merge."
