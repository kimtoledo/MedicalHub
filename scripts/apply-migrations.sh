#!/bin/bash
# =============================================================================
# Apply pending Drizzle migrations to the target database.
#
# Usage:
#   ./scripts/apply-migrations.sh
#
# Idempotent — safe to run multiple times. Already-applied migrations are
# tracked by Drizzle in the __drizzle_migrations table.
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Applying migrations..."
cd "$PROJECT_ROOT"
npm run db:migrate
echo "✅  All pending migrations applied and schema verified."
