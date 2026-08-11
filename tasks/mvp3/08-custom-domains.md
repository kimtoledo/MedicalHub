# Custom Domains

> **Status:** 🔜 Future — MVP 3

---

## What & Why

Premium clinics want their microsite to appear at their own domain (e.g. `www.smiledental.ph`) instead of `dentra.ph/clinic/smile-dental`. Custom domains require DNS verification and SSL provisioning before activation.

---

## Done looks like

- Clinic admin can add a custom domain from within clinic settings.
- Dentra.ph provides DNS instructions (CNAME or A record) that the clinic configures at their registrar.
- Dentra.ph verifies the domain is pointing correctly before activating it.
- SSL is provisioned automatically (Let's Encrypt or equivalent) once the domain is verified.
- Requests to the canonical Dentra.ph URL (`dentra.ph/clinic/[slug]`) redirect to the custom domain after activation.
- If DNS is misconfigured or the domain expires, the microsite falls back to the canonical Dentra.ph URL with no downtime.
- Custom domain activation and deactivation are recorded in the audit trail.

---

## Out of scope

- Subdomain hosting (`smile.dentra.ph`) — this could be a simpler tier but is separate scope.
- Email hosting on the custom domain.
