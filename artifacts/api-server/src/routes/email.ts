import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, emailCampaignsTable, usersTable } from "@workspace/db";
import { AdminSendEmailBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/admin/email/send", async (req, res): Promise<void> => {
  const parsed = AdminSendEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos. Informe assunto, corpo e sentBy." });
    return;
  }
  const { subject, body, targetFilter, sentBy, sentByName } = parsed.data;
  const filter = targetFilter ?? "all";

  const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
  const recipientCount = allUsers.length;

  const [campaign] = await db
    .insert(emailCampaignsTable)
    .values({
      subject,
      body,
      targetFilter: filter,
      recipientCount,
      sentBy,
      sentByName: sentByName ?? "",
    })
    .returning();

  res.json({ recipientCount, campaignId: campaign!.id });
});

router.get("/admin/email/campaigns", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(emailCampaignsTable)
    .orderBy(desc(emailCampaignsTable.createdAt));
  res.json(rows);
});

export default router;
