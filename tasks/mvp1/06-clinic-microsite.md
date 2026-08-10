# Clinic Public Microsite

> **Status:** 🔲 Queued — no project task yet

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

1. **Public clinic API endpoint** — `GET /v1/public/clinics/[slug]` returning only publishable fields.
2. **Microsite page** — build `apps/web/app/clinic/[clinicSlug]/page.tsx` with all content sections.
3. **Booking CTA link** — link the "Book Appointment" button to the public booking flow (task `08`).
4. **Clinic settings content editor** — build the microsite content form in `/app/settings` so clinic admin can update text, hours, and social links.
5. **Publish/unpublish toggle** — clinic admin can request publication; Super Admin approves (or auto-approves if policy allows).
