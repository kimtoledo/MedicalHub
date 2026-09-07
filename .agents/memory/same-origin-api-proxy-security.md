---
name: Same-origin API proxy security
description: Origin handling rule for authenticated browser requests proxied from Next.js to the internal Fastify API.
---

Validate a browser-supplied Origin against the request host or forwarded host before replacing it with the API’s configured trusted origin for the internal server-to-server hop.

**Why:** Replit’s reverse proxy gives the browser a dynamic public hostname while the internal services use localhost. Forwarding the public Origin makes Fastify CORS reject valid requests, but removing Origin entirely makes Better Auth reject them and weakens cross-origin protection.

**How to apply:** Keep browser-to-Next requests same-origin, accept forwarded public hosts from the reverse proxy, and normalize Origin only after that validation when proxying to Fastify.