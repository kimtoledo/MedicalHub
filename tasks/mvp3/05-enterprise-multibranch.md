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
- Added the organization workspace, organization role management, target-clinic ownership checks, regional branch-scoped visibility and metrics, and one-organization-per-clinic enforcement.
- **Branch-scoped staff assignment (this update):** a staff member can now be assigned to additional branches within the same clinic without a duplicate account — `POST /v1/clinic/:clinicId/staff/branch-assignments` adds a second (or third...) `clinicMemberships` row for the same user, mirroring the exact pattern `dentistBranchAssignments` already uses for dentists. This turned out to require less new plumbing than expected: the authorization layer's `getCallerBranchIds` helper already aggregated across multiple membership rows per user ("Multi-branch membership is fully supported", per its own comment) — the only real gap was that `invite()` actively blocked a second membership row for the same user+clinic, and there was no UI/endpoint to add one. The staff settings page now shows an "Add branch" action per non-clinic-wide member and a count of their other branch assignments; removing any one row correctly audits as a branch-assignment removal (not a full offboarding) when other active rows remain for that user.
- Remaining: organization-level entitlements and a central service catalog are structurally tractable (both would extend an existing single-tier resolver — `entitlements-service.ts`'s `resolve()` and `service-catalog-service.ts`'s `resolvePrice()` — by one more tier, mirroring patterns already in this codebase) but need an explicit precedence-order decision (does an org-level override win over a clinic-level one, or the reverse?) before being built, since guessing wrong would silently grant or withhold a paid feature/price. Consented patient transfers need an explicit product decision on semantics (copy-with-consent-record vs. move vs. shared-registry) before any schema work, especially for the cross-clinic (cross-tenant) case — this touches real patient data and shouldn't be inferred from existing code.

---

## Out of scope

- Cross-organization (different dental group) data sharing.
- Automatic patient record merging across branches.
