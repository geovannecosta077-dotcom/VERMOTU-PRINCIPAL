# Vermotu

Marketplace brasileiro de motos, peças e serviços de oficina.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + Tailwind v4 + shadcn/ui |
| API | Node.js 24 + Express 5 |
| Banco | PostgreSQL + Drizzle ORM |
| Pagamentos | Stripe (assinaturas + checkout) |
| Storage | S3-compatível (AWS S3, Cloudflare R2, MinIO…) |
| Monorepo | pnpm workspaces |

---

## Requisitos

- **Node.js** ≥ 20
- **pnpm** ≥ 9 → `npm install -g pnpm`
- **PostgreSQL** ≥ 14
- Conta em um serviço S3-compatível (veja opções em `.env.example`)
- Conta Stripe (modo teste funciona sem custo)

---

## Instalação local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/vermotu.git
cd vermotu

# 2. Instale as dependências (pnpm é necessário por causa dos workspaces)
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com seus valores reais (banco, Stripe, S3…)

# 4. Aplique o schema no banco de dados
pnpm db:push

# 5. Gere os tipos da API (necessário após mudanças no openapi.yaml)
pnpm codegen
```

---

## Rodar em desenvolvimento

Abra dois terminais (ou use `&` para rodar em paralelo):

```bash
# Terminal 1 — API (porta 8080 por padrão)
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (porta 5173 por padrão)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/motohub run dev
```

Acesse: `http://localhost:5173`

A API estará disponível em `http://localhost:8080/api`.

> **Configuração do proxy**: em produção, coloque um reverse proxy (Nginx, Caddy, etc.)
> apontando `/api` para a porta 8080 e `/` para a porta 5173 (ou os estáticos do build).

---

## Build de produção

```bash
pnpm build
```

Saídas:
- **Frontend**: `artifacts/motohub/dist/public/` (estáticos prontos para Vercel/CDN)
- **API**: `artifacts/api-server/dist/index.mjs` (executável Node.js)

---

## Deploy na Vercel

### Frontend (estático)

A Vercel detecta automaticamente pnpm e configura o build.

1. Importe o repositório na Vercel
2. Em **Settings → Build & Development**:
   - **Root Directory**: `artifacts/motohub`
   - **Build Command**: `cd ../.. && pnpm build` *(ou deixe a Vercel detectar)*
   - **Output Directory**: `dist/public`
   - **Install Command**: `cd ../.. && pnpm install`
3. Adicione as variáveis de ambiente (`VITE_*` se necessário)
4. Configure o rewrite SPA em `vercel.json`:

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

### API (servidor)

A Vercel suporta servidores Node.js via **"Other" framework preset**:

1. Crie um projeto separado na Vercel apontando para `artifacts/api-server`
2. **Build Command**: `cd ../.. && pnpm --filter @workspace/api-server run build`
3. **Output Directory**: `dist`
4. **Start Command**: `node dist/index.mjs`
5. Adicione todas as variáveis de ambiente do `.env.example`

> **Alternativa recomendada para a API**: use plataformas pensadas para servidores
> persistentes como **Railway**, **Render**, **Fly.io** ou **AWS ECS**. A Vercel é
> otimizada para funções serverless; um servidor Express long-running funciona, mas
> tem limitações de timeout.

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa com descrições.

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | Connection string do PostgreSQL |
| `SESSION_SECRET` | ✅ | Segredo para assinar sessões |
| `STRIPE_SECRET_KEY` | ✅ | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Segredo do webhook do Stripe |
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave Supabase para validar a configuração |
| `SUPABASE_S3_ENDPOINT` | ✅ | Endpoint S3 do Supabase Storage |
| `SUPABASE_S3_REGION` | ✅ | Região do projeto Supabase |
| `SUPABASE_S3_ACCESS_KEY_ID` | ✅ | Access key S3 do Supabase Storage |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | ✅ | Secret key S3 do Supabase Storage |
| `PORT` | ❌ | Porta da API (padrão: `8080`) |

---

## Supabase Storage

As fotos são enviadas diretamente ao bucket `vermotu-uploads` do Supabase
Storage por meio de URLs pré-assinadas S3. Gere as credenciais em
**Storage → S3 → S3 access keys** no projeto Supabase correto e configure:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=<project-region>
SUPABASE_S3_ACCESS_KEY_ID=<access-key-id>
SUPABASE_S3_SECRET_ACCESS_KEY=<secret-access-key>
```

---

## Configurar Stripe

1. Crie uma conta em [stripe.com](https://stripe.com)
2. Vá em **Developers → API keys** e copie a chave de teste (`sk_test_...`)
3. Para webhooks locais, use o [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe login
stripe listen --forward-to localhost:8080/api/subscriptions/webhook
# Copie o webhook secret exibido para STRIPE_WEBHOOK_SECRET no .env
```

4. Para os planos (opcional), crie preços no painel do Stripe e adicione os IDs em:
   - `STRIPE_PRICE_ID_PRO` (plano Básico — R$ 49/mês)
   - `STRIPE_PRICE_ID_PREMIUM` (plano Premium — R$ 99/mês)

> Se os price IDs não forem definidos, o Stripe cria preços inline automaticamente.

---

## Banco de dados

```bash
# Aplicar schema (desenvolvimento)
pnpm db:push

# Para produção, use migrações Drizzle:
pnpm --filter @workspace/db run generate  # gera arquivos de migração
pnpm --filter @workspace/db run migrate   # aplica no banco
```

---

## Enviar para o GitHub

```bash
git init  # se ainda não for um repositório git
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/seu-usuario/vermotu.git
git push -u origin main
```

> O `.gitignore` já exclui `.env`, `node_modules`, `dist` e arquivos do Replit.

---

## Estrutura do projeto

```
vermotu/
├── artifacts/
│   ├── api-server/          # Backend Express (porta 8080)
│   │   └── src/
│   │       ├── routes/      # Rotas da API
│   │       └── lib/         # Stripe, S3, logger…
│   └── motohub/             # Frontend React + Vite
│       └── src/
│           ├── pages/       # Páginas (wouter)
│           └── components/  # Componentes UI
├── lib/
│   ├── db/                  # Schema Drizzle + conexão
│   ├── api-spec/            # OpenAPI spec + codegen
│   ├── api-client-react/    # Hooks React Query gerados
│   ├── api-zod/             # Schemas Zod gerados
│   └── object-storage-web/  # Upload client (presigned URLs)
├── .env.example             # Template de variáveis
├── README.md                # Este arquivo
└── pnpm-workspace.yaml      # Configuração do monorepo
```

---

## Licença

MIT
