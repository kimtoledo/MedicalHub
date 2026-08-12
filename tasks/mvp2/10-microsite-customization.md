# Microsite Customization

> **Status:** ✅ Done — MVP 2 baseline
> Basic microsite content editing is in MVP 1 (`tasks/mvp1/06-clinic-microsite.md`).

---

## What & Why

Clinics need more control over how their public microsite looks and what content sections appear. This extends the MVP 1 content editor with visual theming and richer content options while keeping all customization inside structured fields — no arbitrary HTML from tenants.

---

## Done looks like

- Clinic admin can choose from a set of approved theme presets (color palette + font combination).
- Clinic admin can set a brand accent color within an approved palette range.
- Content section toggles: each section (gallery, team bios, services list) can be individually shown or hidden.
- Photo gallery: clinic admin can upload clinic photos that appear in a gallery section.
- Additional service content: longer descriptions and procedure highlights per service.
- SEO fields: custom `<title>`, meta description, and Open Graph image per clinic.
- Live preview before publishing changes.
- Arbitrary unsafe HTML or JavaScript from tenants is explicitly blocked — all customization goes through structured fields only.

### Delivered

- Added approved theme presets, hex accent validation, section visibility toggles, structured SEO fields, and private gallery metadata.
- Extended clinic settings and the public clinic detail boundary with tenant-scoped gallery/theme data; no arbitrary HTML or scripts are accepted.

---

## Out of scope

- Custom domains (MVP 3 — `tasks/mvp3/08-custom-domains.md`).
- Full headless CMS or arbitrary page builder (not planned).
