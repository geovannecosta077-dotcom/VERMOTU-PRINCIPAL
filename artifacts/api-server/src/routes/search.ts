import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  serviceRequestsTable,
  serviceProposalsTable,
  usersTable,
  conversationsTable,
} from "@workspace/db";
import {
  ParseSearchQueryBody,
  CreateServiceRequestBody,
  ListMyServiceRequestsQueryParams,
  ListIncomingServiceRequestsQueryParams,
  GetServiceRequestParams,
  CreateServiceProposalParams,
  CreateServiceProposalBody,
  AcceptServiceProposalParams,
  AcceptServiceProposalBody,
} from "@workspace/api-zod";
import { parseNaturalQuery } from "../lib/searchParser.js";
import { logEvent, recomputeCompanyScore, computeProximityScore } from "../lib/ranking.js";

const router: IRouter = Router();

type ServiceRequestRow = typeof serviceRequestsTable.$inferSelect;
type ServiceProposalRow = typeof serviceProposalsTable.$inferSelect;

function serializeRequest(row: ServiceRequestRow) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function serializeProposals(rows: ServiceProposalRow[]) {
  if (rows.length === 0) return [];
  const companyIds = Array.from(new Set(rows.map((r) => r.companyId)));
  const companies = await db.select().from(usersTable).where(inArray(usersTable.id, companyIds));
  const byId = new Map(companies.map((c) => [c.id, c]));
  return rows.map((r) => {
    const company = byId.get(r.companyId);
    const accepted = r.status === "aceita";
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      companyName: company?.storeName || company?.name || null,
      companyCity: company?.city ?? null,
      contactPhone: accepted ? company?.phone ?? null : null,
      contactName: accepted ? company?.name ?? null : null,
    };
  });
}

async function buildRequestWithProposals(request: ServiceRequestRow) {
  const proposals = await db
    .select()
    .from(serviceProposalsTable)
    .where(eq(serviceProposalsTable.requestId, request.id))
    .orderBy(desc(serviceProposalsTable.createdAt));
  return { request: serializeRequest(request), proposals: await serializeProposals(proposals) };
}

// Parse natural language query (fast, deterministic, no external calls)
router.post("/search/parse", (req, res): void => {
  const b = ParseSearchQueryBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const result = parseNaturalQuery(b.data.query, b.data.city ?? null);
  res.json(result);
});

// Create a service/purchase request, broadcast to matching companies
router.post("/requests", async (req, res): Promise<void> => {
  const b = CreateServiceRequestBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const publicId = `SR-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
  const [row] = await db
    .insert(serviceRequestsTable)
    .values({
      publicId,
      customerId: b.data.customerId,
      rawQuery: b.data.rawQuery,
      category: b.data.category,
      subcategory: b.data.subcategory ?? null,
      brand: b.data.brand ?? null,
      model: b.data.model ?? null,
      partType: b.data.partType ?? null,
      serviceType: b.data.serviceType ?? null,
      priceRange: b.data.priceRange ?? null,
      kmMax: b.data.kmMax ?? null,
      yearFrom: b.data.yearFrom ?? null,
      yearTo: b.data.yearTo ?? null,
      condition: b.data.condition ?? null,
      transmission: b.data.transmission ?? null,
      motoCategory: b.data.motoCategory ?? null,
      searchRadius: b.data.searchRadius ?? null,
      urgency: b.data.urgency,
      city: b.data.city ?? "",
      lat: b.data.lat ?? null,
      lng: b.data.lng ?? null,
    })
    .returning();
  await logEvent({
    userId: b.data.customerId,
    eventType: "request_created",
    targetType: "request",
    targetId: row!.id,
    query: b.data.rawQuery,
    metadata: { category: b.data.category },
  });
  res.status(201).json(serializeRequest(row!));
});

// Requests created by a customer
router.get("/requests/mine", async (req, res): Promise<void> => {
  const q = ListMyServiceRequestsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.customerId, q.data.customerId))
    .orderBy(desc(serviceRequestsTable.createdAt));
  const result = await Promise.all(rows.map((r) => buildRequestWithProposals(r)));
  res.json(result);
});

// Open requests visible to a company, same-city requests first
router.get("/requests/incoming", async (req, res): Promise<void> => {
  const q = ListIncomingServiceRequestsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const [company] = await db.select().from(usersTable).where(eq(usersTable.id, q.data.companyId));
  const rows = await db
    .select()
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.status, "aberta"))
    .orderBy(desc(serviceRequestsTable.createdAt));
  // Closest requests first (GPS-first, falls back to city/state) — urgent requests are nudged ahead too
  const companyOrigin = company
    ? { lat: company.lat, lng: company.lng, city: company.city, state: company.state }
    : null;
  const sorted = companyOrigin
    ? [...rows].sort((a, b) => {
        const aProx = computeProximityScore(companyOrigin, { lat: a.lat, lng: a.lng, city: a.city, state: null });
        const bProx = computeProximityScore(companyOrigin, { lat: b.lat, lng: b.lng, city: b.city, state: null });
        const aScore = aProx.score + (a.urgency === "urgente" ? 0.1 : 0);
        const bScore = bProx.score + (b.urgency === "urgente" ? 0.1 : 0);
        return bScore - aScore;
      })
    : rows;
  const result = await Promise.all(sorted.map((r) => buildRequestWithProposals(r)));
  res.json(result);
});

router.get("/requests/:id", async (req, res): Promise<void> => {
  const p = GetServiceRequestParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const [row] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, p.data.id));
  if (!row) {
    res.status(404).json({ error: "Solicitação não encontrada." });
    return;
  }
  res.json(await buildRequestWithProposals(row));
});

// Company submits a proposal
router.post("/requests/:id/proposals", async (req, res): Promise<void> => {
  const p = CreateServiceProposalParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = CreateServiceProposalBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [request] = await db.select().from(serviceRequestsTable).where(eq(serviceRequestsTable.id, p.data.id));
  if (!request) {
    res.status(404).json({ error: "Solicitação não encontrada." });
    return;
  }
  if (request.status !== "aberta") {
    res.status(400).json({ error: "Essa solicitação já não está mais aberta para novas propostas." });
    return;
  }
  const [row] = await db
    .insert(serviceProposalsTable)
    .values({
      requestId: p.data.id,
      companyId: b.data.companyId,
      price: b.data.price ?? null,
      timeframe: b.data.timeframe ?? null,
      availability: b.data.availability ?? null,
      message: b.data.message,
    })
    .returning();
  await logEvent({ userId: b.data.companyId, eventType: "message", targetType: "request", targetId: request.id, metadata: { proposalId: row!.id } });
  await recomputeCompanyScore(b.data.companyId);
  const [serialized] = await serializeProposals([row!]);
  res.status(201).json(serialized);
});

// Customer accepts a proposal — unlocks chat and contact info for both sides
router.patch("/proposals/:id/accept", async (req, res): Promise<void> => {
  const p = AcceptServiceProposalParams.safeParse(req.params);
  if (!p.success) {
    res.status(400).json({ error: p.error.message });
    return;
  }
  const b = AcceptServiceProposalBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  const [proposal] = await db.select().from(serviceProposalsTable).where(eq(serviceProposalsTable.id, p.data.id));
  if (!proposal) {
    res.status(404).json({ error: "Proposta não encontrada." });
    return;
  }
  const [request] = await db
    .select()
    .from(serviceRequestsTable)
    .where(eq(serviceRequestsTable.id, proposal.requestId));
  if (!request) {
    res.status(404).json({ error: "Solicitação não encontrada." });
    return;
  }
  if (request.customerId !== b.data.customerId) {
    res.status(403).json({ error: "Você não tem permissão para aceitar essa proposta." });
    return;
  }
  if (request.status !== "aberta") {
    res.status(400).json({ error: "Essa solicitação já foi finalizada." });
    return;
  }

  await db.update(serviceProposalsTable).set({ status: "aceita" }).where(eq(serviceProposalsTable.id, proposal.id));
  await db
    .update(serviceProposalsTable)
    .set({ status: "recusada" })
    .where(
      and(eq(serviceProposalsTable.requestId, request.id), eq(serviceProposalsTable.status, "pendente")),
    );
  const [updatedRequest] = await db
    .update(serviceRequestsTable)
    .set({ status: "em_andamento", acceptedProposalId: proposal.id })
    .where(eq(serviceRequestsTable.id, request.id))
    .returning();

  const [existingConv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.buyerId, request.customerId),
        eq(conversationsTable.sellerId, proposal.companyId),
        eq(conversationsTable.itemId, 0),
      ),
    );
  if (!existingConv) {
    await db.insert(conversationsTable).values({ buyerId: request.customerId, sellerId: proposal.companyId, itemId: 0 });
  }

  await logEvent({ userId: b.data.customerId, eventType: "contact", targetType: "company", targetId: proposal.companyId, metadata: { requestId: request.id } });
  await recomputeCompanyScore(proposal.companyId);

  res.json(await buildRequestWithProposals(updatedRequest!));
});

export default router;
