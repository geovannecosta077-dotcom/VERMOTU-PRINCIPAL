---
name: Vermotu honest empty states vs. fake placeholder data
description: Pattern for handling optional profile/content fields that have no real data yet — read before adding UI that shows social links, business hours, or other seller-provided info.
---

Several UI sections were originally built with hardcoded placeholder data instead of reflecting real state (e.g. `loja.tsx` linked to `instagram.com`/`facebook.com` literally, and static "8h–18h" business hours, regardless of what the seller actually set).

**Why:** Code review flagged this as misleading — links pointing to generic external sites, or invented hours, look like real seller data but aren't. This is a general anti-pattern in this codebase: never render fabricated defaults for optional fields.

**How to apply:** When a field is optional and there's no UI yet for sellers to set it (e.g. social links have no DB column), prefer hiding the section entirely over inventing content. When the DB field already exists (e.g. `businessHoursOpen`/`businessHoursClose` on `users`), wire the real value through the API schema and render it conditionally, falling back to an honest "not provided" message — not a fabricated default.

Blog posts follow the same principle: `coverImageUrl` is now required (non-nullable) in `CreateBlogPost`, enforced both in the OpenAPI/Zod schema and the admin form, so posts can't be published with a placeholder icon instead of a real image.
