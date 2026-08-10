# Clinic PWA Shell

> **Status:** 🔲 Queued — navigation shell is ✅ Done (#10 merged); PWA manifest and real-data wiring are pending

---

## What & Why

The Clinic PWA (`/app`) must be installable on mobile and tablet as a Progressive Web App. The visual shell (sidebar, top bar, mobile tabs, auth guard) is already built with mock data. This task adds the PWA manifest, service worker, and safe offline fallback — without caching protected clinical data offline.

---

## Done looks like

- A user on Chrome/Safari mobile can tap "Add to Home Screen" and install the ToothHub Clinic app as a standalone PWA.
- The installed app shows the ToothHub icon and name on the home screen.
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

1. **PWA manifest** — add `manifest.json` with name, icons, theme color, `standalone` display mode, and `start_url: /app`.
2. **Service worker** — configure a minimal service worker that caches the app shell only; explicitly excludes all API routes and clinical endpoints from the cache.
3. **Offline fallback page** — build `/offline` page shown when the device has no connection.
4. **Entitlement gating** — call `GET /v1/entitlements/:clinicId` on app load and hide/lock nav items for unavailable features.
5. **Branch context** — display the active branch name in the top bar; allow switching branch from the branch selector dropdown (wired to real data).
