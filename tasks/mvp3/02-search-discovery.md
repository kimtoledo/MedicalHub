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
- Remaining: browser “near me” UI, open-slot computation, ranking weights, and Schema.org markup on directory/profile pages.

---

## Out of scope

- Paid placement / sponsored results.
- Third-party review aggregation (e.g. Google reviews).
