# New Clinic Roles

> **Status:** 🔜 Future — MVP 2

---

## What & Why

MVP 1 ships with three clinic roles: Owner/Admin, Dentist, and Receptionist/Assistant. MVP 2 adds Cashier and Inventory Staff, and makes permissions more granular so clinics can fine-tune what each role can access.

---

## Done looks like

- Two new role presets are available when inviting clinic staff: **Cashier** and **Inventory Staff**.
- Cashier permissions: access billing and payments; cannot access clinical encounters or odontogram.
- Inventory Staff permissions: access inventory module; cannot access patient clinical records.
- Clinic admin can customize permissions per staff member beyond the preset (add/remove individual permission flags).
- All existing MVP 1 modules respect the updated permission matrix.
- Permission changes generate an audit entry.

---

## Out of scope

- Custom role creation from scratch (can be added if demand warrants it).
- Patient-facing roles (MVP 3 patient portal — `tasks/mvp3/01-patient-portal.md`).
