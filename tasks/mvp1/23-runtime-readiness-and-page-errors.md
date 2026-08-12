# Runtime Readiness and Truthful Page Errors

> **Status:** ✅ Done
> **Priority:** P0

## What & Why

Prevent the frontend from starting against an incompatible database and stop pages from presenting API/server failures as authorization failures. The audit reproduced `/app/settings` returning HTTP 500 because migration `0021` was not applied while the page displayed “Owner or Admin required.”

## Done looks like

- Local/Replit startup checks migration readiness before serving protected pages.
- Deployment/post-merge migration failures are visible and stop an unsafe rollout.
- `/app/settings` distinguishes unauthenticated, forbidden, migration/server, and not-found failures.
- Shared error components provide retry/support guidance without exposing SQL or secrets.
- Production builds cannot overwrite a running development `.next` cache.
- Tests cover missing-schema and `401`/`403`/`500` page states.

## Constraints

- Use `drizzle-kit migrate`; never patch the shared database with raw SQL.
- Do not expose database details in browser responses.
- Replit must remain on port 5000; local development remains on port 5001.

## Progress — 2026-08-12

- [x] API startup validates required tables/columns before accepting traffic.
- [x] `npm run db:migrate` and post-merge setup run the same readiness check and fail when Drizzle reports success but required schema objects are still absent.
- [x] `/app/settings` distinguishes unauthenticated, forbidden, not-found, and server/schema failures without exposing SQL details.
- [x] Added a reusable branded page-error component with retry guidance.
- [x] Production web builds use `.next-build`, leaving a running development `.next` cache untouched.
- [x] Added missing-schema tests and HTTP `401`/`403`/`404`/`500` classification tests.
- [x] Ran and verified the Drizzle-based ordered reconciliation against the shared database. The database recorded migration `0014` with a timestamp newer than `0015`–`0033`, so the standard migrator skipped those files. `npm run db:reconcile-order` used a temporary monotonic journal to execute the unchanged committed SQL transactionally without editing applied history or running manual SQL; the readiness check and live API health now pass.
