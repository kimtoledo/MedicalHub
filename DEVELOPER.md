# Dentra.ph — Developer Setup Guide

This guide covers getting the project running in three environments: **Replit**, **VS Code / local**, and **Codex**. Read the relevant section for your environment, then refer to the [Database Workflow](#database-workflow) section before making any schema changes.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Replit setup](#replit-setup)
3. [Local setup (VS Code)](#local-setup-vs-code)
4. [Codex setup](#codex-setup)
5. [Environment variables reference](#environment-variables-reference)
6. [Database workflow](#database-workflow)
7. [Running the app](#running-the-app)
8. [Common issues](#common-issues)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions |
| npm | 10+ | Comes with Node 20 |
| Git | Any recent | For cloning and committing migrations |
| PostgreSQL | Hosted on Replit | No local install needed — connect remotely via `DATABASE_URL` |

> **Note:** The project uses **npm workspaces** (not pnpm) when running on Replit. The docs and spec reference `pnpm` as the long-term target, but the current Replit environment uses npm. Use `npm` commands as shown in this guide.

---

## Replit setup

If you're working directly in Replit (using Replit Agent or the Replit editor):

1. **Open the Repl** — the project is already imported.
2. **Secrets are pre-configured** — `DATABASE_URL` and either `BETTER_AUTH_SECRET` or the legacy `SESSION_SECRET` fallback are in Replit Secrets. No `.env` file needed.
3. **Click Run** (or use the **"Start application"** workflow) — this runs `cd apps/web && npx next dev -p 5000`.
4. **The preview pane** shows the app at port 5000.

To apply migrations on Replit:
```bash
npm run db:migrate
```

Migrations also run **automatically** after every task merge via `scripts/post-merge.sh`.

---

## Local setup (VS Code)

### 1. Clone the repository

```bash
git clone <repo-url>
cd dentra-ph
```

### 2. Install Node.js 20

```bash
# Using nvm
nvm install 20
nvm use 20

# Or using fnm
fnm install 20
fnm use 20

node --version   # should print v20.x.x
```

### 3. Install dependencies

```bash
npm install
```

This installs all packages from the root `node_modules` — both app and database dependencies.

### 4. Set up environment variables

```bash
cp .env.example .env
```

Now open `.env` and fill in the values:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Replit → your project → Secrets tab → copy `DATABASE_URL` |
| `BETTER_AUTH_SECRET` | Replit → Secrets → copy, or generate: `openssl rand -hex 32` |
| `SUPER_ADMIN_PASSWORD` | Set a synthetic demo-only password of at least 10 characters |
| `CLINIC_DEMO_PASSWORD` | Set a synthetic demo-only password of at least 10 characters for seeded clinic staff and dentists |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:5001` for local dev |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` for local dev |

> ⚠️ **Never commit `.env`.** It is in `.gitignore`. If you accidentally stage it, run `git rm --cached .env`.

### 5. Apply database migrations

```bash
npm run db:migrate
```

This connects to the Replit PostgreSQL using your `DATABASE_URL`, applies pending migrations, and verifies the required schema objects exist. It is safe to run multiple times (idempotent). A non-zero exit means the API must not be started until the migration problem is resolved.

To run only the non-mutating readiness check:

```bash
npm run db:check
```

If Drizzle says migrations succeeded but the readiness check reports migrations `0015`–`0033` objects as missing, run the one-time ordered reconciliation:

```bash
npm run db:reconcile-order
```

This executes the existing committed migrations through Drizzle with corrected in-memory ordering. It does not edit migration files or run manually copied SQL.

### 6. Start the frontend

```bash
npm run dev
```

The Next.js app starts at [http://localhost:5001](http://localhost:5001).

Start the API separately in another terminal:
```bash
npm run api:dev
```

The API listens on [http://localhost:3001](http://localhost:3001). Use
`GET /health` for process liveness and `GET /v1/health` to verify the API can
reach PostgreSQL. Better Auth is mounted at `/v1/auth/*`; `GET
/v1/session-context` returns the signed-in user's server-resolved platform role
and active clinic memberships. `GET /v1/admin/clinics` is restricted to Super
Admin and supports `search`, `status`, `page`, and `pageSize` query parameters.

---

## Codex setup

Codex reads `AGENTS.md` (root) and `docs/AGENTS.md` for instructions. Before starting work:

### 1. Set the environment variable

In your Codex session, set:
```
DATABASE_URL = <value from Replit Secrets>
```

### 2. Apply any pending migrations

```bash
npm run db:migrate
```

### 3. Read the agent instructions

- **`AGENTS.md`** — quick reference for Codex
- **`docs/AGENTS.md`** — full Codex instructions including domain rules, security invariants, and the migration workflow
- **`docs/README.md`** — complete product spec and domain rules
- **`docs/MVP_1.md`** — current MVP scope

### 4. Schema change workflow

Before changing any schema, read [Database Workflow](#database-workflow) below — especially the golden rules.

---

## Environment variables reference

All variables are documented in `.env.example`. Here is a summary:

| Variable | Required | Description | Source |
|---|---|---|---|
| `DATABASE_URL` | ✅ Always | PostgreSQL connection string | Replit Secrets |
| `BETTER_AUTH_SECRET` | ✅ API | Better Auth signing secret (minimum 32 characters) | Replit Secrets / generate locally |
| `SESSION_SECRET` | Fallback | Legacy fallback when `BETTER_AUTH_SECRET` is omitted | Replit Secrets |
| `SUPER_ADMIN_PASSWORD` | ✅ Demo seed | Initial/reset password for `admin@dentra.ph` when running `npm run db:seed` | Local `.env` / Replit Secrets |
| `CLINIC_DEMO_PASSWORD` | ✅ Demo seed | Shared synthetic password for seeded clinic staff and dentist demo accounts | Local `.env` / Replit Secrets |
| `NEXT_PUBLIC_APP_URL` | ✅ Frontend | Public URL of the Next.js app | `http://localhost:5001` locally |
| `NEXT_PUBLIC_API_URL` | ✅ Frontend | Public URL of the Fastify API | `http://localhost:3001` locally |
| `API_INTERNAL_URL` | Optional | Server-only API URL for the Next.js auth proxy/session guard | Defaults to `NEXT_PUBLIC_API_URL` |
| `BETTER_AUTH_URL` | ✅ API | Base URL for Better Auth | Same as API URL |
| `STORAGE_BUCKET` | When storage is wired | Object storage bucket name | Provider dashboard (future) |

**On Replit:** all secrets are in the Replit Secrets panel — never in code or committed files.  
**Locally:** copy values from Replit Secrets into your `.env` file.  
**In Codex:** set as session environment variables.

---

## Database workflow

The project uses **Drizzle ORM** for schema definition and **Drizzle Kit** for migrations. Follow this workflow for every schema change — whether you're using Replit Agent, VS Code, or Codex.

### Schema files

All tables are defined in `packages/db/src/schema/`:

| File | Tables |
|---|---|
| `clinics.ts` | `clinics` |
| `branches.ts` | `branches` |
| `dentists.ts` | `dentists`, `dentist_branch_assignments` |
| `users.ts` | `users`, `clinic_memberships` |
| `auth.ts` | `accounts`, `sessions`, `verifications` |
| `patients.ts` | `patients`, `patient_medical_histories` |
| `appointments.ts` | `services`, `appointments`, `appointment_status_history` |
| `subscriptions.ts` | `packages`, `package_features`, `clinic_subscriptions`, `clinic_feature_overrides` |
| `audit.ts` | `audit_events` |

### Making a schema change

```bash
# Step 1 — edit the schema
# Edit packages/db/src/schema/<entity>.ts

# Step 2 — generate the migration SQL
npm run db:generate
# → writes a new file to packages/db/migrations/

# Step 3 — review the generated SQL
# Open the new file in packages/db/migrations/ and verify it looks correct

# Step 4 — commit BOTH the schema change and the migration file
git add packages/db/src/schema/ packages/db/migrations/
git commit -m "db: <description of what changed and why>"

# Step 5 — push / open PR
# On Replit: after merge, post-merge.sh auto-applies the migration
# Locally: run npm run db:migrate after pulling the latest changes
```

### Applying migrations (local)

```bash
npm run db:migrate
```

Or use the helper script, which adds pre-flight checks:
```bash
./scripts/apply-migrations.sh
```

### Viewing the schema in a browser UI

```bash
npm run db:studio
# Opens Drizzle Studio at http://localhost:4983
```

### Golden rules — must not violate

| Rule | Why |
|---|---|
| **Never hand-edit an applied migration file** | Drizzle tracks which migrations have run by file hash — editing breaks the checksum |
| **Never run raw SQL (`ALTER TABLE`) on the shared DB** | Schema state diverges from migration files; future `db:generate` produces wrong diffs |
| **Always commit the `.sql` file before merging** | The post-merge script applies migrations from committed files only |
| **Use `FeatureKey` from `@dentra/shared` for entitlement checks** | Never use plan/package names (`plan === "pro"`) in authorization logic |
| **Filter every tenant-scoped query by `clinic_id`** | Patient and clinical data must never cross clinic boundaries |

### How post-merge automation works (Replit)

`scripts/post-merge.sh` is registered as Replit's post-merge script. After every task agent merge it automatically:
1. Runs `npm install` (picks up new dependencies)
2. Runs `drizzle-kit migrate` (applies any new migration files)

No manual step is needed on Replit after a merge.

---

## Running the app

> **For AI agents (Claude, Codex, etc.):** once the user asks for the local dev servers to be running (to test in the browser), keep them running across turns — don't stop `npm run dev` / `npm run api:dev` as a "cleanup" step after applying a change. If the user reports `ERR_CONNECTION_REFUSED` on `localhost:5001`/`:3001`, that means the server was stopped (or crashed) — check with `lsof -i :5001` / `lsof -i :3001`, then restart it yourself rather than asking the user to do it. Only stop the servers if the user explicitly asks, or if a port conflict requires bouncing the process to pick up a config change (e.g. `next.config.js`).

### Frontend (Next.js)

```bash
npm run dev          # starts locally at http://localhost:5001
npm run dev:safe     # safely replaces a stale Dentra process, then starts the frontend
npm run build        # production build
```

The Replit **"Start application"** workflow runs `npm run dev` automatically.

### Backend API (Fastify)

```bash
npm run api:dev      # development server with watch mode, port 3001
npm run api:start    # run the production bundle after npm run build
```

After `npm run db:seed`, sign in at
[http://localhost:5001/dentra-admin/login](http://localhost:5001/dentra-admin/login)
with `admin@dentra.ph` and the value of `SUPER_ADMIN_PASSWORD`. Re-running the
seed updates that credential without creating a duplicate auth account.

Clinic staff and dentists sign in at
[http://localhost:5001/cl-login](http://localhost:5001/cl-login). Use one of the
seeded clinic emails and the value of `CLINIC_DEMO_PASSWORD`; the application
derives the user role from the authenticated clinic membership.

### Database scripts

```bash
npm run db:generate  # generate migration from schema diff
npm run db:migrate   # apply pending migrations
npm run db:studio    # open Drizzle Studio UI
```

### Helper scripts

```bash
./scripts/generate-migration.sh   # guided migration generator with instructions
./scripts/apply-migrations.sh     # apply migrations with pre-flight checks
```

---

## Common issues

### `DATABASE_URL is not set`

**Symptom:** Error on startup or when running `npm run db:migrate`.

**Fix:**
- **Replit:** Go to your Repl → Secrets → confirm `DATABASE_URL` exists. If not, add it.
- **Local:** Confirm your `.env` file exists and contains `DATABASE_URL=postgresql://...`. Run `cat .env | grep DATABASE_URL` to check.
- **Codex:** Set `DATABASE_URL` as a session environment variable.

---

### Stale `.next` cache (blank page or 500 errors on JS chunks)

**Symptom:** The app loads but CSS/JS chunks return 500 errors; the page renders unstyled.

**Fix:**
```bash
rm -rf apps/web/.next
# Then restart the dev server
npm run dev
```

---

### Local port 5001 already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::5001`

**Fix:**
```bash
# Safely stops a stale Dentra listener and restarts the frontend
npm run dev:safe
```

The safe-start command will not stop unrelated programs. It reports the process
using port 5001 and leaves it untouched so you can decide whether to close it.

---

### `workspace:*` dependency error

**Symptom:** `npm error Unsupported URL Type "workspace:"`

**Cause:** The `workspace:*` protocol is pnpm-only. This project uses npm workspaces on Replit.

**Fix:** Change `"workspace:*"` to `"*"` in the relevant `package.json` and re-run `npm install`.

---

### Migration already applied / checksum mismatch

**Symptom:** `drizzle-kit migrate` fails with a checksum or "already applied" error.

**Cause:** A migration file was edited after being applied, or a migration was manually applied to the database.

**Fix:** Never edit applied migration files. Create a new migration instead:
```bash
# Revert the hand-edit in the migration file (use git to restore it)
git checkout packages/db/migrations/<filename>.sql

# Make your schema changes in the schema file instead
# Then generate a new migration
npm run db:generate
```

---

### `Cannot find module` on a `@dentra/*` import

**Symptom:** TypeScript or Node.js can't resolve `@dentra/shared` or `@dentra/db`.

**Fix:** These packages are in the monorepo and resolved through npm workspaces. Run `npm install` from the repo root to link them:
```bash
npm install
```

---

*For product spec, domain rules, and architecture, see [`docs/README.md`](docs/README.md).*  
*For agent-specific instructions, see [`AGENTS.md`](AGENTS.md) (Codex), [`CLAUDE.md`](CLAUDE.md) (Claude), or [`replit.md`](replit.md) (Replit Agent).*
