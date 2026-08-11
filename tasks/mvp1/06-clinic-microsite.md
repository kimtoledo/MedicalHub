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
