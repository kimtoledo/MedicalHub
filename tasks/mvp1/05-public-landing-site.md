# Public Landing Site

> **Status:** 🔲 Queued — no project task yet
> The homepage sections exist as static components; clinic/dentist directories need to be wired to real data.

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

1. **Clinic directory** — build `/clinics` page fetching published clinics from `GET /v1/public/clinics`; add search and simple filters.
2. **Dentist directory** — build `/dentists` page fetching published dentist profiles from `GET /v1/public/dentists`.
3. **Homepage refinement** — update static stat sections (clinic count, dentist count) to pull from an API summary endpoint.
4. **SEO/meta** — add `<title>`, `<meta description>`, and Open Graph tags to all public pages.
5. **Accessibility pass** — check headings, alt text, focus states, and color contrast on all public sections.
