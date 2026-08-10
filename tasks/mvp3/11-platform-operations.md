# Platform Operations Maturity

> **Status:** 🔜 Future — MVP 3

---

## What & Why

As ToothHub scales, the platform team needs proper tooling to support clinics, respond to incidents, and maintain compliance — without Super Admin having routine access to patient clinical records.

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

---

## Out of scope

- Full SOC 2 / ISO 27001 compliance program (recommend as a parallel business initiative, not a code task).
- Real-time intrusion detection system (can integrate a third-party tool as needed).
