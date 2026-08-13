# Enterprise Multi-Branch

> **Status:** ✅ Done — every "Done looks like" item delivered

---

## What & Why

Large dental groups with many branches need organization-level reporting, central service catalogs, and cross-branch staff management that the single-clinic model in MVP 1/2 cannot support.

---

## Done looks like

- ✅ A "Dental Group" organization can own multiple clinic accounts under one umbrella.
- ✅ Consolidated reporting at the organization level: aggregate appointment, patient, and revenue metrics across all member clinics.
- ✅ Central service catalog at the organization level with branch-level price overrides.
- ✅ Staff can be assigned to multiple branches within the same organization without duplicate accounts.
- ✅ Regional/area manager role with visibility across their assigned branches.
- ✅ Patient referral/transfer between branches within the same organization (with explicit patient consent).
- ✅ Organization-level feature entitlements that cascade to member clinics.

### Delivered baseline

- Added organization, member-clinic, organization membership, role, and branch-scope data boundaries.
- Added organization creation, clinic attachment, membership listing, and consolidated appointment/patient/revenue summary APIs with organization membership checks.
- Added the organization workspace, organization role management, target-clinic ownership checks, regional branch-scoped visibility and metrics, and one-organization-per-clinic enforcement.
- **Branch-scoped staff assignment (previous update):** a staff member can now be assigned to additional branches within the same clinic without a duplicate account — `POST /v1/clinic/:clinicId/staff/branch-assignments` adds a second (or third...) `clinicMemberships` row for the same user, mirroring the exact pattern `dentistBranchAssignments` already uses for dentists. This turned out to require less new plumbing than expected: the authorization layer's `getCallerBranchIds` helper already aggregated across multiple membership rows per user ("Multi-branch membership is fully supported", per its own comment) — the only real gap was that `invite()` actively blocked a second membership row for the same user+clinic, and there was no UI/endpoint to add one. The staff settings page now shows an "Add branch" action per non-clinic-wide member and a count of their other branch assignments; removing any one row correctly audits as a branch-assignment removal (not a full offboarding) when other active rows remain for that user.
- **Central service catalog (this update):** organization owners/admins can maintain a group-wide catalog of services (`organization_services` table) with a name, category, duration, and base price. A clinic within the organization "adopts" a catalog item, which creates a normal row in that clinic's own `services` table (tagged with `organizationServiceId`) — the clinic can then override the price locally at any time, exactly like it already could for a branch override. This extends `service-catalog-service.ts`'s existing `resolvePrice()` fallback chain with one more (lowest-priority) tier: **branch override → clinic base price → organization catalog base price → caller-supplied fallback**. This precedence was chosen because it mirrors the existing branch-over-clinic-base precedence (the more locally-scoped price always wins) and keeps an org catalog purely a convenience default, never a forced override — a clinic that has already set its own price is never silently overridden by group pricing. Verified end-to-end against a real seeded clinic (org base price resolves with `priceSource: 'organization'`; a subsequent clinic-level price edit correctly reverts `priceSource` to `'base'`). New endpoints: `GET/POST /v1/organizations/:organizationId/service-catalog`, `PATCH /v1/organizations/:organizationId/service-catalog/:itemId`, `POST /v1/organizations/:organizationId/service-catalog/adopt`. Minimal UI added to the organization workspace (catalog list, add-item form, adopt-into-clinic form).
- **Organization-level feature entitlements (this update):** the user decided the precedence: an organization-wide grant fills the gap only when a clinic's own subscription package doesn't already have an opinion — it never overrides the clinic's own explicit override or its subscribed package. New `organization_entitlements` table (unique per org+featureKey) managed by org owners/admins; `entitlements/service.ts`'s `resolve()` now has a fourth tier: **clinic override → clinic's package base → organization-wide grant → unavailable**. This mirrors the exact shape of the central-service-catalog fallback added earlier — the org-level setting is always a convenience default, never a forced override. Verified end-to-end against a real seeded clinic in three states: no grant (unavailable), org grant fills the gap (`source: 'organization'`), and a clinic's own override still wins over a conflicting org grant. New endpoints: `GET/POST /v1/organizations/:organizationId/entitlements`, `DELETE /v1/organizations/:organizationId/entitlements/:featureKey`. Minimal UI added to the organization workspace (grant list, add-grant form, revoke button).
- **Consented patient referral/transfer (this update):** the user decided on a **shared registry** model — both clinics can see the referral once it exists, but the underlying clinical record stays tenant-isolated (never merged or literally shared). New `patient_referrals` table links a source clinic's patient to a target clinic in the same organization, requiring explicit consent (`consented: true`) captured at creation time — `CONSENT_REQUIRED` is a hard 422 if omitted. Accepting a referral creates a **brand-new** patient row at the target clinic, seeded with only basic demographics (name, DOB, contact, address — never medical/dental history), reusing the same patient-number-generation logic as normal patient creation, inside the same transaction as the referral's status update for atomicity. Both the source and target clinic can list referrals where they're either side (`GET /v1/clinic/patient-referrals`); the target clinic's owner/admin can accept or decline a pending one. New endpoints: `POST /v1/clinic/patient-referrals`, `GET /v1/clinic/patient-referrals`, `POST /v1/clinic/patient-referrals/:referralId/accept`, `POST /v1/clinic/patient-referrals/:referralId/decline`. New "Referrals" page in the clinic app (sidebar entry, create form, accept/decline actions). Verified end-to-end against real seeded clinics: consent enforcement, shared visibility on both sides, tenant isolation of the newly created patient record, and both accept/decline paths.
- Every item in this task's "Done looks like" is now delivered.

---

## Out of scope

- Cross-organization (different dental group) data sharing.
- Automatic patient record merging across branches.
