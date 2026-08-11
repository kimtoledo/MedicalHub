# Dentra.ph Brand & UI Development Guidelines

> **Purpose:** Source of truth for Dentra.ph branding and UI implementation. Replit Agent, Claude, Codex, designers, and developers should follow this file unless a newer approved brand specification replaces it.

## 1. Brand Overview

**Brand:** Dentra.ph

**Product:** Dental SaaS, clinic management, dentist discovery, and appointment platform

**Tagline:** **Smarter Dentistry. Better Care.**

Dentra.ph should feel modern, professional, trustworthy, friendly, clean, technology-forward, and healthcare-appropriate. Balance clinical trust with a modern SaaS experience. Avoid generic admin-template styling, overly corporate hospital aesthetics, or playful visuals that reduce clinical credibility.

## 2. Core Visual Direction

The primary visual direction is purple/violet, supported by white and soft lavender neutrals. Use purple for the logo, navigation, primary buttons, links, active and focus states, selected calendar dates, PWA interface, Clinic Dashboard, Super Admin, and marketing accents.

Use gradients selectively for high-impact surfaces such as hero sections, authentication screens, selected promotional areas, and major calls to action. Do not apply gradients to every component.

## 3. Brand Color Palette

| Token | Hex | Primary usage |
|---|---|---|
| `brand-900` | `#3B0F7A` | Deep backgrounds and dark brand surfaces |
| `brand-800` | `#4C1D95` | Navigation and auth backgrounds |
| `brand-600` | `#7C3AED` | Main Dentra purple, buttons, links, active states |
| `brand-500` | `#8B5CF6` | Hover and accent purple |
| `brand-400` | `#A78BFA` | Secondary accents |
| `brand-100` | `#EDE9FE` | Light purple backgrounds |
| `brand-50` | `#F7F6FB` | Application background |
| `navy-900` | `#1E1B4B` | Headings and dark text |
| `white` | `#FFFFFF` | Cards and clean surfaces |
| `success` | `#10B981` | Success, confirmed, completed |
| `warning` | `#F59E0B` | Warning and pending attention |
| `danger` | `#EF4444` | Errors and destructive actions |
| `info` | `#3B82F6` | Informational states |

Main gradient:

```css
background: linear-gradient(135deg, #3B0F7A 0%, #4C1D95 35%, #7C3AED 70%, #8B5CF6 100%);
```

Button gradient:

```css
background: linear-gradient(90deg, #7C3AED 0%, #8B5CF6 100%);
```

## 4. Typography

Use **Inter** as the primary typeface: Regular `400` for body copy, Medium `500` for secondary emphasis, SemiBold `600` for labels and buttons, Bold `700` for headings, and ExtraBold `800` for high-impact display headings. Clinical information, schedules, patient records, billing figures, and form labels must prioritize readability.

## 5. Logo Direction

The Dentra identity combines dental/tooth symbolism, the letter D, healthcare symbolism, and modern technology styling. Preferred wordmark: **Dentra.ph**. `Dentra` uses deep violet/navy-purple and `.ph` uses the brighter purple accent.

Maintain primary-on-white, reversed-on-purple, icon-only/PWA, horizontal navigation, and compact mobile versions. Never stretch, rotate, distort, randomly recolor, or add unapproved effects. Maintain clear space and sufficient contrast.

## 6. UI Design Language

Use a clean SaaS healthcare interface with generous whitespace, rounded cards, soft borders, subtle shadows, clear hierarchy, purple active states, minimal clutter, responsive layouts, touch-friendly controls, and accessible focus states.

- Small controls: 8px radius
- Inputs/buttons: 10–12px
- Cards: 12–16px
- Feature panels: 16–20px
- Large auth cards: 20–24px
- Standard shadow: `0 8px 24px rgba(30, 27, 75, 0.08)`

Avoid excessive pill-shaped components except for badges, chips, filters, and statuses.

## 7. Buttons and Forms

Primary actions use purple or the approved gradient, white text, SemiBold, and 10–12px radius. Secondary actions use white/light backgrounds with purple borders and text. Destructive actions use red only. Every button requires hover, focus, loading where relevant, and disabled states.

Forms use visible labels, white inputs, neutral default borders, purple focus borders/rings, helpful error text, and comfortable mobile touch targets. Never use placeholder text as the only label or color as the only validation cue.

## 8. Dashboard Shell

Desktop layout uses a sidebar, top bar, page title, and content area. The sidebar uses deep purple, white Dentra branding, light navigation text, a brighter active state, and consistent line icons. Navigation visibility must respect both user permissions and subscription entitlements.

Typical clinic navigation includes Dashboard, Appointments, Patients, Dental Chart, Treatments, Billing, Inventory, Reports, Website, Staff, and Settings.

## 9. Super Admin

Route: `/dentra-admin`. Super Admin may use a darker platform-oriented version of the Dentra UI but remains part of the same brand. The login uses a deep violet gradient, Dentra logo, white authentication card, purple focus states, and a primary purple sign-in button. Do not create a separate visual identity.

## 10. Clinic PWA

Prioritize today’s appointments, waiting patients, patient search, upcoming appointments, tasks/follow-ups, billing status, and important alerts. Clinical interfaces prioritize usability over decorative branding. The odontogram may use clinically meaningful colors.

## 11. Public Surfaces

Clinic microsites use `/clinic/[clinic-slug]`; dentist profiles use `/dentists/[dentist-slug]`. Clinics may customize approved content, but Dentra controls core layout, responsiveness, accessibility, and interaction design. Avoid arbitrary custom CSS/JavaScript in early MVPs.

Dentist profiles emphasize professional identity, specialization, credentials, affiliations, locations, availability, and a prominent purple **Book Appointment** CTA.

## 12. Appointment Experience

```text
Clinic/Dentist → Branch/Location → Service → Dentist → Date → Time → Patient Information → Review → Confirmation
```

Selected dates are purple, unavailable dates muted, today subtly outlined, and confirmed status green. Unavailable slots must not appear clickable.

## 13. Status Colors

| Status | Color family |
|---|---|
| Scheduled | Purple |
| Confirmed | Blue |
| Checked In | Indigo |
| In Treatment | Violet |
| Completed | Green |
| Pending | Amber |
| Cancelled / No Show | Red or neutral-red |
| Draft / Inactive | Gray |

Always pair color with readable text.

## 14. PWA Branding

Required assets include app icon, maskable icon, favicon, splash-compatible branding, manifest theme color, and manifest background color.

```json
{
  "name": "Dentra.ph",
  "short_name": "Dentra",
  "theme_color": "#4C1D95",
  "background_color": "#FFFFFF",
  "display": "standalone"
}
```

The PWA is online-first for sensitive clinical information. Do not broadly cache patient medical records, clinical notes, radiographs, billing information, or authentication responses.

## 15. Responsive Design and Accessibility

Support mobile, tablet, laptop, desktop, and installed PWA windows. On mobile, adapt the sidebar, stack forms, make tables responsive, preserve one-handed booking, use comfortable touch targets, and avoid unlabeled tiny controls.

Minimum accessibility expectations: WCAG-conscious contrast, keyboard navigation, visible focus states, semantic HTML, accessible labels, descriptive controls, screen-reader-friendly errors, no color-only communication, and reduced-motion support where applicable.

## 16. Iconography, Charts, and Analytics

Use Lucide React with consistent stroke weight. Avoid mixing icon libraries. Use purple as the primary chart series, supporting violet shades, green for positive values, amber for warnings, and red only for negative/critical values. Use Philippine Peso formatting where applicable.

## 17. Brand Voice

Dentra sounds clear, helpful, professional, human, and concise. Prefer messages such as “Appointment confirmed.” and “Patient record saved successfully.” Avoid technical implementation language in customer-facing messages.

## 18. CSS Design Tokens

```css
:root {
  --brand-900: #3B0F7A;
  --brand-800: #4C1D95;
  --brand-600: #7C3AED;
  --brand-500: #8B5CF6;
  --brand-400: #A78BFA;
  --brand-100: #EDE9FE;
  --brand-50: #F7F6FB;
  --navy-900: #1E1B4B;
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --info: #3B82F6;
  --background: #FFFFFF;
  --surface-muted: #F7F6FB;
}
```

Prefer semantic component tokens such as `primary`, `primary-hover`, `background`, `surface`, `border`, `foreground`, `muted`, `success`, `warning`, and `danger`.

## 19. Rules for Agents and Developers

1. Read and follow this file for Dentra frontend work.
2. Reuse shared UI components before creating duplicates.
3. Do not introduce unrelated primary colors or a competing visual system.
4. Use centralized design tokens, Inter, and Lucide React icons.
5. Preserve responsiveness and accessibility.
6. Implement loading, empty, error, hover, focus, and disabled states.
7. Keep the public site, Clinic PWA, and Super Admin visually related.
8. Do not sacrifice clinical usability for effects.
9. Respect role permissions and package entitlements even when UI elements are hidden.
10. Match existing Dentra components when extending the product.

Recommended shared components include `DentraLogo`, `DentraMark`, `PageHeader`, `AppSidebar`, `AppTopbar`, `StatCard`, `DataTable`, `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `AppointmentCard`, `PatientCard`, `ClinicCard`, `DentistCard`, `FeatureGate`, and `PermissionGate`.

## 20. Brand Do / Don’t

Do use purple as the dominant identity, clean spacious interfaces, white clinical surfaces, readable typography, reusable components, simple booking, and consistent Dentra identity.

Do not reintroduce blue/teal as the primary brand, overuse gradients, use neon healthcare colors or decorative fonts, hide important labels, make every card purple, add heavy clinical-workflow animation, use tiny medical text, or treat marketing/dashboard/admin as unrelated products.

## 21. Quick Brand Reference

```text
Brand:       Dentra.ph
Tagline:     Smarter Dentistry. Better Care.
Primary:     #7C3AED
Deep Purple: #4C1D95
Dark:        #1E1B4B
Accent:      #A78BFA
Success:     #10B981
Background:  #FFFFFF / #F7F6FB
Typeface:    Inter
Headings:    Inter 700–800
Body/UI:     Inter 400–600
Icons:       Lucide React
UI Style:    Modern Dental SaaS
Brand Feel:  Friendly, rounded, confident, digital-first
Shape:       Rounded, clean, soft
Platform:    Responsive Web + PWA
```

Approved source logos live in `docs/branding/`; production copies live in `apps/web/public/brand/`.

---

**Document:** Dentra.ph Brand & UI Development Guidelines

**Version:** 1.0

**Status:** Initial approved development direction
