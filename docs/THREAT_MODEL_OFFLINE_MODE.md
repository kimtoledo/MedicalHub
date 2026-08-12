# Offline-Limited Mode Threat Model (Draft — Not Approved)

Status: **security review required; offline PHI storage is disabled**

This document records the minimum threat-modeling work required before Dentra.ph may cache any protected health information on a device. It is a design gate, not approval to implement or ship offline mode.

## Assets and trust boundaries

- Protected assets: patient identifiers, appointment context, clinical notes, odontogram data, radiographs, prescriptions, and audit events.
- Trusted components: Dentra API/database, clinic identity provider, and an enrolled clinic-managed device after explicit approval.
- Untrusted components: browser extensions, other local users, lost/stolen devices, kiosk visitors, local network attackers, and compromised third-party SDKs.

## Primary threats

1. A lost or stolen device exposes cached PHI.
2. Malware, browser storage inspection, or a copied browser profile extracts cache keys.
3. A revoked or expired device continues reading or mutating stale data while offline.
4. Sync replay, conflict, or tampering creates an incorrect clinical record.
5. Bulk prefetch or debug logging expands the offline data scope.
6. Shared devices leak one clinic or patient context to the next user.

## Required controls before implementation

- Device enrollment, attestation/trust state, remote revocation, and short offline expiry.
- Hardware-backed/device-bound key storage and encrypted, minimal, non-exportable cache.
- No offline writes to billing, inventory, prescriptions, or finalized clinical records.
- Server-wins or manually reviewed conflict policy; replay protection and audit reconciliation.
- Explicit clinic entitlement, user consent, session lock, cache wipe, and inactivity timeout.
- Redacted telemetry: no PHI, tokens, or clinical free text in logs.
- Independent security review and product approval with named scope and test evidence.

## Decision

No offline cache, service worker data store, device enrollment endpoint, or sync code may be added until the controls above are reviewed and approved. Current MVP3 status remains blocked by this prerequisite.
