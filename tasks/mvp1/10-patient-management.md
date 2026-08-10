# Patient Management

> **Status:** 🔲 Queued — no project task yet

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

1. **Patient list page** — wire `/app/patients` to `GET /v1/clinic/patients` with search and pagination; build "New Patient" registration slide-over.
2. **Patient profile page** — build `/app/patients/[patientId]` with demographics, contact, and emergency contact tabs.
3. **Medical history form** — versioned medical history editor within the patient profile; call `POST /v1/clinic/patients/[id]/medical-history`.
4. **Dental history form** — versioned dental history editor; call `POST /v1/clinic/patients/[id]/dental-history`.
5. **Appointment history tab** — list past/upcoming appointments for this patient with links to encounters.
