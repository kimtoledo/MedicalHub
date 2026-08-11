# Dentra.ph Brand Migration

> **Status:** ✅ Done — customer-facing branding and technical namespaces are migrated to Dentra.ph

---

## What & Why

Rename the former product identity to **Dentra.ph**, apply the approved SVG logo pack from `docs/branding/`, and migrate technical namespaces so the codebase and local development environment no longer use the legacy brand.

## Done looks like

- Public, Super Admin, Clinic/Dentist, offline, and PWA surfaces display Dentra.ph.
- Approved Dentra SVG logos replace temporary text and letter marks.
- Metadata, manifest, app cache naming, and customer-facing copy use Dentra.ph.
- `docs/BRANDING.md` is referenced by contributor instructions.
- npm workspaces use `@dentra/*`, the root package is `dentra-ph`, and API identifiers use Dentra naming.
- Local development uses the `dentra_local` PostgreSQL database and the seeded Super Admin signs in as `admin@dentra.ph`.
- The Super Admin route uses `/dentra-admin` instead of the legacy product abbreviation.

## Out of scope

- Purchasing or configuring production domains.
