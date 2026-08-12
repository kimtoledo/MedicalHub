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
# drizzle-kit migrate is non-interactive and idempotent.
if [ -z "$DATABASE_URL" ]; then
  echo "❌  [post-merge] DATABASE_URL is not set — deployment cannot continue safely."
  echo "    Add DATABASE_URL to Replit Secrets, then rerun post-merge setup."
  exit 1
else
  echo "==> [post-merge] Applying database migrations..."
  cd packages/db
  DRIZZLE_MIGRATION=true npx drizzle-kit migrate --config=drizzle.config.ts
  cd ../..
  npm run db:check
  echo "✅  [post-merge] Migrations applied and schema verified."
fi

echo "✅  [post-merge] Setup complete."
