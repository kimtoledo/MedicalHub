# Clinic PWA Shell

> **Status:** ✅ Done

---

## What & Why

The Clinic PWA (`/app`) must be installable on mobile and tablet as a Progressive Web App. The visual shell (sidebar, top bar, mobile tabs, auth guard) is already built with mock data. This task adds the PWA manifest, service worker, and safe offline fallback — without caching protected clinical data offline.

---

## Done looks like

- A user on Chrome/Safari mobile can tap "Add to Home Screen" and install the Dentra.ph Clinic app as a standalone PWA.
- The installed app shows the Dentra.ph icon and name on the home screen.
- If the device goes offline, the app shows a "You're offline" screen — it does not serve stale patient or clinical data from cache.
- The app shell (navigation, layout) loads fast on a slow connection.
- Module navigation respects entitlements: menu items for features not included in the clinic's package are hidden or show an upgrade prompt.
- The active clinic name and current branch are visible in the top bar (wired to real data).

---

## Out of scope

- True offline clinical editing (explicitly excluded from MVP 1 and MVP 2; see `tasks/mvp3/10-offline-mode.md`).
- Push notifications (MVP 2).

---

## Steps

1. **PWA manifest** — ✅ `apps/web/public/manifest.json` (name, icons, theme color, `standalone`, `start_url: /app`), linked from the `(clinic)` route group only so admin/marketing pages stay out of PWA scope.
2. **Service worker** — ✅ `apps/web/public/sw.js`: caches the static shell only (manifest, icons, `/offline`), network-first for navigations, and explicitly bypasses the cache for any `/api/*` or `/v1/*` request so clinical data is never served stale.
3. **Offline fallback page** — ✅ `/offline` shown when a navigation fetch fails.
4. **Entitlement gating** — ✅ The server-rendered app shell resolves `GET /v1/entitlements/:clinicId`; desktop, drawer, and mobile navigation are filtered by canonical feature keys.
5. **Branch context** — ✅ Protected `GET /v1/clinic/:clinicId/context` returns only membership-authorized active branches; the shell shows the real clinic/current branch and persists valid branch selection locally.
