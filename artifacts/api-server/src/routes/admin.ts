import { Router, type IRouter } from "express";
import { sql, desc, eq } from "drizzle-orm";
import {
  db,
  itemsTable,
  usersTable,
  messagesTable,
  ordersTable,
  appointmentsTable,
  adminLogsTable,
  reportsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [{ count: totalItems }] = await db.select({ count: sql<number>`count(*)::int` }).from(itemsTable);
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [{ count: totalMessages }] = await db.select({ count: sql<number>`count(*)::int` }).from(messagesTable);
  const [{ count: totalOrders }] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const [{ count: totalAppointments }] = await db.select({ count: sql<number>`count(*)::int` }).from(appointmentsTable);
  const [{ gmv }] = await db.select({ gmv: sql<number>`COALESCE(SUM(${ordersTable.total}), 0)::float` }).from(ordersTable);
  const [{ count: bannedUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(sql`${usersTable.banned} = true`);
  const [{ count: verifiedUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(sql`${usersTable.accountVerified} = true`);
  const [{ count: activeItems }] = await db.select({ count: sql<number>`count(*)::int` }).from(itemsTable).where(sql`${itemsTable.status} = 'active'`);
  const [{ count: pendingItems }] = await db.select({ count: sql<number>`count(*)::int` }).from(itemsTable).where(sql`${itemsTable.status} = 'pending'`);
  const [{ count: pendingReports }] = await db.select({ count: sql<number>`count(*)::int` }).from(reportsTable).where(eq(reportsTable.status, "pending"));

  const itemsByCategoryRows = await db
    .select({ category: itemsTable.type, count: sql<number>`count(*)::int` })
    .from(itemsTable)
    .groupBy(itemsTable.type);

  const newUsersByDayRows = await db
    .select({
      day: sql<string>`to_char(${usersTable.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .groupBy(sql`to_char(${usersTable.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${usersTable.createdAt}, 'YYYY-MM-DD')`);

  const ordersByStatusRows = await db
    .select({ status: ordersTable.status, count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const planCountRows = await db
    .select({ plan: usersTable.plan, count: sql<number>`count(*)::int` })
    .from(usersTable)
    .groupBy(usersTable.plan);

  const commission = Number(gmv) * 0.05;
  const proUsers = planCountRows.find((r) => r.plan === "pro")?.count ?? 0;
  const premiumUsers = planCountRows.find((r) => r.plan === "premium")?.count ?? 0;
  const subscriptions = proUsers * 49.9 + premiumUsers * 99.9;
  const simulatedRevenue = Math.round((commission + subscriptions) * 100) / 100;

  res.json({
    totalItems,
    totalUsers,
    totalMessages,
    totalOrders,
    totalAppointments,
    bannedUsers,
    verifiedUsers,
    activeItems,
    pendingItems,
    pendingReports,
    simulatedRevenue,
    gmv: Math.round(Number(gmv) * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    subscriptionRevenue: Math.round(subscriptions * 100) / 100,
    itemsByCategory: itemsByCategoryRows,
    newUsersByDay: newUsersByDayRows,
    ordersByStatus: ordersByStatusRows,
    planCount: planCountRows,
  });
});

router.get("/admin/orders", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: ordersTable.id,
      buyerId: ordersTable.buyerId,
      sellerId: ordersTable.sellerId,
      total: ordersTable.total,
      status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(200);
  res.json(rows);
});

router.get("/admin/logs", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(adminLogsTable)
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(500);
  res.json(rows);
});

router.post("/admin/logs", async (req, res): Promise<void> => {
  const { adminId, adminName, action, target, details } = req.body ?? {};
  if (!adminId || !action) {
    res.status(400).json({ error: "adminId e action são obrigatórios." });
    return;
  }
  const [row] = await db
    .insert(adminLogsTable)
    .values({
      adminId: Number(adminId),
      adminName: String(adminName ?? ""),
      action: String(action),
      target: String(target ?? ""),
      details: String(details ?? ""),
    })
    .returning();
  res.status(201).json(row);
});

router.get("/admin/reports", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt))
    .limit(200);
  res.json(rows);
});

router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido." }); return; }
  const { status } = req.body ?? {};
  if (!status || !["pending", "resolved", "dismissed"].includes(status)) {
    res.status(400).json({ error: "Status inválido. Use: pending, resolved ou dismissed." });
    return;
  }
  const [row] = await db
    .update(reportsTable)
    .set({ status })
    .where(eq(reportsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Denúncia não encontrada." }); return; }
  res.json(row);
});

router.delete("/admin/reports/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido." }); return; }
  await db.delete(reportsTable).where(eq(reportsTable.id, id));
  res.status(204).end();
});

router.post("/reports", async (req, res): Promise<void> => {
  const { reporterId, targetType, targetId, reason, details } = req.body ?? {};
  if (!reporterId || !targetId || !reason) {
    res.status(400).json({ error: "reporterId, targetId e reason são obrigatórios." });
    return;
  }
  const [row] = await db
    .insert(reportsTable)
    .values({
      reporterId: Number(reporterId),
      targetType: String(targetType ?? "item"),
      targetId: Number(targetId),
      reason: String(reason),
      details: String(details ?? ""),
    })
    .returning();
  res.status(201).json(row);
});

router.get("/admin/items", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(itemsTable)
    .orderBy(desc(itemsTable.premium), desc(itemsTable.createdAt));
  res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
});

export default router;
