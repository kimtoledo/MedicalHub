# Super Admin Platform Settings

> **Status:** ✅ Done
> **Priority:** P2

## What & Why

Replace the `/dentra-admin/settings` placeholder with a deliberately scoped platform settings workspace.

## Done looks like

- ✅ Read-only environment/runtime summary without displaying secrets.
- ✅ Safe platform defaults for public support/contact details and operational toggles backed by validated storage.
- ✅ Super Admin account/session security summary and links to supported account actions.
- ✅ Every mutable setting has explicit validation, confirmation, and immutable audit history.
- ✅ Unsupported infrastructure settings are labeled as deployment-managed rather than presented as fake controls.

### Delivered

- **Runtime summary** (`GET /v1/admin/settings/runtime`): Node environment, app version (read from `package.json`, resolved correctly in both dev/tsx and the bundled production build — the two run modes sit at different relative depths, so the lookup tries both), process uptime, server time, and a live `select 1` database-connectivity probe. No secrets, credentials, or arbitrary env vars are exposed.
- **Platform defaults**: a deliberately narrow, singleton `platform_settings` row (not a generic key-value store) — support email, support phone, and a platform-wide maintenance banner toggle + message. `GET/PATCH /v1/admin/settings/platform`, each field independently zod-validated at the route boundary. Updates diff against the current row and only write (and audit) fields that actually changed; a no-op save doesn't touch `updatedAt` or write a spurious audit row. Every real change is recorded via `writeAudit` (`AuditAction.PLATFORM_SETTINGS_UPDATED`).
- **Session security**: extended `AuthServices` with optional `listSessions`/`revokeSession`/`revokeOtherSessions`, thin wrappers around better-auth's own built-in `auth.api.listSessions`/`revokeSession`/`revokeOtherSessions` — no new auth logic, no token handling outside better-auth. Scoped to the caller's **own** sessions only (not other users' — that's a different, out-of-scope feature). `GET /v1/admin/settings/sessions`, `POST .../sessions/revoke`, `POST .../sessions/revoke-others`. Made optional on `AuthServices` rather than required, since ~37 existing test files construct `AuthServices` mocks and none of them need to know about session management.
- Verified the runtime summary, the update/no-op-diff behavior, and the app-version resolution (both dev and the actual bundled `dist/server.js` output) directly against the real dev database and build artifact.
- Verified 418 passing API tests, repository-wide TypeScript checks, and production web/API builds.

## Out of scope

- Secret editing, database credentials, arbitrary environment variables, or destructive maintenance controls.
