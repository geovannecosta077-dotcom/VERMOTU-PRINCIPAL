import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import {
  CreateCouponBody,
  DeleteCouponParams,
  ValidateCouponBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ser = (c: typeof couponsTable.$inferSelect) => ({ ...c, createdAt: c.createdAt.toISOString() });

router.get("/coupons", async (_req, res): Promise<void> => {
  const rows = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  res.json(rows.map(ser));
});

router.post("/coupons", async (req, res): Promise<void> => {
  const b = CreateCouponBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [row] = await db.insert(couponsTable).values({
    code: b.data.code.toUpperCase(),
    type: b.data.type,
    value: b.data.value,
    minOrder: b.data.minOrder ?? 0,
    active: b.data.active ?? true,
  }).returning();
  res.status(201).json(ser(row));
});

router.delete("/coupons/:id", async (req, res): Promise<void> => {
  const p = DeleteCouponParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  await db.delete(couponsTable).where(eq(couponsTable.id, p.data.id));
  res.sendStatus(204);
});

router.post("/coupons/validate", async (req, res): Promise<void> => {
  const b = ValidateCouponBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, b.data.code.toUpperCase()));
  if (!c || !c.active) {
    res.json({ valid: false, discount: 0, message: "Cupom inválido" });
    return;
  }
  if (b.data.subtotal < c.minOrder) {
    res.json({ valid: false, discount: 0, message: `Pedido mínimo de R$ ${c.minOrder.toFixed(2)}` });
    return;
  }
  let discount = c.type === "percent" ? b.data.subtotal * (c.value / 100) : c.value;
  discount = Math.min(discount, b.data.subtotal);
  res.json({ valid: true, discount: Math.round(discount * 100) / 100, coupon: ser(c), message: "Cupom aplicado!" });
});

export default router;
