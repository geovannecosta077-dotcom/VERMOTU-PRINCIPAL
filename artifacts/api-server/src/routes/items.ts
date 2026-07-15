import { Router, type IRouter } from "express";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db, itemsTable, usersTable } from "@workspace/db";
import {
  ListItemsQueryParams,
  CreateItemBody,
  GetItemParams,
  UpdateItemParams,
  UpdateItemBody,
  DeleteItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Auth helper ──────────────────────────────────────────────────────────
// This codebase authenticates writes via the `x-user-id` header (set by the
// frontend after login) rather than sessions/JWT. Reused here so PATCH/DELETE
// can verify the caller owns the item (or is an admin) before mutating it.
async function getRequestUser(req: { headers: Record<string, unknown> }) {
  const raw = req.headers["x-user-id"];
  const userId = raw ? parseInt(String(raw), 10) : NaN;
  if (isNaN(userId)) return null;
  const [user] = await db
    .select({ id: usersTable.id, isAdmin: usersTable.isAdmin, banned: usersTable.banned })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user ?? null;
}

router.get("/items", async (req, res): Promise<void> => {
  const q = ListItemsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const filters = [];
  // Public listing (storefront pages, search, etc.) always returns active
  // items only. The one exception: when the caller is requesting their own
  // items (sellerId matches the x-user-id of the logged-in caller, e.g. the
  // seller viewing "Minha conta"), include every status so they can see
  // pending/rejected listings too. This must stay scoped to the owner only
  // — otherwise anyone could pass someone else's sellerId to see their
  // pending/rejected listings on a public storefront page.
  const rawViewerId = req.headers["x-user-id"];
  const viewerId = rawViewerId ? parseInt(String(rawViewerId), 10) : NaN;
  const isOwnerRequest = q.data.sellerId != null && viewerId === q.data.sellerId;
  if (!isOwnerRequest) {
    filters.push(eq(itemsTable.status, "active"));
  }
  if (q.data.type) filters.push(eq(itemsTable.type, q.data.type));
  if (q.data.brand) filters.push(eq(itemsTable.brand, q.data.brand));
  if (q.data.category) filters.push(eq(itemsTable.category, q.data.category));
  if (q.data.city) filters.push(ilike(itemsTable.location, `%${q.data.city}%`));
  if (q.data.sellerId) filters.push(eq(itemsTable.sellerId, q.data.sellerId));
  if (q.data.q) {
    filters.push(
      or(
        ilike(itemsTable.title, `%${q.data.q}%`),
        ilike(itemsTable.description, `%${q.data.q}%`),
        ilike(itemsTable.brand, `%${q.data.q}%`),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(itemsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(itemsTable.premium), desc(itemsTable.createdAt));
  res.json(rows.map(serialize));
});

router.post("/items", async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Preencha todos os campos obrigatórios do anúncio." });
    return;
  }
  const data = parsed.data;
  const [seller] = await db.select().from(usersTable).where(eq(usersTable.id, data.sellerId));
  if (!seller) {
    res.status(401).json({ error: "Faça login para publicar um anúncio." });
    return;
  }
  if (!seller.cpf) {
    res.status(403).json({ error: "Cadastre seu CPF antes de publicar um anúncio." });
    return;
  }
  const [row] = await db
    .insert(itemsTable)
    .values({
      type: data.type,
      category: data.category ?? "geral",
      title: data.title,
      brand: data.brand ?? null,
      model: data.model ?? null,
      condition: data.condition ?? "usado",
      price: data.price,
      year: data.year ?? null,
      mileage: data.mileage ?? null,
      engineSize: data.engineSize ?? null,
      color: (data as Record<string, unknown>).color ? String((data as Record<string, unknown>).color) : null,
      fuelType: (data as Record<string, unknown>).fuelType ? String((data as Record<string, unknown>).fuelType) : null,
      optionals: (data as Record<string, unknown>).optionals ? String((data as Record<string, unknown>).optionals) : null,
      tradeInfo: (data as Record<string, unknown>).tradeInfo ? String((data as Record<string, unknown>).tradeInfo) : null,
      phone: (data as Record<string, unknown>).phone ? String((data as Record<string, unknown>).phone) : null,
      address: (data as Record<string, unknown>).address ? String((data as Record<string, unknown>).address) : null,
      workingHours: (data as Record<string, unknown>).workingHours ? String((data as Record<string, unknown>).workingHours) : null,
      extras: (data as Record<string, unknown>).extras ? String((data as Record<string, unknown>).extras) : null,
      image: data.image,
      description: data.description,
      location: data.location,
      state: data.state ?? "",
      sellerId: data.sellerId,
      premium: data.premium ?? false,
      stock: data.stock ?? 1,
      status: "pending",
    })
    .returning();
  res.status(201).json(serialize(row!));
});

router.get("/items/:id", async (req, res): Promise<void> => {
  const p = GetItemParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [row] = await db.select().from(itemsTable).where(eq(itemsTable.id, p.data.id));
  if (!row) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  res.json(serialize(row));
});

router.patch("/items/:id", async (req, res): Promise<void> => {
  const p = UpdateItemParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = UpdateItemBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }

  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: "Faça login para editar este anúncio." });
    return;
  }
  const [existing] = await db.select({ sellerId: itemsTable.sellerId }).from(itemsTable).where(eq(itemsTable.id, p.data.id));
  if (!existing) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  if (existing.sellerId !== user.id && !user.isAdmin) {
    res.status(403).json({ error: "Você não tem permissão para editar este anúncio." });
    return;
  }

  const [row] = await db
    .update(itemsTable)
    .set(b.data)
    .where(eq(itemsTable.id, p.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  res.json(serialize(row));
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const p = DeleteItemParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }

  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: "Faça login para remover este anúncio." });
    return;
  }
  const [existing] = await db.select({ sellerId: itemsTable.sellerId }).from(itemsTable).where(eq(itemsTable.id, p.data.id));
  if (!existing) {
    res.status(404).json({ error: "Item não encontrado" });
    return;
  }
  if (existing.sellerId !== user.id && !user.isAdmin) {
    res.status(403).json({ error: "Você não tem permissão para remover este anúncio." });
    return;
  }

  await db.delete(itemsTable).where(eq(itemsTable.id, p.data.id));
  res.sendStatus(204);
});

function serialize(row: typeof itemsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export default router;
