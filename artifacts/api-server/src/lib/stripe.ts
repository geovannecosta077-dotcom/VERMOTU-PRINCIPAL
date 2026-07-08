import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

/**
 * Lazily construct the Stripe client. Throws only when a Stripe-dependent
 * route is actually invoked without STRIPE_SECRET_KEY configured, instead of
 * at module load time — this keeps the API server able to boot and serve
 * every non-payment route in environments without Stripe configured.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required but was not provided.");
  }
  _stripe = new Stripe(secretKey);
  return _stripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"];

export const PLAN_PRICING: Record<"pro" | "premium", { amount: number; label: string }> = {
  pro: { amount: 49, label: "Plano Básico" },
  premium: { amount: 99, label: "Plano Premium" },
};

export function priceIdForPlan(plan: "pro" | "premium"): string | undefined {
  if (plan === "pro") return process.env["STRIPE_PRICE_ID_PRO"] ?? process.env["STRIPE_PRICE_ID"];
  return process.env["STRIPE_PRICE_ID_PREMIUM"];
}
