---
name: Vermotu "Busca Inteligente" matching engine already exists
description: Points to the existing intelligent search/matching implementation so it isn't accidentally reimplemented from scratch.
---

The "Motor de Matching Inteligente" for Vermotu is already implemented (built before 2026-07-08), not a placeholder:

- `artifacts/motohub/src/pages/busca.tsx` — natural-language service/purchase request UI ("Uber para motos"), shows live proposals.
- `artifacts/api-server/src/lib/searchParser.ts` — local NLP-ish parser (no external AI call) extracting category/brand/model/urgency from free text.
- `artifacts/api-server/src/lib/ranking.ts` — composite scoring: keyword relevance + precomputed base score (reviews/sales/response time/freshness) + geo proximity via Haversine with city/state fallback.
- `artifacts/api-server/src/routes/search.ts` — service_requests / service_proposals lifecycle (broadcast to nearby companies, accept unlocks chat/contact info).
- `artifacts/api-server/src/routes/ranking.ts` — `/search/results` and `/recommendations` endpoints; recommendations use logged user events (`events` table) for affinity scoring.
- DB tables: `service_requests`, `service_proposals`, `ranking_scores`, `events` in `lib/db/src/schema/index.ts`.

**Why:** A prior session/task agent built this fully; without this pointer a future session might assume it needs to be built from zero and duplicate work or diverge from the existing design.

**How to apply:** Before starting any "matching"/"busca inteligente"/recommendation work on Vermotu, read these files first to extend rather than replace them.
