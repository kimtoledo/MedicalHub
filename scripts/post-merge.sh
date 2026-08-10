#!/bin/bash
# =============================================================================
# ToothHub PH — Post-merge setup script
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
  echo "⚠️  [post-merge] DATABASE_URL is not set — skipping database migrations."
  echo "    Add DATABASE_URL to Replit Secrets to enable automatic migrations."
else
  echo "==> [post-merge] Applying database migrations..."
  cd packages/db
  DRIZZLE_MIGRATION=true npx drizzle-kit migrate --config=drizzle.config.ts
  cd ../..
  echo "✅  [post-merge] Migrations applied."
fi

echo "✅  [post-merge] Setup complete."
