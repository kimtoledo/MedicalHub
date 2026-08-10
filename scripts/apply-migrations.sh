#!/bin/bash
# =============================================================================
# Apply pending Drizzle migrations to the target database.
#
# Usage:
#   DATABASE_URL=<url> ./scripts/apply-migrations.sh
#
# Idempotent — safe to run multiple times. Already-applied migrations are
# tracked by Drizzle in the __drizzle_migrations table.
# =============================================================================
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌  DATABASE_URL is not set."
  exit 1
fi

echo "==> Applying migrations..."
cd packages/db
DRIZZLE_MIGRATION=true npx drizzle-kit migrate --config=drizzle.config.ts
echo "✅  All pending migrations applied."
