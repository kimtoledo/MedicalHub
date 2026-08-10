# Inventory

> **Status:** 🔜 Future — MVP 2

---

## What & Why

Clinics need to track dental consumables and supplies. Stock transactions must form an immutable ledger so inventory balances can always be reconciled to their transaction history.

---

## Done looks like

- Clinic admin can manage an item master: item name, SKU, category, unit of measure, supplier, reorder level.
- Stock in and stock out are recorded as individual transactions — direct balance edits are not allowed.
- Each transaction records: item, quantity, direction (in/out/adjustment), reason, batch/lot number (optional), expiry date (optional), recorded by, date.
- Current stock level is always derived from the transaction log, never stored as a mutable counter.
- Low-stock alerts appear on the clinic dashboard when an item falls below its reorder level.
- Expiring items (where tracked) appear in a separate alert list.
- Inventory report: current stock levels, usage by period, low-stock items, expiring items.

---

## Out of scope

- Purchase orders and supplier invoices.
- Barcode/QR scanning (can be added in a later iteration).
