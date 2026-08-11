# Public Landing Site

> **Status:** ✅ Done — all five implementation steps are complete

---

## What & Why

The public site (`/`) is the face of Dentra.ph. It must be responsive, indexable, and show real data from the database once clinics and dentists are onboarded. The current landing page is fully static.

---

## Done looks like

- `/` (homepage) renders correctly on mobile, tablet, and desktop with no layout regressions.
- `/clinics` lists all published clinics from the database — paginated and filterable by location/service.
- `/dentists` lists all published dentist profiles from the database — paginated and filterable by specialty.
- No protected tenant data (patient records, internal notes, unpublished clinics) appears in any public payload.
- Directories show only `is_public = true` records.
- Pages are server-rendered and crawlable (Next.js SSR/SSG).
- The "Book a Demo" CTA links to a working form or external link.

---

## Out of scope

- Location-aware search and ranking (MVP 3).
- Reviews/ratings (MVP 3).
- Custom domains for clinic pages (MVP 3).

---

## Steps

1. **Clinic directory** — ✅ `/clinics` server-renders operational published clinics from `GET /v1/public/clinics` with name, location, and service filters plus pagination.
2. **Dentist directory** — ✅ `/dentists` server-renders verified published profiles from `GET /v1/public/dentists` with search, specialty filtering, and pagination.
3. **Homepage refinement** — ✅ Homepage clinic/dentist counts use the cached public summary endpoint with graceful API fallback.
4. **SEO/meta** — ✅ Global and directory-specific titles, descriptions, and Open Graph metadata are present and verified in rendered HTML.
5. **Accessibility pass** — ✅ Public navigation, directory search labels, focus states, responsive headings, menu state attributes, logo alt text, and working CTA/footer links were reviewed and corrected.
