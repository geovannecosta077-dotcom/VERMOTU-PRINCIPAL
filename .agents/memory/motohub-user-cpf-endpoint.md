---
name: MotoHub user CPF field
description: How to set a user's CPF in MotoHub's API — relevant when testing item creation flows.
---

Setting `cpf` via `PATCH /users/:id` (the generic `updateUser` route) fails with `Error: No values to set` — that route's schema doesn't accept `cpf` as an updatable field, so the drizzle `.set()` call ends up empty.

**How to apply:** use the dedicated `PATCH /users/:id/cpf` endpoint instead. It also validates the CPF checksum, so use a real valid test CPF (e.g. `52998224725`), not an arbitrary digit string — invalid checksums are rejected with 400.

This matters because item creation (`POST /items`) requires the seller to have a valid CPF on file (`"Cadastre seu CPF antes de publicar um anúncio."`), so any test data setup that creates items needs this two-step user setup first.
