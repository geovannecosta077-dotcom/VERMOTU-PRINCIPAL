import { Router, type IRouter } from "express";
import { eq, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  itemsTable,
  couponsTable,
} from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { recomputeItemScore, recomputeCompanyScore, logEvent } from "../lib/ranking.js";

const router: IRouter = Router();

async function expand(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return { ...order, createdAt: order.createdAt.toISOString(), items };
}

router.get("/orders", async (req, res): Promise<void> => {
  const q = ListOrdersQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  let rows: Array<typeof ordersTable.$inferSelect> = [];
  if (q.data.buyerId) {
    rows = await db.select().from(ordersTable).where(eq(ordersTable.buyerId, q.data.buyerId)).orderBy(desc(ordersTable.createdAt));
  } else if (q.data.sellerId) {
    rows = await db.select().from(ordersTable).where(eq(ordersTable.sellerId, q.data.sellerId)).orderBy(desc(ordersTable.createdAt));
  } else {
    rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  }
  if (rows.length === 0) {
    res.json([]);
    return;
  }
  const ids = rows.map((r) => r.id);
  const allItems = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, ids));
  const map = new Map<number, typeof allItems>();
  for (const it of allItems) {
    if (!map.has(it.orderId)) map.set(it.orderId, []);
    map.get(it.orderId)!.push(it);
  }
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), items: map.get(r.id) ?? [] })));
});

router.post("/orders", async (req, res): Promise<void> => {
  const b = CreateOrderBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const lines = b.data.lines;
  if (lines.length === 0) {
    res.status(400).json({ error: "Carrinho vazio" });
    return;
  }
  const itemIds = lines.map((l) => l.itemId);
  const items = await db.select().from(itemsTable).where(inArray(itemsTable.id, itemIds));
  if (items.length === 0) {
    res.status(400).json({ error: "Itens não encontrados" });
    return;
  }
  // Group by sellerId — create one order per seller (use first seller for simplicity)
  const sellerId = items[0].sellerId;
  const itemsForSeller = items.filter((i) => i.sellerId === sellerId);
  const validLines = lines.filter((l) => itemsForSeller.some((i) => i.id === l.itemId));
  let subtotal = 0;
  const orderItemRows: Array<{ itemId: number; title: string; image: string; price: number; qty: number }> = [];
  for (const l of validLines) {
    const it = itemsForSeller.find((i) => i.id === l.itemId)!;
    const qty = Math.max(1, l.qty);
    subtotal += it.price * qty;
    orderItemRows.push({ itemId: it.id, title: it.title, image: it.image, price: it.price, qty });
  }
  let discount = 0;
  let couponCode: string | null = null;
  if (b.data.couponCode) {
    const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, b.data.couponCode.toUpperCase()));
    if (c && c.active && subtotal >= c.minOrder) {
      discount = c.type === "percent" ? subtotal * (c.value / 100) : c.value;
      discount = Math.min(discount, subtotal);
      couponCode = c.code;
    }
  }
  const total = Math.max(0, subtotal - discount);
  const [order] = await db.insert(ordersTable).values({
    buyerId: b.data.buyerId,
    sellerId,
    status: "pending",
    subtotal,
    discount,
    total,
    couponCode,
    paymentMethod: b.data.paymentMethod,
    shippingAddress: b.data.shippingAddress,
  }).returning();
  await db.insert(orderItemsTable).values(orderItemRows.map((r) => ({ ...r, orderId: order.id })));
  // Auto-mark as paid for pix/card simulation
  if (b.data.paymentMethod === "pix" || b.data.paymentMethod === "card") {
    await db.update(ordersTable).set({ status: "paid" }).where(eq(ordersTable.id, order.id));
  }
  // Decrement stock
  for (const r of orderItemRows) {
    await db.update(itemsTable).set({ stock: sql`GREATEST(${itemsTable.stock} - ${r.qty}, 0)` }).where(eq(itemsTable.id, r.itemId));
  }
  await logEvent({ userId: b.data.buyerId, eventType: "purchase", targetType: "company", targetId: sellerId, metadata: { orderId: order.id } });
  for (const r of orderItemRows) {
    await logEvent({ userId: b.data.buyerId, eventType: "purchase", targetType: "item", targetId: r.itemId, metadata: { orderId: order.id } });
    await recomputeItemScore(r.itemId);
  }
  await recomputeCompanyScore(sellerId);
  const full = await expand(order.id);
  res.status(201).json(full);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const p = GetOrderParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const o = await expand(p.data.id);
  if (!o) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }
  res.json(o);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const p = UpdateOrderStatusParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = UpdateOrderStatusBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  await db.update(ordersTable).set({ status: b.data.status }).where(eq(ordersTable.id, p.data.id));
  const o = await expand(p.data.id);
  if (!o) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }
  await recomputeCompanyScore(o.sellerId);
  res.json(o);
});

export default router;
