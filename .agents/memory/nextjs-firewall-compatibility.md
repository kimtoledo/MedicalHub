---
name: Next.js package firewall compatibility
description: Why this imported app cannot remain on its original Next.js 14 dependency.
---

Use a current supported Next.js major rather than restoring the imported Next.js 14 pin.

**Why:** Replit's package firewall blocks the available Next.js 14 releases for critical vulnerabilities, including the latest 14.2 patch. Installing from the original lockfile therefore cannot succeed.

**How to apply:** When changing framework dependencies, preserve the async request API migration and webpack compatibility unless a future verified Turbopack migration replaces it.