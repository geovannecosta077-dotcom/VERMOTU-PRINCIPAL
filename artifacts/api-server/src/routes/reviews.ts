import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, reviewsTable, usersTable, itemsTable } from "@workspace/db";
import { ListReviewsQueryParams, CreateReviewBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const q = ListReviewsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const rows = await db
    .select({
      id: reviewsTable.id,
      itemId: reviewsTable.itemId,
      userId: reviewsTable.userId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      userName: usersTable.name,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(eq(reviewsTable.itemId, q.data.itemId))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, userName: r.userName ?? "Anônimo", createdAt: r.createdAt.toISOString() })));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const b = CreateReviewBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const rating = Math.max(1, Math.min(5, b.data.rating));
  const [row] = await db
    .insert(reviewsTable)
    .values({
      itemId: b.data.itemId,
      userId: b.data.userId,
      rating,
      comment: b.data.comment ?? "",
    })
    .returning();
  // Recompute item rating aggregate
  const [agg] = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${reviewsTable.rating}), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.itemId, b.data.itemId));
  await db
    .update(itemsTable)
    .set({ ratingAvg: Number(agg.avg), ratingCount: Number(agg.count) })
    .where(eq(itemsTable.id, b.data.itemId));
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, row.userId));
  res.status(201).json({ ...row, userName: u?.name ?? "Anônimo", createdAt: row.createdAt.toISOString() });
});

export default router;
