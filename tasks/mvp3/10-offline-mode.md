# Secure Offline-Limited Mode

> **Status:** ⛔ Blocked — threat model and security approval required
> ⚠️ **Do not start this task without a completed threat model and explicit product approval.**

---

## What & Why

Some dentists work in areas with unreliable internet and need limited clinical access while offline. This is the highest-risk feature on the platform because it involves caching protected health information on a device. It must only proceed after threat modeling confirms the design is acceptable.

---

## Done looks like

- A defined subset of patient and clinical data can be cached on an enrolled, trusted device.
- Cached data is encrypted at rest using a device-specific key.
- Device trust/enrollment flow: a clinic admin must explicitly enroll a device before it can access offline data.
- Device revocation: if a device is lost or stolen, a clinic admin can revoke its offline access remotely.
- Only a minimal, explicitly defined data scope is cached — no bulk record exports.
- Offline cache expires after a configured period even without revocation.
- Sync conflicts on reconnection are resolved by a defined policy (e.g. server wins, or flag for manual review).
- All offline access events are logged and synced to the audit trail on reconnection.
- The feature is disabled by default and requires explicit activation per clinic (entitlement-gated).

---

## Prerequisites before starting

- Completed threat model documented and reviewed by a qualified party.
- Explicit confirmation that the offline data scope and encryption approach meets the intended security bar.
- Dedicated security review before any clinical data is stored offline on any device.

### Current gate

`docs/THREAT_MODEL_OFFLINE_MODE.md` records the draft threats and required controls. It is intentionally not an approval; no offline PHI storage or sync implementation has started.

---

## Out of scope

- Full EMR offline capability (only a minimal, explicitly scoped data set).
- Offline billing or inventory updates.
