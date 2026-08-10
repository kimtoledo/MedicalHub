# Dentist Public Profile Page

> **Status:** 🔲 Queued — no project task yet

---

## What & Why

Each dentist gets a public profile at `/dentists/[dentistSlug]` showing their professional info and affiliated clinics, with a booking CTA. A dentist can exist independently (no clinic ownership) and be affiliated with multiple clinics.

---

## Done looks like

- `/dentists/[dentistSlug]` renders: name, photo, biography, specialty/service tags, professional information, and affiliated clinic cards (each with a location and book CTA).
- If `is_public = false` or no published profile exists, the page returns 404.
- A patient can tap "Book at [Clinic Name]" from a dentist's profile and go to the booking flow pre-filled with that dentist.
- Pages are server-rendered and crawlable.

---

## Out of scope

- Dentist self-editing of their public profile via a separate login (they do it through the Clinic PWA; Super Admin can also edit).
- Verification badges (MVP 3).
- Reviews section (MVP 3).

---

## Steps

1. **Public dentist API endpoint** — `GET /v1/public/dentists/[slug]` with only publishable fields.
2. **Profile page** — build `apps/web/app/dentists/[dentistSlug]/page.tsx` with all sections.
3. **Affiliated clinics section** — show each clinic card with branch location and a booking link.
4. **Booking CTA** — link to `/dentists/[dentistSlug]/appointment` (see task `08`).
