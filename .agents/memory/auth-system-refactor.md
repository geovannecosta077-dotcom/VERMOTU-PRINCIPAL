---
name: Auth system refactor
description: Complete auth refactor — token-based password reset, secured endpoints, redesigned login dialog with view-based flow.
---

## Architecture

**View-based dialog (not tab-based):** `AuthView` = `signin | signup | forgot | reset-sent | recovery | resend-verification | support`. Each view is a self-contained component rendered inside a single `LoginDialog`.

**Password reset flow:**
1. `POST /api/auth/forgot-password` — rate-limited (5/hr/IP), generates 32-byte crypto token, stores in `password_reset_tokens` table with 1hr expiry. Returns `{ ok: true }` always (prevents email enumeration). In dev mode (no `SMTP_HOST`), also returns `{ devMode: true, devToken: "<hex>" }`.
2. `POST /api/auth/reset-password` — validates token (not used, not expired), bcrypt hashes new password, marks token used in a DB transaction. Returns `{ ok: true, user: PublicUser }`.
3. `POST /api/auth/resend-verification` — rate-limited, placeholder (returns ok).

**Why:** The old `POST /users/set-password` allowed anyone to reset any password with only an email address (no verification). It was removed and replaced with the token-based flow.

## Database

`password_reset_tokens` table added to `lib/db/src/schema/index.ts`. Pushed via `pnpm --filter @workspace/db run push`.

## Security improvements applied

- In-memory rate limiter (5 req/hr/IP) on all three auth endpoints — no extra deps needed
- `lockedUntil: null` (not `sql\`NULL\``) works fine for nullable timestamp columns in Drizzle
- Tokens invalidated on new request (only one active token per user at a time)
- Old insecure `set-password` endpoint removed from `users.ts`
- Minimum password length raised to 8 (was 6)

## Frontend

- `login-dialog.tsx` completely rewritten — view system, `NavBack`, `ErrorBanner`, `SuccessBanner`, `PasswordStrengthBar`, `SectionDivider` sub-components
- `recuperar-senha.tsx` added at `/recuperar-senha` — standalone page for reset links with `?token=` query param
- `App.tsx` updated with the new route

## Known limitations / next steps

- No real email sending yet (`SMTP_HOST` env var triggers it when set; nodemailer not yet implemented)
- `resend-verification` is a placeholder (no email infra)
- `chat.tsx:92` and `conta.tsx:273` still have `!` assertion crashes on unauthenticated access (separate task)
