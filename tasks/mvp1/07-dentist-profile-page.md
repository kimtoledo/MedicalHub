# Dentist Public Profile Page

> **Status:** ✅ Done

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

1. **Public dentist API endpoint** — ✅ `GET /v1/public/dentists/[slug]` exposes only the verified, published professional profile and active public affiliations.
2. **Profile page** — ✅ `apps/web/app/dentists/[dentistSlug]/page.tsx` renders the complete profile with server-side metadata and 404 handling.
3. **Affiliated clinics section** — ✅ Cards show operational, published clinics, active branches, locations, and available clinic services.
4. **Booking CTA** — ✅ Each affiliation links to `/dentists/[dentistSlug]/appointment` with its clinic and branch preselected for Task `08`.
