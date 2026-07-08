import Stripe from "stripe";

const secretKey = process.env["STRIPE_SECRET_KEY"];

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required but was not provided.");
}

export const stripe = new Stripe(secretKey);

export const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"];

export const PLAN_PRICING: Record<"pro" | "premium", { amount: number; label: string }> = {
  pro: { amount: 49, label: "Plano Básico" },
  premium: { amount: 99, label: "Plano Premium" },
};

export function priceIdForPlan(plan: "pro" | "premium"): string | undefined {
  if (plan === "pro") return process.env["STRIPE_PRICE_ID_PRO"] ?? process.env["STRIPE_PRICE_ID"];
  return process.env["STRIPE_PRICE_ID_PREMIUM"];
}
