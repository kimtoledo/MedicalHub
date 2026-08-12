# Enterprise Multi-Branch

> **Status:** 🔵 Active — organization baseline delivered

---

## What & Why

Large dental groups with many branches need organization-level reporting, central service catalogs, and cross-branch staff management that the single-clinic model in MVP 1/2 cannot support.

---

## Done looks like

- A "Dental Group" organization can own multiple clinic accounts under one umbrella.
- Consolidated reporting at the organization level: aggregate appointment, patient, and revenue metrics across all member clinics.
- Central service catalog at the organization level with branch-level price overrides.
- Staff can be assigned to multiple branches within the same organization without duplicate accounts.
- Regional/area manager role with visibility across their assigned branches.
- Patient referral/transfer between branches within the same organization (with explicit patient consent).
- Organization-level feature entitlements that cascade to member clinics.

### Delivered baseline

- Added organization, member-clinic, organization membership, role, and branch-scope data boundaries.
- Added organization creation, clinic attachment, membership listing, and consolidated appointment/patient/revenue summary APIs with organization membership checks.
- Remaining: organization-level entitlements, central service catalog, branch-scoped staff assignment UI, and consented patient transfers.

---

## Out of scope

- Cross-organization (different dental group) data sharing.
- Automatic patient record merging across branches.
