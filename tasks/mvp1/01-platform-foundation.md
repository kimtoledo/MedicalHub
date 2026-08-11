# Platform Foundation

> **Status:** ✅ Done — PostgreSQL, Fastify, Better Auth, and both protected login surfaces are live

---

## What & Why

Wire the three infrastructure pillars that every other feature depends on:
1. **PostgreSQL connection** — connect the Replit-managed database and run the first migration.
2. **Fastify API** — scaffold `apps/api` as the backend service that the Next.js frontend calls.
3. **Better Auth** — real sessions for both the Super Admin portal (`/dentra-admin`) and the Clinic PWA (`/app`), replacing the current localStorage mock.

Nothing beyond the mock UI shell works until this is done.

---

## Done looks like

- `apps/api` exists as an npm workspace with a running Fastify server on its own port.
- `DATABASE_URL` is set in Replit Secrets; `drizzle-kit migrate` applies cleanly against it.
- Super Admin logs in at `/dentra-admin/login` with real credentials; the mock localStorage flag is gone.
- Clinic staff and dentists log in at `/cl-login` with real credentials; role is derived from the database, not a radio button.
- Session expiration and logout work on both portals.
- Backend endpoints check the session and reject unauthenticated/unauthorized requests.

---

## Out of scope

- Any feature that consumes the API beyond auth and session management.
- Email invite/password-reset flows (can be added later).

---

## Steps

1. **Connect PostgreSQL** — ✅ `DATABASE_URL` is configured and all Drizzle migrations through `0014_merge_history_reconciliation.sql` apply in order (#6).
2. **Scaffold Fastify API** — ✅ `apps/api` provides the TypeScript Fastify server, health endpoint, Drizzle client, CORS/cookie configuration, and independently runnable dev/production scripts (#7).
3. **Configure Better Auth** — ✅ Better Auth is mounted on the API with database sessions, `superAdmin` and `clinicMember` authorization strategies, and tenant-scoped membership resolution (#8).
4. **Wire Super Admin login** — ✅ `/dentra-admin/login` uses Better Auth through a same-origin proxy; all `/dentra-admin/(shell)` routes enforce a server-side `super_admin` session check (#13).
5. **Wire Clinic login** — ✅ `/cl-login` uses Better Auth through the same-origin proxy; role (clinic staff vs. dentist) is derived from `clinicMemberships` returned by `/v1/session-context`, not a radio button. All `/app/(shell)` routes enforce a server-side `clinicMember` session check.
6. **Remove mock artifacts** — ✅ the legacy Super Admin and Clinic localStorage session flags, `AdminAuthGuard.tsx`, `ClinicAuthGuard.tsx`, and the demo hint copy on both login pages are all gone.

---

## Project task refs

| Ref | Title |
|-----|-------|
| #6 | Connect Replit PostgreSQL and apply the first migration — ✅ Done |
| #7 | Scaffold the Fastify API server (apps/api) |
| #8 | Add authentication with Better Auth |
| #13 | Replace mock login with real Super Admin session on sign-in |
