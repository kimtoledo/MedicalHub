# Search and Discovery

> **Status:** 🔵 Active — discovery baseline delivered

---

## What & Why

Patients looking for a dentist or clinic need a searchable, location-aware directory. Good search ranking and SEO-friendly pages drive organic patient acquisition for Dentra.ph and its member clinics.

---

## Done looks like

- A patient can search for clinics or dentists by location (city, area, or "near me" using browser geolocation).
- Filters: specialty, service offered, availability (has open slots this week), distance, branch hours.
- Search results are ranked by a defined algorithm (proximity, profile completeness, verification status).
- Directory pages (`/clinics`, `/dentists`) are server-rendered with structured data markup for SEO (Schema.org `Dentist`, `MedicalOrganization`).
- A result that has no open slots in the next 7 days is clearly labeled as such.
- Clicking a result navigates to the clinic microsite or dentist profile.

### Delivered baseline

- Added optional branch latitude/longitude and validated geospatial distance filters (`latitude`, `longitude`, `maxDistanceKm`) to the public clinic directory.
- Results expose distance metadata and remain bounded by the published-clinic/public-dentist visibility boundary.
- **Open-slot computation and ranking weights (this update):** clinic and dentist directory results now carry `hasOpenSlotSoon`, computed in bulk (batched branch/assignment/appointment queries, no N+1) by checking the next 7 days of each branch's parsed operating hours against its assigned dentists' existing appointments — reusing the exact slot-generation/overlap logic the real booking engine uses (`parseHours`/`generatedSlots`/`overlaps`, exported from `booking-service.ts` for this), so the badge reflects genuine availability rather than a guess. A result with none is labeled “No open slots this week” per the task's own requirement.
- Clinic ranking now applies verification tier (`verified` > `pending` > `unverified`) at the SQL level — correct across pages, not just within one — with profile-completeness and open-slot status as an in-page refinement, mirroring the pre-existing (and equally page-scoped) distance-sort behavior; when a location is given, distance stays primary and rank becomes the tie-break.
- **Schema.org markup (this update):** clinic microsites emit `Dentist` JSON-LD (address, geo when a branch has coordinates, opening hours parsed from the same free-text format the booking engine reads, and `aggregateRating` only when at least one review exists — never a fabricated 0-review rating); dentist profiles emit `Person` JSON-LD with `worksFor` linking to affiliated clinics. Both directory listing pages (`/clinics`, `/dentists`) emit an `ItemList` of the current page's results. All JSON-LD is escaped (`<` → `<`) before being written via `dangerouslySetInnerHTML`, since the underlying strings are clinic/dentist-authored content and an unescaped `</script>` sequence would break out of the script context. Verified by running both apps and inspecting the actual rendered `<script type=”application/ld+json”>` output, not just a typecheck.
- Remaining: browser “near me” geolocation UI.

---

## Out of scope

- Paid placement / sponsored results.
- Third-party review aggregation (e.g. Google reviews).
