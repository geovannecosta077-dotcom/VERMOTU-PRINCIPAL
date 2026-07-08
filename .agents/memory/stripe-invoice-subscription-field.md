---
name: Stripe Node SDK v22 Invoice subscription field moved
description: Where to find the subscription reference on an Invoice webhook event in modern Stripe SDK versions.
---

On `stripe` npm package v22+, `Invoice.subscription` no longer exists as a direct field. Stripe moved it under a discriminated `parent` object.

Correct access path in `invoice.paid` / `invoice.payment_failed` webhook handlers:

```ts
const subRef = invoice.parent?.subscription_details?.subscription;
const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
```

**Why:** Stripe's API evolved the Invoice object to nest subscription/quote provenance under `parent.{subscription_details,quote_details}` instead of a flat `subscription` field. Code written against older Stripe API docs/examples will fail `tsc` with "Property 'subscription' does not exist on type 'Invoice'".

**How to apply:** Whenever wiring Stripe invoice webhook handlers, check the installed `stripe` package's `Invoices.d.ts` for the actual `Invoice.parent` shape rather than trusting older tutorials/docs — the SDK type is the source of truth for the installed API version.
