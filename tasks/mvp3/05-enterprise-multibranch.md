# Enterprise Multi-Branch

> **Status:** 🔵 Active — organization baseline delivered

---

## What & Why

Large dental groups with many branches need organization-level reporting, central service catalogs, and cross-branch staff management that the single-clinic model in MVP 1/2 cannot support.

---

## Done looks like

- A "Dental Group" organization can own multiple clinic accounts under one umbrella.
- Consolidated reporting at the organization level: aggregate appointment, patient, and revenue metrics across all member clinics.
- ✅ Central service catalog at the organization level with branch-level price overrides.
- ✅ Staff can be assigned to multiple branches within the same organization without duplicate accounts.
- Regional/area manager role with visibility across their assigned branches.
- Patient referral/transfer between branches within the same organization (with explicit patient consent).
- Organization-level feature entitlements that cascade to member clinics.

### Delivered baseline

- Added organization, member-clinic, organization membership, role, and branch-scope data boundaries.
- Added organization creation, clinic attachment, membership listing, and consolidated appointment/patient/revenue summary APIs with organization membership checks.
- Added the organization workspace, organization role management, target-clinic ownership checks, regional branch-scoped visibility and metrics, and one-organization-per-clinic enforcement.
- **Branch-scoped staff assignment (previous update):** a staff member can now be assigned to additional branches within the same clinic without a duplicate account — `POST /v1/clinic/:clinicId/staff/branch-assignments` adds a second (or third...) `clinicMemberships` row for the same user, mirroring the exact pattern `dentistBranchAssignments` already uses for dentists. This turned out to require less new plumbing than expected: the authorization layer's `getCallerBranchIds` helper already aggregated across multiple membership rows per user ("Multi-branch membership is fully supported", per its own comment) — the only real gap was that `invite()` actively blocked a second membership row for the same user+clinic, and there was no UI/endpoint to add one. The staff settings page now shows an "Add branch" action per non-clinic-wide member and a count of their other branch assignments; removing any one row correctly audits as a branch-assignment removal (not a full offboarding) when other active rows remain for that user.
- **Central service catalog (this update):** organization owners/admins can maintain a group-wide catalog of services (`organization_services` table) with a name, category, duration, and base price. A clinic within the organization "adopts" a catalog item, which creates a normal row in that clinic's own `services` table (tagged with `organizationServiceId`) — the clinic can then override the price locally at any time, exactly like it already could for a branch override. This extends `service-catalog-service.ts`'s existing `resolvePrice()` fallback chain with one more (lowest-priority) tier: **branch override → clinic base price → organization catalog base price → caller-supplied fallback**. This precedence was chosen because it mirrors the existing branch-over-clinic-base precedence (the more locally-scoped price always wins) and keeps an org catalog purely a convenience default, never a forced override — a clinic that has already set its own price is never silently overridden by group pricing. Verified end-to-end against a real seeded clinic (org base price resolves with `priceSource: 'organization'`; a subsequent clinic-level price edit correctly reverts `priceSource` to `'base'`). New endpoints: `GET/POST /v1/organizations/:organizationId/service-catalog`, `PATCH /v1/organizations/:organizationId/service-catalog/:itemId`, `POST /v1/organizations/:organizationId/service-catalog/adopt`. Minimal UI added to the organization workspace (catalog list, add-item form, adopt-into-clinic form).
- Remaining: organization-level feature entitlements (as opposed to service pricing) still need an explicit precedence-order decision (does an org-level override win over a clinic-level one, or the reverse?) before being built, since guessing wrong would silently grant or withhold a paid feature. Consented patient transfers need an explicit product decision on semantics (copy-with-consent-record vs. move vs. shared-registry) before any schema work, especially for the cross-clinic (cross-tenant) case — this touches real patient data and shouldn't be inferred from existing code.

---

## Out of scope

- Cross-organization (different dental group) data sharing.
- Automatic patient record merging across branches.
