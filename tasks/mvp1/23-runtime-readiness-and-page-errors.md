# Runtime Readiness and Truthful Page Errors

> **Status:** 🔲 Queued
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
