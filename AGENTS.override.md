# MedicalHub Deployment Scope

## Goal

Deploy the existing MedicalHub application using:

- `apps/web` → Vercel
- `apps/api` → Railway
- PostgreSQL → Neon
- Preferred region → Singapore / Southeast Asia

The Neon project already exists.

## Scope Rule

Focus ONLY on deployment.

Do not refactor, redesign, clean up, upgrade, or improve unrelated application code.

## Allowed Changes

You ARE allowed to create or modify anything genuinely required for deployment, including:

- Railway configuration
- Vercel configuration
- deployment environment configuration
- build configuration
- start commands
- monorepo/workspace deployment settings
- runtime configuration
- health-check configuration
- CORS configuration required for Vercel ↔ Railway
- production URL configuration
- database migration/deployment configuration
- deployment scripts
- Dockerfile / container configuration if actually required
- `.dockerignore`
- `railway.json`
- `vercel.json`
- GitHub deployment workflow/configuration if required
- environment variable documentation
- deployment-related Markdown documentation

Existing application configuration may be modified ONLY when necessary to make the existing application deploy correctly.

## Application Code Restrictions

Do NOT modify:

- business logic
- database models/schema unless deployment specifically requires it
- UI behavior
- application features
- validation rules
- authentication behavior except production deployment URLs/configuration
- unrelated dependencies
- styling
- unrelated tests
- unrelated documentation

Do not refactor working code.

Do not perform dependency upgrades unless the existing version prevents deployment.

## Smallest-Change Rule

If deployment requires a repository change:

1. Explain the deployment problem.
2. Identify the exact file that needs changing.
3. Make the smallest possible deployment-specific change.
4. Do not include unrelated cleanup in the same change.

## Secrets

Never commit:

- `DATABASE_URL`
- passwords
- API keys
- authentication secrets
- service credentials

Use platform environment variables for secrets.

Never expose backend secrets using `NEXT_PUBLIC_*`.

## Deployment Architecture

Expected production flow:

Browser
  ↓
Vercel
  apps/web
  ↓
Railway
  apps/api
  ↓
Neon
  PostgreSQL

## Deployment Sequence

Work in this order:

1. Inspect repository
2. Verify Neon/Drizzle requirements
3. Apply existing database migrations
4. Determine Railway monorepo configuration
5. Deploy API to Railway
6. Verify API and database connectivity
7. Determine Vercel monorepo configuration
8. Deploy web app to Vercel
9. Configure production frontend/backend URLs
10. Configure CORS/auth production origins if required
11. Test Vercel → Railway → Neon end-to-end
12. Document final deployment configuration

Do not work on notifications yet unless requested.

## Railway

Determine from the repository:

- root directory strategy
- install command
- build command
- start command
- Node version/runtime requirements
- required environment variables
- health-check path
- deployment region
- public domain configuration

Prefer using the existing npm workspace structure rather than restructuring the repository.

## Neon

Determine:

- existing Drizzle configuration
- existing migration command
- required `DATABASE_URL`
- whether pooled or direct connection is appropriate for this backend
- whether any migration must run before API startup

Do not alter database schema simply for deployment convenience.

## Vercel

Determine:

- root/workspace configuration
- build command
- output/runtime expectations
- required public environment variables
- API base URL configuration
- production domain configuration

## Working Style

Inspect before changing.

Use existing commands whenever possible.

Run builds/tests after deployment-specific configuration changes.

If something already works, leave it alone.

Do not solve unrelated warnings.

When a browser/platform action is required, tell the user exactly what to configure.

## First Task

Inspect the repository and make NO changes yet.

Report:

1. Neon migration command
2. Railway root/workspace configuration
3. Railway build command
4. Railway start command
5. Railway environment variables
6. Railway deployment blockers
7. Vercel root/workspace configuration
8. Vercel build configuration
9. Vercel environment variables
10. Any repository changes actually required for deployment

Classify each required repository change as:

- REQUIRED
- OPTIONAL
- NOT NEEDED

Then stop.