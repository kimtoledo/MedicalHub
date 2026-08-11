# Patient Management

> **Status:** ✅ Done

---

## What & Why

Clinic staff need to register patients, view their profiles, and access their medical and dental histories. Patient records are strictly scoped to a single clinic — a patient at Clinic A is invisible to Clinic B even if the same person visits both.

---

## Done looks like

**Patient list (`/app/patients`):**
- Searchable, paginated list of patients registered to the clinic.
- Columns: patient number, name, mobile number, status, last appointment, next appointment.
- "New Patient" button opens a registration slide-over.

**Patient profile:**
- Demographics: first/last name, date of birth, sex, civil status.
- Contact: mobile, email, address.
- Emergency contact and (where applicable) guardian for minors.
- Appointment history: sortable list with status and dentist.
- Navigation links to clinical sections: histories, encounters, odontogram, treatments.

**Medical history:**
- Baseline questionnaire: allergies, current medications, major conditions, pregnancy status (where relevant), physician information, additional notes.
- Every update stores the version, timestamp, and actor — old versions are not silently overwritten.

**Dental history:**
- Last dental visit, prior treatments, sensitivity/bleeding/pain flags, oral habits, orthodontic history, chief concerns, notes.
- Same versioned-update strategy as medical history.

---

## Out of scope

- Patient portal / patient login (MVP 3).
- Cross-clinic record merging (requires explicit consent model — MVP 3).
- Insurance/HMO fields (MVP 2 or later).

---

## Steps

1. **Patient list page** — ✅ `/app/patients` and the dentist view use a protected, entitlement-enforced searchable/paginated API and responsive registration slide-over.
2. **Patient profile page** — ✅ Tenant-scoped profiles show demographics, contact/address, emergency contact, guardian, and clinical navigation.
3. **Medical history form** — ✅ Each submission appends a new actor/timestamped medical questionnaire version and an audit event.
4. **Dental history form** — ✅ Each submission appends a new actor/timestamped dental questionnaire version and an audit event.
5. **Appointment history tab** — ✅ Sortable past/upcoming appointments include branch, dentist, service, status, and encounter links when available.
