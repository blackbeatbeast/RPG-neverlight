# apps/worker

Cloudflare Worker/Hono API and static asset entry.

## Issue #4 guest API

The local Worker exposes a minimal server-authoritative guest boundary:

- `POST /api/v1/guest/start` creates a guest or rotates the current session.
- `GET /api/v1/session` reports the authenticated guest session.
- `GET /api/v1/player` returns the current player aggregate and read-only feature flags.
- `PUT /api/v1/player/preferences` accepts only presentation preferences and requires both
  `X-CSRF-Token` and `Idempotency-Key`.
- `POST /api/v1/session/logout` revokes the current session.
- `POST /api/v1/guest/reset` deletes the guest data and clears the session/CSRF cookies.

The session cookie is opaque, `HttpOnly`, `SameSite=Lax`, and `Secure` outside local mode. The CSRF
cookie is readable by the same-origin client so it can be echoed in the header; the Worker also
checks its hash against the server-side session record. No request can select a player ID, balance,
or privileged feature flag. Guest reset is the documented local deletion path; account linking and
export are deferred to a later packet.
