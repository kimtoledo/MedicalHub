# Search and Discovery

> **Status:** 🔜 Future — MVP 3

---

## What & Why

Patients looking for a dentist or clinic need a searchable, location-aware directory. Good search ranking and SEO-friendly pages drive organic patient acquisition for ToothHub and its member clinics.

---

## Done looks like

- A patient can search for clinics or dentists by location (city, area, or "near me" using browser geolocation).
- Filters: specialty, service offered, availability (has open slots this week), distance, branch hours.
- Search results are ranked by a defined algorithm (proximity, profile completeness, verification status).
- Directory pages (`/clinics`, `/dentists`) are server-rendered with structured data markup for SEO (Schema.org `Dentist`, `MedicalOrganization`).
- A result that has no open slots in the next 7 days is clearly labeled as such.
- Clicking a result navigates to the clinic microsite or dentist profile.

---

## Out of scope

- Paid placement / sponsored results.
- Third-party review aggregation (e.g. Google reviews).
