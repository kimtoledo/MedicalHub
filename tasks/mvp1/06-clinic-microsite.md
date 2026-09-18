# Clinic Public Microsite

> **Status:** ✅ Done — all five implementation steps are complete

---

## What & Why

Each clinic gets a public-facing page at `/clinic/[clinicSlug]` that patients can visit to learn about the clinic and book appointments. Clinic admin controls the content through the settings area of the Clinic PWA.

---

## Done looks like

- `/clinic/[clinicSlug]` renders a clinic's public profile with: name, logo, hero text, description, branches, operating hours, services, dentist cards, contact/social links, map link, and a booking CTA.
- If the clinic has `is_public = false`, the page returns 404.
- Data is server-rendered from `GET /v1/public/clinics/[slug]` — no client-side secrets are exposed.
- Clinic admin can update the microsite content from the clinic settings page in the PWA without touching code.
- Published microsites are indexable by search engines.

---

## Out of scope

- Theme customization (MVP 2 — `tasks/mvp2/10-microsite-customization.md`).
- Custom domains (MVP 3).
- Reviews section (MVP 3).

---

## Steps

1. **Public clinic API endpoint** — ✅ `GET /v1/public/clinics/[slug]` applies the operational/published boundary and returns only public profile, branch, service, and published dentist fields.
2. **Microsite page** — ✅ Server-rendered `/clinic/[clinicSlug]` includes hero, description, contact/social links, maps, branches/hours, services, dentist cards, and dynamic SEO metadata.
3. **Booking CTA link** — ✅ Hero and closing CTA link to `/clinic/[clinicSlug]/appointment` for Task 08's booking flow.
4. **Clinic settings content editor** — ✅ Clinic Owners/Admins can update structured hero/profile/contact/social content and per-branch weekly hours from `/app/settings`; changes are tenant-scoped and audited.
5. **Publish/unpublish toggle** — ✅ Clinic Owners/Admins use a confirmed auto-approval policy backed by the existing operational-status and effective microsite-entitlement enforcement; every transition remains audited.

## Shared clinic page layout — 2026-09-18

- User-approved: `/clinic/[clinicSlug]` and every nested page use clinic identity without the main Dentra navigation or marketing footer. Keep a single small “Powered by Dentra.ph” footer.
- Add a shared route layout; remove the homepage's duplicate footer and the booking page's marketing shell. Show clinic logo/name and a back-to-clinic link on booking. Adjust booking scroll spacing locally, preserving dentist-route behavior.
- Document the rule in root and full agent instructions, branding guidelines, and booking task notes so future pages inherit it. Validate desktop/mobile pages, booking/loading/confirmation, missing-clinic handling, and the unaffected marketing site.
- Replit task panel unavailable locally; this implementation proceeds under the user's explicit approval and is tracked here before code changes.
- Completed: shared layout owns the attribution footer; clinic booking uses clinic logo/initials, name, and back link. Local not-found screen and catch-all keep missing/unknown clinic URLs out of the marketing shell.
- Verified desktop/mobile clinic homepage, booking, missing clinic/booking and unknown subpage; one footer, no marketing header, no horizontal overflow, working back navigation. Mocked booking regression checks pass for loader, error recovery, confirmation, duplicate-submit guard, and Book again. All 20 web tests, web typecheck, and production build pass. Existing `next lint` script remains incompatible with the installed Next.js CLI.
