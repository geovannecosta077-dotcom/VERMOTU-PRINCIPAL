/**
 * Vermotu Smart Ranking Engine
 * ============================
 *
 * Rule-based (no external AI call) algorithm that scores and orders items,
 * companies and service proposals so that customers see the most relevant,
 * trustworthy and available results first — in milliseconds.
 *
 * Design goals:
 *  - Modular: each signal (distance, rating, response time, etc.) is its own
 *    small pure function so factors can be tuned, tested or swapped later.
 *  - No single factor dominates: everything is combined as a weighted sum of
 *    0..1 normalized sub-scores (see WEIGHTS below).
 *  - Fast at read time: expensive aggregates (ratings, sales history,
 *    fulfillment/cancellation rate, response time) are precomputed into
 *    `ranking_scores` by `recomputeItemScore` / `recomputeCompanyScore` and
 *    only cheap, query-dependent factors (text relevance, distance) are
 *    computed live. This keeps list/search endpoints fast even with a very
 *    large catalog.
 *  - GPS-ready: `computeProximityScore` already prefers real lat/lng
 *    (haversine distance) and only falls back to city/state matching when
 *    coordinates are missing — no schema change needed once GPS is
 *    collected from more users/listings.
 *  - Learns over time: every click, view, favorite, contact, search,
 *    request and purchase is logged to the `events` table (see
 *    `logEvent`). Those signals feed back into the precomputed scores
 *    (conversion rate, popularity) so recommendations keep improving
 *    without needing a separate ML pipeline up front. The scoring formulas
 *    here are intentionally isolated behind small functions so a future
 *    learned model (e.g. a logistic/gradient-boosted re-ranker) can replace
 *    or blend with them without touching the call sites.
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  eventsTable,
  itemsTable,
  ordersTable,
  orderItemsTable,
  rankingScoresTable,
  reviewsTable,
  serviceProposalsTable,
  serviceRequestsTable,
  usersTable,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  state?: string | null;
}

export interface ProximityResult {
  score: number; // 0..1, 1 = right here, 0 = far away / unknown
  distanceKm: number | null;
  method: "gps" | "city" | "state" | "unknown";
}

export interface ScoreBreakdown {
  [factor: string]: number;
}

// ---------------------------------------------------------------------------
// Weights — tune here without touching the scoring logic itself.
// Every group sums to 1 so the composite score stays in the 0..1 range.
// ---------------------------------------------------------------------------

/** Weights for precomputed item "quality" base score. */
export const ITEM_BASE_WEIGHTS = {
  rating: 0.28,
  reviewVolume: 0.12,
  listingQuality: 0.18,
  stockAvailability: 0.1,
  salesHistory: 0.14,
  freshness: 0.08,
  planBoost: 0.05,
  engagement: 0.05,
} as const;

/** Weights for precomputed company "quality/reputation" base score. */
export const COMPANY_BASE_WEIGHTS = {
  rating: 0.22,
  reviewVolume: 0.1,
  responseTime: 0.16,
  fulfillmentRate: 0.16,
  lowCancellation: 0.12,
  salesHistory: 0.12,
  planBoost: 0.05,
  profileCompleteness: 0.07,
} as const;

/** Weights for the final, query-time composite score shown to users. */
export const QUERY_TIME_WEIGHTS = {
  relevance: 0.35,
  base: 0.4,
  proximity: 0.25,
} as const;

// ---------------------------------------------------------------------------
// Distance / proximity — GPS first, city/state fallback (no rearchitecture
// needed later: once lat/lng is populated for a user or listing, this
// function automatically switches from city/state guessing to real distance).
// ---------------------------------------------------------------------------

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function computeProximityScore(origin: GeoPoint, target: GeoPoint): ProximityResult {
  if (origin.lat != null && origin.lng != null && target.lat != null && target.lng != null) {
    const distanceKm = haversineKm(
      { lat: origin.lat, lng: origin.lng },
      { lat: target.lat, lng: target.lng },
    );
    // Exponential decay: ~0km -> 1, ~30km -> 0.4, ~100km -> 0.05
    const score = Math.exp(-distanceKm / 28);
    return { score: Math.max(0, Math.min(1, score)), distanceKm, method: "gps" };
  }
  const originCity = origin.city?.trim().toLowerCase();
  const targetCity = target.city?.trim().toLowerCase();
  if (originCity && targetCity && originCity === targetCity) {
    return { score: 0.75, distanceKm: null, method: "city" };
  }
  const originState = origin.state?.trim().toLowerCase();
  const targetState = target.state?.trim().toLowerCase();
  if (originState && targetState && originState === targetState) {
    return { score: 0.4, distanceKm: null, method: "state" };
  }
  return { score: 0.15, distanceKm: null, method: "unknown" };
}

// ---------------------------------------------------------------------------
// Text relevance — lightweight token-overlap match against a free-text query.
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function textRelevanceScore(query: string | null | undefined, fields: Array<string | null | undefined>): number {
  if (!query || !query.trim()) return 0.5; // no query -> neutral relevance
  const tokens = normalize(query).split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return 0.5;
  const haystack = normalize(fields.filter(Boolean).join(" "));
  let hits = 0;
  for (const t of tokens) if (haystack.includes(t)) hits += 1;
  return Math.min(1, hits / tokens.length);
}

// ---------------------------------------------------------------------------
// Listing / profile quality — rewards complete, well-described, photographed
// listings and profiles over sparse ones.
// ---------------------------------------------------------------------------

export function listingQualityScore(item: {
  image?: string | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  location?: string | null;
}): number {
  let points = 0;
  const total = 5;
  if (item.image && item.image.trim().length > 0) points += 1;
  if (item.description && item.description.trim().length >= 40) points += 1;
  if (item.brand) points += 1;
  if (item.model || item.year) points += 1;
  if (item.location && item.location.trim().length > 0) points += 1;
  return points / total;
}

export function profileCompletenessScore(company: {
  storeName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  phone?: string | null;
}): number {
  let points = 0;
  const total = 5;
  if (company.storeName && company.storeName.trim().length > 0) points += 1;
  if (company.bio && company.bio.trim().length >= 20) points += 1;
  if (company.avatarUrl) points += 1;
  if (company.city && company.city.trim().length > 0) points += 1;
  if (company.phone) points += 1;
  return points / total;
}

// ---------------------------------------------------------------------------
// Plan boost — a small nudge for paid plans, capped so it never overrides
// genuine quality/relevance signals.
// ---------------------------------------------------------------------------

export function planBoostScore(plan: string | null | undefined): number {
  if (plan === "premium") return 1;
  if (plan === "pro") return 0.55;
  return 0;
}

// ---------------------------------------------------------------------------
// Recency / freshness — newer listings get a mild boost that decays over ~60 days.
// ---------------------------------------------------------------------------

export function freshnessScore(createdAt: Date): number {
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.exp(-ageDays / 60));
}

// ---------------------------------------------------------------------------
// Event logging — the "learning" substrate. Every interaction is cheap to
// write and is later aggregated by the recompute functions below.
// ---------------------------------------------------------------------------

export type EventType =
  | "view"
  | "click"
  | "search"
  | "favorite"
  | "unfavorite"
  | "share"
  | "contact"
  | "message"
  | "request_created"
  | "purchase"
  | "review";

export type EventTargetType = "item" | "company" | "request";

export async function logEvent(input: {
  userId?: number | null;
  sessionId?: string | null;
  eventType: EventType;
  targetType: EventTargetType;
  targetId?: number | null;
  query?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(eventsTable).values({
    userId: input.userId ?? null,
    sessionId: input.sessionId ?? null,
    eventType: input.eventType,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    query: input.query ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

/** Aggregated engagement signal (0..1) for an item from recent events: views/clicks/favorites vs. conversions. */
async function computeItemEngagementScore(itemId: number): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ eventType: eventsTable.eventType, count: sql<number>`COUNT(*)::int` })
    .from(eventsTable)
    .where(and(eq(eventsTable.targetType, "item"), eq(eventsTable.targetId, itemId), gte(eventsTable.createdAt, since)))
    .groupBy(eventsTable.eventType);
  const counts = Object.fromEntries(rows.map((r) => [r.eventType, r.count]));
  const views = counts.view ?? 0;
  const clicks = counts.click ?? 0;
  const favorites = counts.favorite ?? 0;
  const contacts = counts.contact ?? 0;
  const purchases = counts.purchase ?? 0;
  const engagement = clicks * 1 + favorites * 2 + contacts * 3 + purchases * 5;
  // Diminishing returns via log scale, capped at 1
  return Math.min(1, Math.log10(1 + engagement) / 2.5) * (views > 0 || engagement > 0 ? 1 : 0.5);
}

// ---------------------------------------------------------------------------
// Item base score (precomputed, stored in ranking_scores)
// ---------------------------------------------------------------------------

export async function recomputeItemScore(itemId: number): Promise<{ score: number; breakdown: ScoreBreakdown } | null> {
  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, itemId));
  if (!item) return null;

  const [salesAgg] = await db
    .select({ qty: sql<number>`COALESCE(SUM(${orderItemsTable.qty}), 0)::int` })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(and(eq(orderItemsTable.itemId, itemId), inArray(ordersTable.status, ["paid", "shipped", "delivered"])));

  const ratingScore = item.ratingAvg > 0 ? item.ratingAvg / 5 : 0.5; // neutral prior for unrated items
  const reviewVolumeScore = Math.min(1, Math.log10(1 + item.ratingCount) / 1.5);
  const listingScore = listingQualityScore(item);
  const stockScore = item.stock > 0 ? Math.min(1, 0.6 + Math.min(item.stock, 10) / 25) : 0;
  const salesScore = Math.min(1, Math.log10(1 + (salesAgg?.qty ?? 0)) / 1.7);
  const fresh = freshnessScore(item.createdAt);
  const engagement = await computeItemEngagementScore(itemId);

  let planScore = 0;
  if (item.sellerId) {
    const [seller] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, item.sellerId));
    planScore = planBoostScore(seller?.plan);
  }

  const breakdown: ScoreBreakdown = {
    rating: ratingScore,
    reviewVolume: reviewVolumeScore,
    listingQuality: listingScore,
    stockAvailability: stockScore,
    salesHistory: salesScore,
    freshness: fresh,
    planBoost: planScore,
    engagement,
  };
  const score =
    breakdown.rating * ITEM_BASE_WEIGHTS.rating +
    breakdown.reviewVolume * ITEM_BASE_WEIGHTS.reviewVolume +
    breakdown.listingQuality * ITEM_BASE_WEIGHTS.listingQuality +
    breakdown.stockAvailability * ITEM_BASE_WEIGHTS.stockAvailability +
    breakdown.salesHistory * ITEM_BASE_WEIGHTS.salesHistory +
    breakdown.freshness * ITEM_BASE_WEIGHTS.freshness +
    breakdown.planBoost * ITEM_BASE_WEIGHTS.planBoost +
    breakdown.engagement * ITEM_BASE_WEIGHTS.engagement;

  await upsertScore("item", itemId, score, breakdown);
  return { score, breakdown };
}

// ---------------------------------------------------------------------------
// Company base score (precomputed, stored in ranking_scores)
// ---------------------------------------------------------------------------

export async function recomputeCompanyScore(userId: number): Promise<{ score: number; breakdown: ScoreBreakdown } | null> {
  const [company] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!company) return null;

  const [ratingAgg] = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${reviewsTable.rating}), 0)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reviewsTable)
    .innerJoin(itemsTable, eq(itemsTable.id, reviewsTable.itemId))
    .where(eq(itemsTable.sellerId, userId));

  const proposals = await db
    .select({
      status: serviceProposalsTable.status,
      createdAt: serviceProposalsTable.createdAt,
      requestCreatedAt: serviceRequestsTable.createdAt,
    })
    .from(serviceProposalsTable)
    .innerJoin(serviceRequestsTable, eq(serviceRequestsTable.id, serviceProposalsTable.requestId))
    .where(eq(serviceProposalsTable.companyId, userId));

  const responseTimesMs = proposals.map((p) => p.createdAt.getTime() - p.requestCreatedAt.getTime()).filter((ms) => ms >= 0);
  const avgResponseMinutes = responseTimesMs.length
    ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length / 60000
    : null;
  // Faster is better: <15min -> ~1, 2h -> ~0.5, 12h+ -> near 0
  const responseTimeScore = avgResponseMinutes == null ? 0.5 : Math.max(0, Math.exp(-avgResponseMinutes / 90));

  const acceptedCount = proposals.filter((p) => p.status === "aceita").length;
  const fulfillmentRate = proposals.length > 0 ? acceptedCount / proposals.length : 0.5;

  const [orderAgg] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${ordersTable.status} = 'cancelled')::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${ordersTable.status} IN ('paid','shipped','delivered'))::int`,
    })
    .from(ordersTable)
    .where(eq(ordersTable.sellerId, userId));

  const cancellationRate = orderAgg.total > 0 ? orderAgg.cancelled / orderAgg.total : 0;
  const lowCancellationScore = 1 - Math.min(1, cancellationRate * 2);
  const salesScore = Math.min(1, Math.log10(1 + (orderAgg.completed ?? 0)) / 1.7);
  const planScore = planBoostScore(company.plan);
  const profileScore = profileCompletenessScore(company);
  const ratingScore = ratingAgg.avg > 0 ? ratingAgg.avg / 5 : 0.5;
  const reviewVolumeScore = Math.min(1, Math.log10(1 + ratingAgg.count) / 1.5);

  const breakdown: ScoreBreakdown = {
    rating: ratingScore,
    reviewVolume: reviewVolumeScore,
    responseTime: responseTimeScore,
    fulfillmentRate,
    lowCancellation: lowCancellationScore,
    salesHistory: salesScore,
    planBoost: planScore,
    profileCompleteness: profileScore,
  };
  const score =
    breakdown.rating * COMPANY_BASE_WEIGHTS.rating +
    breakdown.reviewVolume * COMPANY_BASE_WEIGHTS.reviewVolume +
    breakdown.responseTime * COMPANY_BASE_WEIGHTS.responseTime +
    breakdown.fulfillmentRate * COMPANY_BASE_WEIGHTS.fulfillmentRate +
    breakdown.lowCancellation * COMPANY_BASE_WEIGHTS.lowCancellation +
    breakdown.salesHistory * COMPANY_BASE_WEIGHTS.salesHistory +
    breakdown.planBoost * COMPANY_BASE_WEIGHTS.planBoost +
    breakdown.profileCompleteness * COMPANY_BASE_WEIGHTS.profileCompleteness;

  await upsertScore("company", userId, score, breakdown);
  return { score, breakdown };
}

async function upsertScore(targetType: "item" | "company", targetId: number, score: number, breakdown: ScoreBreakdown): Promise<void> {
  await db
    .insert(rankingScoresTable)
    .values({ targetType, targetId, score, breakdown: JSON.stringify(breakdown), computedAt: new Date() })
    .onConflictDoUpdate({
      target: [rankingScoresTable.targetType, rankingScoresTable.targetId],
      set: { score, breakdown: JSON.stringify(breakdown), computedAt: new Date() },
    });
}

export async function getScore(targetType: "item" | "company", targetId: number): Promise<number | null> {
  const [row] = await db
    .select({ score: rankingScoresTable.score })
    .from(rankingScoresTable)
    .where(and(eq(rankingScoresTable.targetType, targetType), eq(rankingScoresTable.targetId, targetId)));
  return row?.score ?? null;
}

export async function getScoresMap(targetType: "item" | "company", targetIds: number[]): Promise<Map<number, number>> {
  if (targetIds.length === 0) return new Map();
  const rows = await db
    .select({ targetId: rankingScoresTable.targetId, score: rankingScoresTable.score })
    .from(rankingScoresTable)
    .where(and(eq(rankingScoresTable.targetType, targetType), inArray(rankingScoresTable.targetId, targetIds)));
  return new Map(rows.map((r) => [r.targetId, r.score]));
}

/** Recomputes every item and company score. Cheap enough to run on a schedule; also callable on-demand from the admin panel. */
export async function recomputeAllScores(): Promise<{ items: number; companies: number }> {
  const items = await db.select({ id: itemsTable.id }).from(itemsTable);
  for (const it of items) await recomputeItemScore(it.id);
  const companies = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`${usersTable.accountType} = 'empresa' OR ${usersTable.storeName} <> ''`);
  for (const c of companies) await recomputeCompanyScore(c.id);
  return { items: items.length, companies: companies.length };
}

// ---------------------------------------------------------------------------
// Query-time composite scoring — combines the precomputed base score with
// live, query-dependent factors (text relevance + proximity to the buyer).
// ---------------------------------------------------------------------------

export interface RankedResult<T> {
  entity: T;
  score: number;
  breakdown: ScoreBreakdown;
}

export function combineQueryTimeScore(params: {
  baseScore: number;
  relevance: number;
  proximity: number;
}): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    base: params.baseScore,
    relevance: params.relevance,
    proximity: params.proximity,
  };
  const score =
    breakdown.base * QUERY_TIME_WEIGHTS.base +
    breakdown.relevance * QUERY_TIME_WEIGHTS.relevance +
    breakdown.proximity * QUERY_TIME_WEIGHTS.proximity;
  return { score, breakdown };
}

/**
 * Simple personalization signal: given a user's recent events + favorites,
 * returns the categories/brands they engage with most, used to bias
 * recommendations when they haven't typed a search query.
 */
export async function getUserAffinity(userId: number): Promise<{ categories: string[]; brands: string[] }> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const events = await db
    .select({ targetId: eventsTable.targetId })
    .from(eventsTable)
    .where(and(eq(eventsTable.userId, userId), eq(eventsTable.targetType, "item"), gte(eventsTable.createdAt, since)))
    .orderBy(desc(eventsTable.createdAt))
    .limit(200);
  const itemIds = Array.from(new Set(events.map((e) => e.targetId).filter((id): id is number => id != null)));
  if (itemIds.length === 0) return { categories: [], brands: [] };
  const items = await db.select({ category: itemsTable.category, brand: itemsTable.brand }).from(itemsTable).where(inArray(itemsTable.id, itemIds));
  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  for (const it of items) {
    categoryCounts.set(it.category, (categoryCounts.get(it.category) ?? 0) + 1);
    if (it.brand) brandCounts.set(it.brand, (brandCounts.get(it.brand) ?? 0) + 1);
  }
  const topN = (m: Map<string, number>, n: number) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  return { categories: topN(categoryCounts, 3), brands: topN(brandCounts, 3) };
}
