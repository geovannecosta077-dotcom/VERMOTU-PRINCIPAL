import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  itemsTable,
  usersTable,
  searchHistoryTable,
  favoritesTable,
} from "@workspace/db";
import {
  TrackEventBody,
  SmartSearchQueryParams,
  GetRecommendationsQueryParams,
  RecomputeRankingBody,
} from "@workspace/api-zod";
import {
  logEvent,
  computeProximityScore,
  textRelevanceScore,
  combineQueryTimeScore,
  getScoresMap,
  recomputeAllScores,
  recomputeItemScore,
  recomputeCompanyScore,
  getUserAffinity,
  type EventType,
  type EventTargetType,
} from "../lib/ranking.js";
import { parseNaturalQuery } from "../lib/searchParser.js";

const router: IRouter = Router();

// Log a learning signal (click, view, favorite, contact, search, purchase, etc.)
router.post("/events", async (req, res): Promise<void> => {
  const b = TrackEventBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  await logEvent({
    userId: b.data.userId ?? null,
    sessionId: b.data.sessionId ?? null,
    eventType: b.data.eventType as EventType,
    targetType: b.data.targetType as EventTargetType,
    targetId: b.data.targetId ?? null,
    query: b.data.query ?? null,
    metadata: b.data.metadata ?? null,
  });
  res.status(201).json({ ok: true });
});

// Uber-style smart search: natural language + composite ranking (relevance + quality + proximity)
router.get("/search/results", async (req, res): Promise<void> => {
  const q = SmartSearchQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { query, type, category, city, state, lat, lng, userId, sessionId, limit } = q.data;
  const parsed = query ? parseNaturalQuery(query, city ?? null) : null;

  const filters = [eq(itemsTable.status, "active")];
  if (type) filters.push(eq(itemsTable.type, type));
  if (category || parsed?.category) filters.push(eq(itemsTable.category, category ?? (parsed!.category as string)));
  const brandFilter = parsed?.brand ?? undefined;

  const items = await db
    .select()
    .from(itemsTable)
    .where(and(...filters))
    .orderBy(desc(itemsTable.createdAt))
    .limit(500); // candidate pool; ranking narrows this down below

  const candidates = brandFilter
    ? items.filter((i) => i.brand && i.brand.toLowerCase() === brandFilter.toLowerCase())
    : items;

  const sellerIds = Array.from(new Set(candidates.map((i) => i.sellerId)));
  const sellers = sellerIds.length ? await db.select().from(usersTable).where(inArray(usersTable.id, sellerIds)) : [];
  const sellerById = new Map(sellers.map((s) => [s.id, s]));
  const scoreMap = await getScoresMap("item", candidates.map((i) => i.id));

  const origin = { lat: lat ?? null, lng: lng ?? null, city: city ?? null, state: state ?? null };
  const ranked = candidates.map((item) => {
    const seller = sellerById.get(item.sellerId);
    const proximity = computeProximityScore(origin, {
      lat: item.lat,
      lng: item.lng,
      city: item.location,
      state: item.state,
    });
    const relevance = textRelevanceScore(query, [
      item.title,
      item.brand,
      item.model,
      item.description,
      item.year ? String(item.year) : null,
      seller?.storeName,
    ]);
    const baseScore = scoreMap.get(item.id) ?? 0.5;
    const { score, breakdown } = combineQueryTimeScore({ baseScore, relevance, proximity: proximity.score });
    return { item, score, breakdown: { ...breakdown, proximityMethod: proximity.method, distanceKm: proximity.distanceKm ?? -1 } };
  });
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, limit ?? 40);

  if (query) {
    await db.insert(searchHistoryTable).values({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      rawQuery: query,
      category: parsed?.category ?? category ?? null,
      brand: parsed?.brand ?? null,
      model: parsed?.model ?? null,
      city: city ?? null,
      state: state ?? null,
      urgency: parsed?.urgency ?? null,
      resultsCount: top.length,
    });
  }

  res.json({
    parsed,
    results: top.map((r) => ({
      ...r.item,
      createdAt: r.item.createdAt.toISOString(),
      matchScore: Math.round(r.score * 100) / 100,
      scoreBreakdown: r.breakdown,
    })),
  });
});

// Personalized recommendations based on the user's own click/search/favorite/purchase history.
// Falls back to the globally best-scored items for logged-out users (cold start).
router.get("/recommendations", async (req, res): Promise<void> => {
  const q = GetRecommendationsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const limit = q.data.limit ?? 12;
  let candidateFilters = [eq(itemsTable.status, "active")];

  if (q.data.userId) {
    const affinity = await getUserAffinity(q.data.userId);
    const favRows = await db.select({ itemId: favoritesTable.itemId }).from(favoritesTable).where(eq(favoritesTable.userId, q.data.userId));
    const favIds = new Set(favRows.map((f) => f.itemId));
    if (affinity.categories.length > 0) {
      candidateFilters = [eq(itemsTable.status, "active"), inArray(itemsTable.category, affinity.categories)];
    }
    const items = await db.select().from(itemsTable).where(and(...candidateFilters)).limit(200);
    const scoreMap = await getScoresMap("item", items.map((i) => i.id));
    const ranked = items
      .filter((i) => !favIds.has(i.id))
      .map((item) => {
        const base = scoreMap.get(item.id) ?? 0.5;
        const brandBoost = affinity.brands.includes(item.brand ?? "") ? 0.15 : 0;
        return { item, score: Math.min(1, base + brandBoost) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    res.json(ranked.map((r) => ({ ...r.item, createdAt: r.item.createdAt.toISOString(), matchScore: Math.round(r.score * 100) / 100 })));
    return;
  }

  const items = await db.select().from(itemsTable).where(and(...candidateFilters)).limit(200);
  const scoreMap = await getScoresMap("item", items.map((i) => i.id));
  const ranked = items
    .map((item) => ({ item, score: scoreMap.get(item.id) ?? 0.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  res.json(ranked.map((r) => ({ ...r.item, createdAt: r.item.createdAt.toISOString(), matchScore: Math.round(r.score * 100) / 100 })));
});

// Manually trigger a recompute (single target or the whole catalog). Cheap enough to also run on a schedule.
router.post("/ranking/recompute", async (req, res): Promise<void> => {
  const b = RecomputeRankingBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: b.error.message });
    return;
  }
  if (b.data.targetType === "item" && b.data.targetId) {
    const result = await recomputeItemScore(b.data.targetId);
    res.json(result ?? { error: "not found" });
    return;
  }
  if (b.data.targetType === "company" && b.data.targetId) {
    const result = await recomputeCompanyScore(b.data.targetId);
    res.json(result ?? { error: "not found" });
    return;
  }
  const summary = await recomputeAllScores();
  res.json(summary);
});

export default router;
