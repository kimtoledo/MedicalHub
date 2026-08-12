# Platform Operations Maturity

> **Status:** 🔵 Active — support and export request baseline delivered

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
- Remaining: scoped support session enforcement, actual JSON/CSV export workers, retention/anonymization jobs, restore drills, alerting, feature rollouts, and maintenance mode.

---

## Out of scope

- Full SOC 2 / ISO 27001 compliance program (recommend as a parallel business initiative, not a code task).
- Real-time intrusion detection system (can integrate a third-party tool as needed).
