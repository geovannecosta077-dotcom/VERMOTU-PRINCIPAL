---
name: MotoHub/Vermotu admin access model
description: How admin auth works and its known trust-boundary limitation — read before touching any /admin/* route or user-listing endpoint.
---

Admin status is a boolean (`isAdmin`) on the `users` row, not a roles system. There is no session/cookie-based auth in this app (see replit.md: "Autenticação é customizada... não usa Replit Auth nem Clerk").

Server-side admin routes (`/admin/*`) are gated by a `requireAdmin` middleware that reads the caller's identity from an `x-user-id` request header and checks `isAdmin` in the DB.

**Why this matters:** `x-user-id` is client-supplied and therefore spoofable by anyone who knows a valid admin's user id — it is not a substitute for real authentication (session/JWT/signed cookie). This was flagged in code review as a genuine residual risk, but replacing it with proper session auth is a full architecture change requiring explicit user sign-off (see replit.md user preferences: ask before changing auth/DB/API contracts).

**How to apply:**
- Given the above, the load-bearing mitigation is: never expose `isAdmin` (or other admin-only fields) on any publicly-reachable endpoint, since that's what turns the spoofable header into a real exploit (attacker enumerates admin ids, then forges the header). Public/bulk user listings must return a stripped shape; only admin-gated endpoints (`requireAdmin`) should return the full user record.
- If the user ever asks for "real" auth/security hardening here, that means introducing actual session/token-based identity — treat it as an explicit architecture decision to confirm with the user first, not a drive-by fix.
