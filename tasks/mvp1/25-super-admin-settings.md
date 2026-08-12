# Super Admin Platform Settings

> **Status:** 🔲 Queued
> **Priority:** P2

## What & Why

Replace the `/dentra-admin/settings` placeholder with a deliberately scoped platform settings workspace.

## Done looks like

- Read-only environment/runtime summary without displaying secrets.
- Safe platform defaults for public support/contact details and operational toggles backed by validated storage.
- Super Admin account/session security summary and links to supported account actions.
- Every mutable setting has explicit validation, confirmation, and immutable audit history.
- Unsupported infrastructure settings are labeled as deployment-managed rather than presented as fake controls.

## Out of scope

- Secret editing, database credentials, arbitrary environment variables, or destructive maintenance controls.
