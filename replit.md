# MotoHub

Marketplace brasileiro (em português) de motos, peças e serviços de oficina — usuários compram/vendem motos e peças, encontram oficinas, leem o blog e anunciam seus produtos.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — roda o servidor da API (porta interna 8080, acessível via proxy em `/api`)
- `pnpm --filter @workspace/motohub run dev` — roda o frontend (Vite)
- `pnpm run typecheck` — typecheck completo de todos os pacotes
- `pnpm run build` — typecheck + build de todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenera hooks de API e schemas Zod a partir do OpenAPI spec
- `pnpm --filter @workspace/db run push` — aplica alterações do schema no banco (apenas dev)
- Env obrigatório: `DATABASE_URL` (Postgres), `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` (Object Storage)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (router), Tailwind v4, shadcn/ui, framer-motion, zustand (estado/sessão/carrinho)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (schema em arquivo único)
- Storage: Replit Object Storage (uploads via Uppy + presigned URLs)
- Validação: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (a partir do OpenAPI spec)

## Where things live

- `artifacts/motohub/src` — frontend (páginas em `src/pages`, componentes em `src/components`, estado em `src/lib/session.ts`)
- `artifacts/api-server/src/routes` — rotas da API (admin, banners, blog, coupons, email, items, orders, reviews, social, storage, subscriptions, users)
- `lib/db/src/schema/index.ts` — schema Drizzle único (users, items, orders/order_items, conversations/messages, subscriptions, admin_logs, reports, blog_posts, banners, email_campaigns)
- `lib/api-spec/openapi.yaml` — contrato da API (fonte da verdade)
- `lib/object-storage-web` — cliente Uppy/upload compartilhado usado pelo frontend

## Architecture decisions

- Autenticação é customizada (bcrypt + zustand), não usa Replit Auth nem Clerk.
- Acesso de admin é liberado por senha (passcodes) em vez de um sistema de roles completo.
- Não há Stripe nem provedor de e-mail externo configurado — esses fluxos são simulados/manuais no código original.

## Product

- Marketplace de motos, peças e oficinas com anúncios, carrinho, checkout, pedidos, chat entre comprador/vendedor, avaliações, cupons, assinaturas/planos premium, blog e painel admin.

## User preferences

- Projeto migrado de um zip existente: preservar 100% da aparência, layout, componentes, cores, páginas, navegação e funcionalidade originais. Não redesenhar, não trocar bibliotecas, não fazer refatorações visuais.
- Qualquer nova funcionalidade só deve ser adicionada mediante pedido explícito do usuário.
- Sempre perguntar antes de alterar banco de dados, variáveis de ambiente ou contratos de API.
- Usuário se comunica em português — manter respostas em português.

## Gotchas

- Sempre reiniciar o workflow do `api-server` depois de editar `src/app.ts` ou qualquer rota — o build é feito via esbuild e só é refeito no restart, então mudanças não pegam automaticamente como no Vite.
- O banco e o object storage usam os recursos nativos do Replit (não Supabase/GCS direto).

## Pointers

- Veja a skill `pnpm-workspace` para estrutura do workspace, configuração de TypeScript e detalhes de pacotes.
