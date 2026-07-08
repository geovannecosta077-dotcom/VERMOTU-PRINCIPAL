---
name: MotoHub/Vermotu item moderation & visibility
description: How item status/visibility works across public, owner, and admin views — read before changing the /items list endpoint.
---

Items go through a moderation lifecycle (`status`: pending → active, plus rejected/etc.). This has a three-tier visibility rule that's easy to accidentally collapse into one:

- **Public/anonymous/other-user views** (marketplace browsing, another seller's storefront page) must only ever see `status = active` items.
- **The owner viewing their own items** (e.g. "Minha conta") needs to see all statuses, including pending/rejected — otherwise sellers can't tell their listing is awaiting approval.
- **Admin views** need every status across every seller, but must go through an admin-gated endpoint, not the public listing.

**Why:** Public listing and "my items" both use the same `/items?sellerId=` query shape. It's tempting to just drop the active-only filter whenever `sellerId` is present, but that leaks other sellers' pending/rejected listings on public storefront pages. The safe rule is to require the caller's own identity (matching `sellerId`) before relaxing the filter, and to route admin-wide visibility through a separate `requireAdmin` endpoint instead of relaxing the public one.

**How to apply:** Any future change to item listing/filtering logic must keep these three tiers distinct — don't let "convenience" cause a public endpoint to accidentally return non-active items for an arbitrary seller id.
