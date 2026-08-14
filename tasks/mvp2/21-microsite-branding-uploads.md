# Microsite Branding: Standalone Header/Footer + Logo/Cover Uploads

> **Status:** ✅ Done — Part A shipped (Navbar removed, "Powered by Dentra.ph" footer link). Part B shipped: clinic-owned logo/cover upload, gradient cover mode wired to `themePreset`/`brandAccent`, public serving route, Settings UI.
> **Priority:** P2

---

## What & Why

The public clinic microsite (`apps/web/app/clinic/[clinicSlug]/page.tsx`) currently reuses the marketing site's `<Navbar />`/`<Footer />` (`apps/web/components/Navbar.tsx` / `Footer.tsx`) — full of Dentra.ph marketing links (Features, Pricing, "Get Started Free", company links) that have nothing to do with the clinic whose page a patient is actually viewing. It reads as a Dentra.ph page with a clinic's content dropped in, not the clinic's own page.

Separately, a clinic's `logoUrl` and `coverUrl` (`packages/db/src/schema/clinics.ts`) are only settable today as raw URL-paste fields — and only `logoUrl`, only from the **Super Admin** side (`ClinicAccountInfoAction.tsx`). `coverUrl` has no edit UI anywhere; it can currently only be set by writing directly to the database. A clinic owner has no way to put their own logo or banner on their own public page.

This task does two things: give the microsite its own minimal header/footer (no Dentra marketing chrome), and let a clinic owner actually upload a logo + cover image from Settings instead of pasting a URL.

---

## Part A — Standalone microsite header/footer

Only `apps/web/app/clinic/[clinicSlug]/page.tsx` is in scope. `Navbar`/`Footer` are plain per-page imports, not a shared layout — every other page that imports them (`app/page.tsx`, `app/dentists/*`, `app/clinics/page.tsx`, `app/clinic/[clinicSlug]/appointment/page.tsx`) does so independently, so removing them from just this one file is isolated and doesn't touch marketing pages, the dentist directory, or the booking sub-page. **Decide during implementation** whether `clinic/[clinicSlug]/appointment/page.tsx` should get the same treatment for a consistent booking flow — likely yes, but call it out as a separate small follow-up rather than silently expanding this task's scope.

- Shipped as: `<Navbar />` removed outright, no replacement header — the existing hero section (logo/initials + clinic name) already carries that role, so no separate header bar was added.
- Replace `<Footer />` with a one-line footer: **"Powered by Dentra.ph"** where the "Dentra.ph" wording is itself a link back to the marketing home (`/`, or the absolute `https://dentra.ph` if the microsite is ever served from a clinic's own custom domain — see `20-...` custom-domain work already shipped; use an absolute URL so the link still resolves correctly there). Match the page's existing violet palette; keep it visually quiet (small text, muted color) — it's an attribution line, not a marketing push, so it should read like "built on" credit, not a CTA button.
- No backend changes needed for this part.

---

## Part B — Logo & cover image upload

### Current state (confirmed, not assumed)
- `logoUrl`/`coverUrl` are nullable `varchar(500)` columns on `clinics`, already read by the public page (logo → 80×80 `<img>` with initials fallback; cover → low-opacity full-bleed background `<div>` in the hero, plus reused as the Open Graph image in `generateMetadata`).
- Neither field is exposed through the clinic-owner `/v1/clinic/:clinicId/settings` API (`ClinicProfileInput` in `apps/api/src/clinic/settings-service.ts` omits both) — a clinic owner literally cannot change either today, only Super Admin can paste a `logoUrl`.
- Gallery images (`clinic_gallery_items.imageUrl`) are also URL-paste only — same gap, not in scope here, but the eventual upload primitive built for logo/cover should be reusable for gallery images later without rework.
- The only file-upload precedent in this codebase is clinical files (`apps/web/components/app/FilesTab.tsx` → `POST /v1/clinic/:clinicId/files`, Fastify `multipart` plugin already registered app-wide in `apps/api/src/app.ts`, storage via `@replit/object-storage`, `apps/api/src/clinic/clinical-files-service.ts`). That flow is deliberately **private**: files are only ever served through the app's own short-lived HMAC-signed-token download endpoint, never as a direct public URL.
- Logo/cover are the opposite requirement: they must be **public, permanent, and hot-linkable** (rendered directly in `<img src>` on an unauthenticated page, and used as an absolute URL in Open Graph meta tags for social previews). The private signed-URL pattern doesn't fit as-is and needs a public-serving variant.
- The `.env.example` "Storage (added when object storage is scaffolded)" S3-style placeholders (`STORAGE_BUCKET`/`STORAGE_ACCESS_KEY`/etc.) are unused dead config — the real storage client only relies on Replit's ambient object-storage binding. Don't wire those env vars; follow the same `@replit/object-storage` pattern the clinical-files feature already uses.
- **Defaults already exist and must keep working while no upload is set**: the logo box already falls back to two-letter clinic initials on a translucent tile, and the hero already has *a* background (currently a hardcoded `bg-gradient-to-br from-violet-950 via-violet-800 to-violet-600`, with `coverUrl` only ever layered on top at low opacity). Nothing here should regress to a blank/broken hero when a clinic hasn't uploaded anything yet — the gradient default stays the fallback for both the "no cover" case and the new "gradient mode" case below.
- **Found while researching this task**: `clinics.themePreset` (`'violet-clean' | 'lavender-soft' | 'midnight-violet'`) and `clinics.brandAccent` (hex color) already exist as columns, are already editable in `ClinicMicrositeSettings.tsx`'s profile form, and are already fetched into the public page's data (`directory-service.ts`) — but the public page itself never reads or applies them; the hero gradient is hardcoded regardless of what a clinic picked. This task is the natural place to finally wire them up, per the cover-mode design below.

### Shipped design
- New service `apps/api/src/clinic/branding-service.ts` + routes `apps/api/src/routes/clinic-branding.ts`, wired into `app.ts`/`server.ts` alongside the existing `clinicSettings`/`clinicFiles` services:
  - `POST /v1/clinic/:clinicId/branding/logo` and `.../cover` — multipart upload (`request.parts()`, same pattern as `clinic-files.ts`), `clinic_owner`/`clinic_admin` only, image-only (`image/jpeg`, `image/png`, `image/webp`), 5 MB cap.
  - `PATCH /v1/clinic/:clinicId/branding/cover-mode` — sets `coverMode` (`'image' | 'gradient'`).
  - `GET /v1/public/clinics/:clinicId/branding/:kind` — public, unauthenticated, streams bytes from storage with a 1-year immutable `Cache-Control` header; tenant-scoped by `clinicId` in the storage key and DB lookup.
  - Storage key: `branding/${clinicId}/logo` / `branding/${clinicId}/cover` (fixed key per clinic — re-upload just overwrites).
  - New `clinics` columns (migration `0047_mean_raider.sql`): `coverMode` (default `'gradient'`), `logoUpdatedAt`/`coverUpdatedAt`, `logoMimeType`/`coverMimeType`. `logoUrl`/`coverUrl` are left untouched by uploads — they remain the Super-Admin-pasted-URL fallback for clinics that never use the uploader.
  - Cache-busting/URL derivation happens on the **frontend**, not by writing into `logoUrl`/`coverUrl`: `apps/web/lib/clinic-branding.ts`'s `brandingImageUrl(clinicId, kind, updatedAt, fallbackUrl)` returns `/api/public/clinics/:clinicId/branding/:kind?v=<updatedAt>` when `logoUpdatedAt`/`coverUpdatedAt` is set, else falls back to the legacy pasted URL. This keeps upload and non-upload clinics both working without any migration/backfill.
- Frontend: `apps/web/app/api/public/clinics/[clinicSlug]/branding/[kind]/route.ts` proxies the public route (the folder is named `[clinicSlug]` only to match its sibling routes' dynamic-segment name — Next.js requires one name per path level — the value passed through it is actually the clinic id). `ClinicMicrositeSettings.tsx` gained a "Branding" card: logo/cover file inputs (immediate upload on pick, live preview), a cover-mode radio (image vs. gradient), and theme preset + brand accent controls added to the existing profile form (they already existed as DB columns/entitlement-free fields but had no editing UI before this task).
- Public page (`apps/web/app/clinic/[clinicSlug]/page.tsx`): hero gradient is now `themeGradientClass(clinic.themePreset)` (`apps/web/lib/clinic-branding.ts`) instead of a hardcoded class; the cover image layer only renders when `coverMode !== 'gradient'`. OG image and JSON-LD `image` both go through `brandingImageUrl` too.
- `tailwind.config.ts` content globs gained `./lib/**/*.{js,ts,jsx,tsx,mdx}` — the gradient class map lives in `lib/clinic-branding.ts`, outside the previously-scanned `app/`/`components/`/`pages/` globs.
- Tests: `apps/api/test/clinic-branding.test.ts` covers auth/role/tenant checks, upload success, no-file-part rejection, service-error status mapping, cover-mode validation, and the public serving route (200 + 404).

---

## Done looks like

- ✅ Visiting `/clinic/:slug` shows no Dentra marketing nav/CTA anywhere, and a minimal footer reading "Powered by Dentra.ph" linking back to the marketing home.
- ✅ A clinic owner can upload a logo and a cover/banner image from Settings without needing to paste a URL or ask Super Admin.
- ✅ A clinic owner can instead choose a color/gradient (from the existing theme presets) for the hero background without uploading any image at all, and switch back and forth between image and gradient mode without losing either choice.
- ✅ Before any logo/cover is ever uploaded, and whenever gradient mode is active, the hero still renders a sensible default (initials logo, theme gradient) — never a blank or broken-looking header.
- ✅ Uploaded images render correctly on the public page (logo in the hero, cover as the hero background) and in link previews (Open Graph image) when the page is shared; gradient mode does not attempt to set an OG image from a non-existent cover file.
- ✅ Re-uploading a logo/cover replaces the old one and the public page reflects the new image without a stale-cache issue (cache-busted via `?v=<updatedAt>`).
- ✅ Upload is rejected server-side for non-image files (422) and for files over the 5 MB cap (413), with a clear error message; client-side `accept` hints the same file types.
- ✅ The public branding-serving route has no auth requirement but is tenant-scoped correctly (clinic A can never serve clinic B's branding image through a mismatched ID — storage key and DB row are both scoped to the path's `clinicId`).
