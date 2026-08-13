# Platform Operations Maturity

> **Status:** 🔵 Active — support/export baseline, real export generation, and feature-flag rollout delivered

---

## What & Why

As Dentra.ph scales, the platform team needs proper tooling to support clinics, respond to incidents, and maintain compliance — without Super Admin having routine access to patient clinical records.

---

## Done looks like

- **Support tooling:** Support agents have a scoped access mode. Accessing a tenant's records for support requires a written justification and generates an audit entry — no silent access.
- **Tenant export/offboarding:** A clinic can request a full data export (structured JSON/CSV). The offboarding workflow deactivates the clinic, retains data for a configurable retention period, then deletes per policy.
- **Retention automation:** Automated enforcement of data retention policy — data older than the configured retention period is flagged for deletion or anonymization.
- **Backup and restore testing:** Regular backup verification via restore-to-staging tests; all incidents are documented.
- **Operational dashboards:** Internal dashboard showing platform health: active clinics, API error rates, slow query alerts, and storage usage.
- **Security alerts:** Automated alerts for anomalous patterns (e.g. unusual login geography, bulk data access from a single session).
- ✅ **Feature-flag rollout:** Ability to enable new features for a subset of clinics before full release.
- **Migration and maintenance tooling:** Safe schema migration scripts with rollback plans; per-tenant maintenance mode.

### Delivered baseline

- Added written-justification support-access requests with Super Admin approve/deny decisions, 30-minute approval expiry, and immutable audit events.
- Added tenant export/offboarding request metadata with clinic-admin submission and Super Admin processing state controls; no export artifact or deletion runs silently.
- Added a protected platform operations clinic inventory endpoint to support future health/retention dashboards.
- **Real export generation (this update):** `generateExport` now gathers ~24 clinic-scoped tables (patients, appointments, encounters, treatment plans/records, invoices and their line items/payments/transactions, prescriptions, odontogram events, clinical file metadata, reviews, HMO payers/memberships/claims, and inventory), assembles a structured JSON document with an explicit manifest of what's included, and uploads it to the same object-storage bucket clinical files already use (`exports/{clinicId}/{requestId}.json`).
- Uploaded file *binaries*, staff/user accounts, and audit logs are explicitly excluded from the export document (listed in the document's own `excludedFromExport` field) rather than silently omitted — file binaries remain retrievable individually via the existing per-file signed URLs.
- Added a signed-token download flow reusing the exact HMAC token scheme from clinical file downloads: a Super Admin or the requesting clinic's own admin can mint a short-lived download URL (`GET .../exports/:requestId/download-url`), and the actual bytes are served from a token-gated, session-free `GET .../exports/:requestId/download` route — mirroring `clinic-files.ts` exactly.
- `markExport` no longer accepts `ready` as a manually-set status — only `generateExport` can reach `ready`, since it's the one that actually produced an artifact; manual `processing`/`failed`/`cancelled` transitions remain for cases requiring human override.
- Minting a download link and generating an export are both audited (`TENANT_EXPORT_GENERATED`, `TENANT_EXPORT_DOWNLOAD_LINK_ISSUED`) given the sensitivity of a full clinic-data extraction capability.
- Investigated scoped support session enforcement: the approval flow (`supportAccessRequests`, 30-minute expiry) is currently a request/audit record only — nothing anywhere queries it to gate access. Super Admin already unconditionally bypasses `hasClinicAccess` on some route families (hmo, remote-consults, entitlements, clinic-ai) via `isSuperAdmin(...) || hasClinicAccess(...)`, but has **no** access path at all on others (clinic-patients, clinic-encounters use `requireClinicFeature`, which has no Super Admin bypass). Wiring a real `hasActiveSupportGrant()` check in place of the `isSuperAdmin` bypass is mechanically small, but needs a product decision first: which route families actually constitute "support access to tenant data" requiring a grant, and whether patients/encounters should gain a new (grant-gated) Super Admin path at all. Not guessing this — it's an access-control policy question, not an implementation detail.
- **Feature-flag rollout (this update):** new `feature_flags`/`feature_flag_clinics` tables let a Super Admin create a flag (a `key` + display name) and either target it at a specific subset of clinics or flip it to `enabledByDefault` for a full release. `isFeatureEnabledForClinic(key, clinicId)` is exported from `operations-service.ts` for future application code to gate behavior by flag — creating/targeting a flag here only controls *who* it applies to; a flag key doesn't do anything until some other feature's code calls that check. New endpoints: `GET/POST /v1/admin/operations/feature-flags`, `PATCH .../feature-flags/:flagId` (rollout toggle), `POST/DELETE .../feature-flags/:flagId/clinics/:clinicId` (subset targeting). Minimal UI added to the Super Admin operations console. Verified all four states (untargeted, targeted, removed, full rollout) end-to-end against a real seeded clinic.
- While generating this feature's migration, hit the exact same silent-migration-skip class of bug as the earlier service-catalog migration, but one level deeper: drizzle's migrator picks the single `max(created_at)` already recorded and only applies journal entries whose `when` exceeds it — the earlier session's manual reconciliation had left that max slightly ahead of "now," so the newly generated migration (with a real, smaller `when`) was silently skipped again despite `db:migrate` reporting success. Root-caused it all the way to two anomalous entries in `packages/db/migrations/meta/_journal.json` (`0013_hmo_claims`/`0014_merge_history_reconciliation` carry `when` values further in the future than every migration up through this one) and fixed it for good by renumbering every journal entry's `when` and the matching `__drizzle_migrations.created_at` row to a clean sequential integer sequence (1, 2, 3...) — small integers can never collide with a real future epoch-millisecond timestamp, so this class of bug should not recur. Confirmed via direct hash/table inspection against the dev database (with the user's explicit approval before running the raw `UPDATE`).
- Remaining: retention/anonymization jobs, actual deletion/offboarding execution, restore drills, alerting, maintenance mode, and the scoped support enforcement above once its policy scope is decided.

---

## Out of scope

- Full SOC 2 / ISO 27001 compliance program (recommend as a parallel business initiative, not a code task).
- Real-time intrusion detection system (can integrate a third-party tool as needed).
