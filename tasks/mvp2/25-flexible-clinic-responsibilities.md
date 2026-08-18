# Flexible Clinic Responsibilities

> **Status:** ✅ Done — flexible operational responsibilities enforced with protected role boundaries; Replit task reference unavailable in the current Codex session

---

## What & Why

In a two-person clinic, one coordinator may act as receptionist, dental assistant, cashier, and inventory custodian. Access should reflect these real responsibilities without shared accounts, repeated role switching, or weakening protected clinical actions.

---

## Scope

- Model composable responsibility bundles such as Front Desk, Dental Assistant, Cashier, Inventory, Clinic Manager, and Clinical Dentist.
- Allow one clinic membership to hold multiple approved bundles within its clinic and branch scope.
- Separate transaction attribution into handled by, performed by, approved by, and payment received by where relevant.
- Default operational attribution to the authenticated actor while requiring explicit dentist attribution/sign-off for protected clinical work.
- Provide clinic-owner/admin controls for assigning bundles and show an effective-access summary before saving.
- Migrate existing rigid roles to equivalent bundles without silently granting broader access.

---

## Protected actions

- Prescription signing and amendment.
- Final clinical authorship where a dentist is legally/operationally required.
- Refunds and high-risk financial adjustments.
- Staff access, security, subscription, and clinic-level settings.
- Cross-branch access outside the user's assignments.

---

## Done looks like

1. A coordinator can perform approved front-desk, assistant, cashier, and inventory work from one login.
2. A dentist-owner can hold both clinical and clinic-management responsibilities.
3. Existing memberships retain equivalent access after migration.
4. API authorization remains authoritative and tenant/branch scoped.
5. Audit records identify the real actor and clinical/financial responsibility correctly.
6. Migration, authorization tests, UI tests, typechecks, and builds pass.

---

## Delivered so far

- Existing membership permission overrides now participate in authoritative API authorization instead of being display-only.
- Effective permissions are resolved from the base role plus audited per-membership overrides and returned to the clinic shell.
- Operational permissions can extend appointments, patients, billing, inventory, and microsite duties without changing the base role.
- Clinical access and financial reporting can be removed by an override but cannot be added to an otherwise ineligible base role.
- Staff management now calls these **Responsibilities** and provides additive Front Desk, Cashier, Inventory, and Small Clinic Coordinator bundles.
- Desktop/mobile navigation reflects effective operational responsibilities.
- Existing domain attribution already records the responsible actor at each boundary: appointment `bookedBy`/status `changedBy`, encounter and invoice `createdBy`, treatment `performedBy`, treatment-plan `approvedBy`, and payment/adjustment `recordedBy`; no duplicate responsibility columns were added.
- Protected clinical routes were deliberately kept non-elevatable until a future preparation-only clinical workflow has its own explicit authorization contract.
