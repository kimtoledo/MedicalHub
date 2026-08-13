# Platform Operations Maturity

> **Status:** 🔵 Active — support/export baseline and real export generation delivered

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
- **Feature-flag rollout:** Ability to enable new features for a subset of clinics before full release.
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
- Remaining: scoped support session enforcement, retention/anonymization jobs, actual deletion/offboarding execution, restore drills, alerting, feature rollouts, and maintenance mode.

---

## Out of scope

- Full SOC 2 / ISO 27001 compliance program (recommend as a parallel business initiative, not a code task).
- Real-time intrusion detection system (can integrate a third-party tool as needed).
