import { Router, type IRouter } from "express";
import { eq, asc, and, or, gte, lte, isNull } from "drizzle-orm";
import { db, bannersTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const CreateBannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaUrl: z.string().optional().default("/"),
  imageUrl: z.string().optional().default(""),
  bgColor: z.string().optional().default("#000000"),
  order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  durationSecs: z.number().int().optional().default(6),
});

const UpdateBannerSchema = CreateBannerSchema.partial();

router.get("/banners", async (req, res): Promise<void> => {
  const all = req.query.all === "true";
  const now = new Date();
  let rows;
  if (all) {
    rows = await db.select().from(bannersTable).orderBy(asc(bannersTable.order));
  } else {
    rows = await db
      .select()
      .from(bannersTable)
      .where(
        and(
          eq(bannersTable.active, true),
          or(isNull(bannersTable.startsAt), lte(bannersTable.startsAt, now)),
          or(isNull(bannersTable.endsAt), gte(bannersTable.endsAt, now))
        )
      )
      .orderBy(asc(bannersTable.order));
  }
  res.json(rows);
});

router.get("/admin/banners", async (_req, res): Promise<void> => {
  const rows = await db.select().from(bannersTable).orderBy(asc(bannersTable.order));
  res.json(rows);
});

router.post("/admin/banners", async (req, res): Promise<void> => {
  const parsed = CreateBannerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos." }); return; }
  const { startsAt, endsAt, ...rest } = parsed.data;
  const [row] = await db.insert(bannersTable).values({
    ...rest,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
  }).returning();
  res.status(201).json(row);
});

router.put("/admin/banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido." }); return; }
  const parsed = UpdateBannerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dados inválidos." }); return; }
  const { startsAt, endsAt, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (startsAt !== undefined) updates.startsAt = startsAt ? new Date(startsAt) : null;
  if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;
  const [row] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Banner não encontrado." }); return; }
  res.json(row);
});

router.delete("/admin/banners/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido." }); return; }
  await db.delete(bannersTable).where(eq(bannersTable.id, id));
  res.json({ ok: true });
});

export default router;
