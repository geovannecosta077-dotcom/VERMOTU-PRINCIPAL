import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, subscriptionsTable, usersTable } from "@workspace/db";

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

router.get("/admin/subscriptions", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: subscriptionsTable.id,
      userId: subscriptionsTable.userId,
      plan: subscriptionsTable.plan,
      amount: subscriptionsTable.amount,
      status: subscriptionsTable.status,
      pixCode: subscriptionsTable.pixCode,
      pixKey: subscriptionsTable.pixKey,
      proofUrl: subscriptionsTable.proofUrl,
      proofName: subscriptionsTable.proofName,
      adminNote: subscriptionsTable.adminNote,
      approvedBy: subscriptionsTable.approvedBy,
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
