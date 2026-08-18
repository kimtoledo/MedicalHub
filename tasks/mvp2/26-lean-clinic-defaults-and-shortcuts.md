# Lean Clinic Defaults and Shortcuts

> **Status:** 🔵 Active — safe walk-in defaults and Today search shortcut delivered; favorites/templates remain; Replit task reference unavailable in the current Codex session

---

## What & Why

After the main transaction path is unified, repeated selections can be reduced further with safe personal/clinic defaults. Defaults must speed up data entry without silently committing clinical or financial decisions.

---

## Scope

- Remember the user's last active branch and safe last-used workflow preferences.
- Add favorite/recent services and recently accessed patients without exposing them outside the clinic.
- Add clinic-managed note templates for routine non-sensitive service documentation.
- Provide discoverable keyboard shortcuts for search and primary actions on desktop.
- Offer explicit combined actions such as `Save and continue` or `Complete and generate invoice` where both steps remain visible.
- Keep mobile controls large, labeled, and independent of keyboard shortcuts.

---

## Done looks like

1. Repeated routine transactions require fewer selections after the first use.
2. Defaults are visible, editable, and never silently submit a record.
3. Recent/favorite data remains tenant scoped and appropriate to the signed-in user.
4. Keyboard shortcuts do not interfere with form typing or accessibility behavior.
5. UI tests, typechecks, builds, and usability click-count checks pass.

---

## Delivered so far

- The shell already remembers active branch per clinic; the walk-in flow reuses that branch automatically.
- Walk-ins prefer a configured quick service, auto-select the only available dentist, and use the first valid slot today.
- Pressing `/` outside a form focuses the tenant-scoped patient finder on Today.

## Remaining

- Favorite/recent service controls.
- Clinic-managed routine note templates.
- Additional explicit save-and-continue actions after the continuous flow is completed.
