import { Router, type IRouter } from "express";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  db,
  favoritesTable,
  conversationsTable,
  messagesTable,
  appointmentsTable,
} from "@workspace/db";
import {
  ListFavoritesQueryParams,
  ToggleFavoriteBody,
  ListConversationsQueryParams,
  CreateConversationBody,
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Favorites
router.get("/favorites", async (req, res): Promise<void> => {
  const q = ListFavoritesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const rows = await db
    .select({ itemId: favoritesTable.itemId })
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, q.data.userId));
  res.json(rows.map((r) => r.itemId));
});

router.post("/favorites", async (req, res): Promise<void> => {
  const b = ToggleFavoriteBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const { userId, itemId } = b.data;
  const [existing] = await db
    .select()
    .from(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.itemId, itemId)));
  if (existing) {
    await db
      .delete(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.itemId, itemId)));
    res.json({ favorited: false });
    return;
  }
  await db.insert(favoritesTable).values({ userId, itemId });
  res.json({ favorited: true });
});

// Conversations
router.get("/conversations", async (req, res): Promise<void> => {
  const q = ListConversationsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(
      sql`${conversationsTable.buyerId} = ${q.data.userId} OR ${conversationsTable.sellerId} = ${q.data.userId}`,
    )
    .orderBy(desc(conversationsTable.updatedAt));
  res.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const b = CreateConversationBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const { buyerId, sellerId, itemId } = b.data;
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.buyerId, buyerId),
        eq(conversationsTable.itemId, itemId),
      ),
    );
  if (existing) {
    res.json({ ...existing, updatedAt: existing.updatedAt.toISOString() });
    return;
  }
  const [row] = await db
    .insert(conversationsTable)
    .values({ buyerId, sellerId, itemId })
    .returning();
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

// Messages
router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const p = ListMessagesParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, p.data.id))
    .orderBy(asc(messagesTable.timestamp));
  res.json(rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })));
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const p = SendMessageParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = SendMessageBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const conversationId = p.data.id;
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversa não encontrada" });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({
      conversationId,
      senderId: b.data.senderId,
      text: b.data.text,
    })
    .returning();
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  const created = [{ ...msg, timestamp: msg.timestamp.toISOString() }];

  // Auto-reply from the seller if buyer is messaging
  if (b.data.senderId === conv.buyerId) {
    const [reply] = await db
      .insert(messagesTable)
      .values({
        conversationId,
        senderId: conv.sellerId,
        text: "Olá! Recebi sua mensagem. Em breve respondo com mais detalhes sobre o anúncio.",
      })
      .returning();
    created.push({ ...reply, timestamp: reply.timestamp.toISOString() });
  }
  res.status(201).json(created);
});

// Appointments
router.get("/appointments", async (req, res): Promise<void> => {
  const q = ListAppointmentsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.userId, q.data.userId))
    .orderBy(desc(appointmentsTable.id));
  res.json(rows);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const b = CreateAppointmentBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [row] = await db
    .insert(appointmentsTable)
    .values({
      serviceId: b.data.serviceId,
      userId: b.data.userId,
      date: b.data.date,
      status: "scheduled",
    })
    .returning();
  res.status(201).json(row);
});

export default router;
