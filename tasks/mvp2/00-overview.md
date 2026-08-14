# MVP 2 Overview — Complete Clinic Business Operations

**Release objective:** Expand Dentra.ph from core clinical workflow into day-to-day clinic business operations while preserving the same tenant, permission, entitlement, and audit architecture from MVP 1.

---

## Task checklist

| File | What | Status |
|------|------|--------|
| `01-treatment-planning.md` | Proposed treatment plans, multi-item, status tracking | ✅ Done |
| `02-service-catalog-pricing.md` | Clinic procedure catalog, branch pricing, price history | ✅ Done |
| `03-billing-payments.md` | Invoices, partial payments, refunds, audit | ✅ Done |
| `04-prescriptions.md` | Prescription records, printable output, immutable snapshot | ✅ Done |
| `05-clinical-files-media.md` | Radiographs, photos, consent docs, private storage | ✅ Done |
| `06-inventory.md` | Item master, stock in/out, low-stock alerts | ✅ Done |
| `07-notifications.md` | Email booking confirmations, reminders, cancellations | 🔵 Active — reminders/cancellations wired, provider credentials remain |
| `08-recall-followup.md` | Recall rules, due dates, follow-up appointment creation | ✅ Done |
| `09-reports.md` | Operational, financial, and inventory reports | ✅ Done |
| `10-microsite-customization.md` | Theme presets, brand color, gallery, SEO fields | ✅ Done |
| `11-subscription-operations.md` | Upgrade/downgrade, add-ons, usage enforcement | ✅ Done |
| `12-new-roles.md` | Cashier, Inventory Staff, granular permissions | ✅ Done |
| `13-ai-clinical-assistance.md` | AI note auto-fill, voice-to-text, follow-up & treatment suggestions | ✅ Done |
| `14-teledentistry.md` | Remote photo consult requests, dentist review queue | ✅ Done |
| `15-hmo-insurance.md` | HMO payer catalog, patient coverage, claim documents & tracker | ✅ Done |
| `16-reports-workspace-completion.md` | Date/filter controls, detailed reports, and usable CSV exports | ✅ Done |
| `17-hmo-claim-workflow-ux.md` | Replace raw UUID fields with guided patient/invoice/encounter selection | ✅ Done |
| `18-pediatric-odontogram.md` | Pediatric (primary) tooth chart, per-surface + icon visual indicators | 🔵 Active |

---

## Release gates (from `docs/MVP_2.md`)

- Financial changes are transactional and audited.
- Protected clinical files are private — only authorized users with signed URLs can access them.
- Inventory balances reconcile to stock transactions.
- Notifications do not leak sensitive clinical content.
- All new modules honor role + entitlement + tenant checks.
- Price changes do not rewrite historical invoices.
- Reports cannot aggregate another clinic's data.
- Recall reminders handle retries without sending duplicates.

---

## Prerequisite

All MVP 1 release gates must pass before MVP 2 development begins.
