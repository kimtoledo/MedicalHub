#!/bin/bash
# =============================================================================
# Dentra.ph — Post-merge setup script
# Runs automatically on Replit after every task merge.
# Also safe to run manually at any time.
# =============================================================================
set -e

echo "==> [post-merge] Starting setup..."

# Install / update dependencies from repo root
echo "==> [post-merge] Installing dependencies..."
npm install

# Apply any pending Drizzle migrations to the Replit PostgreSQL database.
# DATABASE_URL is read from Replit Secrets automatically.
#
# We use scripts/apply-migrations.ts instead of `drizzle-kit migrate` because
# drizzle-kit migrate hangs silently when the __drizzle_migrations tracking
# table is out of sync with the actual DB state — a common occurrence after
# cross-agent merges or manual out-of-band applies. Our custom runner is
# idempotent, handles already-existing objects gracefully, and includes the
# schema readiness check at the end.
if [ -z "$DATABASE_URL" ]; then
  echo "❌  [post-merge] DATABASE_URL is not set — deployment cannot continue safely."
  echo "    Add DATABASE_URL to Replit Secrets, then rerun post-merge setup."
  exit 1
else
  echo "==> [post-merge] Applying database migrations..."
  npx tsx scripts/apply-migrations.ts
  echo "✅  [post-merge] Migrations applied and schema verified."
fi

echo "✅  [post-merge] Setup complete."
