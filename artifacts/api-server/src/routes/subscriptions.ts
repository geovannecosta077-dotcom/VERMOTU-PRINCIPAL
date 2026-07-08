import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { stripe, STRIPE_WEBHOOK_SECRET, PLAN_PRICING, priceIdForPlan } from "../lib/stripe";
import type Stripe from "stripe";

const router: IRouter = Router();

const PIX_DATA: Record<string, { code: string; key: string; amount: number }> = {
  pro: {
    code: "00020126580014br.gov.bcb.pix01362504a042-8fee-4e1c-a908-17dff6449c8627600016BR.COM.PAGSEGURO01368C053B4F-1F47-4BBF-8275-488BC62E9F3B520489995303986540549.005802BR5922GEOVANNE BARBOZA COSTA6014RIO DE JANEIRO62290525PAGS0000049002606120212566304C61B",
    key: "2504a042-8fee-4e1c-a908-17dff6449c86",
    amount: 49,
  },
  premium: {
    code: "00020126580014br.gov.bcb.pix01362504a042-8fee-4e1c-a908-17dff6449c8627600016BR.COM.PAGSEGURO0136B58F4176-640D-4C60-97B9-A6160F874438520489995303986540599.005802BR5922GEOVANNE BARBOZA COSTA6014RIO DE JANEIRO62290525PAGS00000990026061202136363044330",
    key: "2504a042-8fee-4e1c-a908-17dff6449c86",
    amount: 99,
  },
};

function serializeSub(row: typeof subscriptionsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}

function originFromRequest(req: { headers: Record<string, unknown>; protocol: string }): string {
  const origin = req.headers["origin"];
  if (typeof origin === "string" && origin) return origin;
  const domains = (process.env["REPLIT_DOMAINS"] ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  if (domains[0]) return `https://${domains[0]}`;
  return `${req.protocol}://localhost`;
}

router.post("/subscriptions", async (req, res): Promise<void> => {
  const { userId, plan } = req.body ?? {};
  if (!userId || !plan) {
    res.status(400).json({ error: "userId e plan são obrigatórios." });
    return;
  }
  if (!["pro", "premium"].includes(plan)) {
    res.status(400).json({ error: "Plano inválido. Use: pro ou premium." });
    return;
  }
  const pix = PIX_DATA[plan as "pro" | "premium"];
  if (!pix) {
    res.status(400).json({ error: "Configuração de pagamento não encontrada." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId)));
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }
  const { proofUrl, proofName } = req.body ?? {};
  const [row] = await db
    .insert(subscriptionsTable)
    .values({
      userId: Number(userId),
      plan: String(plan),
      amount: pix.amount,
      status: proofUrl ? "proof_submitted" : "awaiting_payment",
      provider: "pix",
      pixCode: pix.code,
      pixKey: pix.key,
      proofUrl: proofUrl ? String(proofUrl) : null,
      proofName: proofName ? String(proofName) : null,
    })
    .returning();
  res.status(201).json(serializeSub(row!));
});

router.get("/subscriptions", async (req, res): Promise<void> => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "userId é obrigatório." });
    return;
  }
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt));
  res.json(rows.map(serializeSub));
});

router.patch("/subscriptions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const { proofUrl, proofName, status } = req.body ?? {};
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (proofUrl !== undefined) updateData.proofUrl = String(proofUrl);
  if (proofName !== undefined) updateData.proofName = String(proofName);
  if (status !== undefined) updateData.status = String(status);
  const [updated] = await db
    .update(subscriptionsTable)
    .set(updateData)
    .where(eq(subscriptionsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Assinatura não encontrada." });
    return;
  }
  res.json(serializeSub(updated));
});

// ---- Stripe Checkout ----

router.post("/subscriptions/checkout", async (req, res): Promise<void> => {
  const { userId, plan } = req.body ?? {};
  if (!userId || !plan) {
    res.status(400).json({ error: "userId e plan são obrigatórios." });
    return;
  }
  if (!["pro", "premium"].includes(plan)) {
    res.status(400).json({ error: "Plano inválido. Use: pro ou premium." });
    return;
  }
  const typedPlan = plan as "pro" | "premium";

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId)));
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  try {
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      stripeCustomerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId }).where(eq(usersTable.id, user.id));
    }

    const priceId = priceIdForPlan(typedPlan);
    const pricing = PLAN_PRICING[typedPlan];
    const origin = originFromRequest(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: String(user.id),
      metadata: { userId: String(user.id), plan: typedPlan },
      subscription_data: { metadata: { userId: String(user.id), plan: typedPlan } },
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              price_data: {
                currency: "brl",
                unit_amount: pricing.amount * 100,
                recurring: { interval: "month" },
                product_data: { name: `Vermotu — ${pricing.label}` },
              },
              quantity: 1,
            },
      ],
      success_url: `${origin}/planos?checkout=success`,
      cancel_url: `${origin}/planos?checkout=cancel`,
    });

    await db.insert(subscriptionsTable).values({
      userId: user.id,
      plan: typedPlan,
      amount: pricing.amount,
      status: "awaiting_payment",
      provider: "stripe",
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Falha ao criar sessão de checkout do Stripe");
    res.status(502).json({ error: "Não foi possível iniciar o pagamento com o Stripe." });
  }
});

// ---- Stripe Webhook ----

router.post("/subscriptions/webhook", async (req, res): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (!STRIPE_WEBHOOK_SECRET || !signature || typeof signature !== "string") {
    res.status(400).json({ error: "Assinatura do webhook ausente ou não configurada." });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    req.log.error({ err }, "Assinatura de webhook do Stripe inválida");
    res.status(400).json({ error: "Assinatura inválida." });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = Number(session.metadata?.["userId"] ?? session.client_reference_id);
        const plan = session.metadata?.["plan"] as "pro" | "premium" | undefined;
        if (!userId || !plan) break;

        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

        await db
          .update(usersTable)
          .set({ plan, stripeCustomerId: customerId ?? undefined })
          .where(eq(usersTable.id, userId));

        const [existing] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeCheckoutSessionId, session.id));

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (existing) {
          await db
            .update(subscriptionsTable)
            .set({
              status: "approved",
              stripeSubscriptionId: subscriptionId ?? null,
              stripeCustomerId: customerId ?? null,
              expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionsTable.id, existing.id));
        } else {
          await db.insert(subscriptionsTable).values({
            userId,
            plan,
            amount: PLAN_PRICING[plan].amount,
            status: "approved",
            provider: "stripe",
            stripeCustomerId: customerId ?? null,
            stripeSubscriptionId: subscriptionId ?? null,
            stripeCheckoutSessionId: session.id,
            expiresAt,
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
        if (!subscriptionId) break;
        const [sub] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeSubscriptionId, subscriptionId));
        if (sub) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await db
            .update(subscriptionsTable)
            .set({ status: "approved", expiresAt, updatedAt: new Date() })
            .where(eq(subscriptionsTable.id, sub.id));
          await db.update(usersTable).set({ plan: sub.plan }).where(eq(usersTable.id, sub.userId));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;
        if (!subscriptionId) break;
        const [sub] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeSubscriptionId, subscriptionId));
        if (sub) {
          await db
            .update(subscriptionsTable)
            .set({ status: "payment_failed", updatedAt: new Date() })
            .where(eq(subscriptionsTable.id, sub.id));
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const [sub] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
        if (sub) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          await db
            .update(subscriptionsTable)
            .set({ status: isActive ? "approved" : subscription.status, updatedAt: new Date() })
            .where(eq(subscriptionsTable.id, sub.id));
          if (!isActive) {
            await db.update(usersTable).set({ plan: "free" }).where(eq(usersTable.id, sub.userId));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const [sub] = await db
          .select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
        if (sub) {
          await db
            .update(subscriptionsTable)
            .set({ status: "canceled", updatedAt: new Date() })
            .where(eq(subscriptionsTable.id, sub.id));
          await db.update(usersTable).set({ plan: "free" }).where(eq(usersTable.id, sub.userId));
        }
        break;
      }

      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, eventType: event.type }, "Falha ao processar evento do webhook do Stripe");
    res.status(500).json({ error: "Erro ao processar evento." });
  }
});

router.get("/admin/subscriptions", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: subscriptionsTable.id,
      userId: subscriptionsTable.userId,
      plan: subscriptionsTable.plan,
      amount: subscriptionsTable.amount,
      status: subscriptionsTable.status,
      provider: subscriptionsTable.provider,
      pixCode: subscriptionsTable.pixCode,
      pixKey: subscriptionsTable.pixKey,
      proofUrl: subscriptionsTable.proofUrl,
      proofName: subscriptionsTable.proofName,
      adminNote: subscriptionsTable.adminNote,
      approvedBy: subscriptionsTable.approvedBy,
      stripeCustomerId: subscriptionsTable.stripeCustomerId,
      stripeSubscriptionId: subscriptionsTable.stripeSubscriptionId,
      stripeCheckoutSessionId: subscriptionsTable.stripeCheckoutSessionId,
      expiresAt: subscriptionsTable.expiresAt,
      createdAt: subscriptionsTable.createdAt,
      updatedAt: subscriptionsTable.updatedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(subscriptionsTable)
    .leftJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
    .orderBy(desc(subscriptionsTable.createdAt));
  res.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    })),
  );
});

router.patch("/admin/subscriptions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }
  const { status, adminNote, approvedBy } = req.body ?? {};
  if (!status || !["approved", "rejected", "in_review", "awaiting_payment"].includes(status)) {
    res.status(400).json({ error: "Status inválido." });
    return;
  }

  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  if (!sub) {
    res.status(404).json({ error: "Assinatura não encontrada." });
    return;
  }

  const updateData: Record<string, unknown> = {
    status,
    adminNote: adminNote ?? null,
    updatedAt: new Date(),
  };

  if (status === "approved") {
    if (approvedBy) updateData.approvedBy = Number(approvedBy);
    updateData.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db
      .update(usersTable)
      .set({ plan: sub.plan })
      .where(eq(usersTable.id, sub.userId));
  }

  const [updated] = await db
    .update(subscriptionsTable)
    .set(updateData)
    .where(eq(subscriptionsTable.id, id))
    .returning();

  res.json({
    ...updated,
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
    expiresAt: updated!.expiresAt ? updated!.expiresAt.toISOString() : null,
  });
});

export default router;
