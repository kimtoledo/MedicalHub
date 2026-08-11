# Platform Foundation

> **Status:** 🔵 Active — project tasks #7, #8, and #13 are ✅ Done; #6 and Clinic login wiring remain pending

---

## What & Why

Wire the three infrastructure pillars that every other feature depends on:
1. **PostgreSQL connection** — connect the Replit-managed database and run the first migration.
2. **Fastify API** — scaffold `apps/api` as the backend service that the Next.js frontend calls.
3. **Better Auth** — real sessions for both the Super Admin portal (`/th-admin`) and the Clinic PWA (`/app`), replacing the current localStorage mock.

Nothing beyond the mock UI shell works until this is done.

---

## Done looks like

- `apps/api` exists as an npm workspace with a running Fastify server on its own port.
- `DATABASE_URL` is set in Replit Secrets; `drizzle-kit migrate` applies cleanly against it.
- Super Admin logs in at `/th-admin/login` with real credentials; the mock localStorage flag is gone.
- Clinic staff and dentists log in at `/cl-login` with real credentials; role is derived from the database, not a radio button.
- Session expiration and logout work on both portals.
- Backend endpoints check the session and reject unauthenticated/unauthorized requests.

---

## Out of scope

- Any feature that consumes the API beyond auth and session management.
- Email invite/password-reset flows (can be added later).

---

## Steps

1. **Connect PostgreSQL** — set `DATABASE_URL` in Replit Secrets and verify `drizzle-kit migrate` runs cleanly (#6).
2. **Scaffold Fastify API** — create `apps/api` with TypeScript, health endpoint, Drizzle client, CORS/cookie config for the Next.js frontend (#7).
3. **Configure Better Auth** — ✅ Better Auth is mounted on the API with database sessions, `superAdmin` and `clinicMember` authorization strategies, and tenant-scoped membership resolution (#8).
4. **Wire Super Admin login** — ✅ `/th-admin/login` uses Better Auth through a same-origin proxy; all `/th-admin/(shell)` routes enforce a server-side `super_admin` session check (#13).
5. **Wire Clinic login** — replace the mock at `/cl-login` with a real API call; derive role from the authenticated user's clinic membership returned by the API.
6. **Remove mock artifacts** — delete `localStorage.th_admin_session`, `localStorage.th_clinic_session`, and the demo hint copy from both login pages.

---

## Project task refs

| Ref | Title |
|-----|-------|
| #6 | Connect Replit PostgreSQL and apply the first migration |
| #7 | Scaffold the Fastify API server (apps/api) |
| #8 | Add authentication with Better Auth |
| #13 | Replace mock login with real Super Admin session on sign-in |
