# Custom Domain Settings UI

> **Status:** 🔲 Queued
> **Priority:** P2

## What & Why

Add clinic-facing custom-domain management around the existing verification records and APIs.

## Done looks like

- Add/normalize hostname, show exact DNS instructions, copy values, and recheck verification.
- Status timeline covers pending, verified, active, failed, and fallback states.
- Activation is disabled until verification succeeds.
- Canonical-domain and SSL provisioning status are truthful and deployment-aware.
- Tenant ownership, audit events, safe errors, responsive states, and tests.

## Dependencies

- DNS/SSL deployment adapter completion from `mvp3/08-custom-domains.md`.
