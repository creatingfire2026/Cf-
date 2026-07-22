# creatingfire.org — Automated Business Platform

A self-owned **workflow engine + monetization layer** deployed on Cloudflare Workers at `creatingfire.org`.  
No third-party restrictions. Your logic, your infrastructure, your revenue.

## Architecture

| Layer | Cloudflare Resource | Purpose |
|---|---|---|
| Router | **Workers** | HTTP API, auth, billing, routing |
| State | **Durable Objects** | Per-job stateful execution |
| Async | **Queues** | Decoupled job processing |
| Config | **KV** | Workflow registry, customer data, usage counters |
| Assets | **R2** | AI outputs, content, materials |
| UI | **Pages** (`/dashboard`) | Landing page + control dashboard |
| Schedule | **Cron Triggers** | Hourly billing report + heartbeat |

## Domains

- `ai` — generation, analysis, publish to R2 (calls AI gateway)
- `marketing` — campaigns, content, tracking
- `education` — materials, enroll, progress
- `webhook` — inbound event intake (Stripe + generic)
- `billing` — customer provisioning, usage reporting
- `system` — health-checks, cron jobs

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Service info + plan limits |
| GET | `/health` | Public | Health check |
| POST | `/signup` | Public | Create Stripe Checkout Session |
| GET | `/signup/success` | Public | Retrieve API key after payment |
| POST | `/webhook` | Stripe HMAC | Inbound webhook (Stripe + generic) |
| GET | `/me` | Customer key | Profile + monthly usage |
| POST | `/workflow` | Customer/Admin | Submit a workflow job |
| GET | `/workflow/:id` | Customer/Admin | Get job status |
| GET | `/workflows` | Customer/Admin | List KV workflow keys |
| GET | `/config/:key` | Customer/Admin | Read config value |
| POST | `/config/:key` | Admin only | Write config value |
| POST | `/cron` | Admin only | Trigger cron manually |

### Submit an AI generation job

```bash
curl -X POST https://creatingfire.org/workflow \
  -H "Authorization: ******" \
  -H "Content-Type: application/json" \
  -d '{"domain":"ai","action":"generate","payload":{"prompt":"Write a product description for X"}}'
```

## Plans

| Plan | Price | Jobs/month |
|---|---|---|
| Free | $0 | 100 |
| Starter | $9/mo | 1,000 |
| Pro | $49/mo | 10,000 |

Customers sign up at `creatingfire.org/#pricing` → pay via Stripe → receive an API key automatically.

## Setup

```bash
# 1. Infrastructure
wrangler login
wrangler kv namespace create CF_KV
# Update wrangler.toml with the KV namespace IDs printed above

wrangler queues create cf-workflow-queue
wrangler r2 bucket create cf-assets

# 2. Secrets
wrangler secret put API_SECRET            # Admin/operator bearer token
wrangler secret put STRIPE_SECRET_KEY     # sk_live_...
wrangler secret put STRIPE_WEBHOOK_SECRET # whsec_... (from Stripe Dashboard -> Webhooks)
wrangler secret put AI_GATEWAY_KEY        # API key for your AI provider (optional)

# 3. Config (update wrangler.toml [vars])
#    STRIPE_STARTER_PRICE_ID = "price_..."
#    STRIPE_PRO_PRICE_ID     = "price_..."
#    AI_GATEWAY_URL          = "https://api.openai.com/v1"

# 4. Deploy
npm run deploy

# 5. Register Stripe webhook
# In Stripe Dashboard -> Developers -> Webhooks -> Add endpoint:
#   URL: https://creatingfire.org/webhook
#   Events: checkout.session.completed, customer.subscription.deleted,
#           customer.subscription.updated, invoice.payment_failed
```

## GitHub Actions (CI/CD)

Add these secrets to your repository:

- `CLOUDFLARE_API_TOKEN` — from Cloudflare dashboard → My Profile → API Tokens
- `CLOUDFLARE_ACCOUNT_ID` — `4ba8ad1a8d6edbef7ae9c7b1a80d45af`

Every push to `main` auto-deploys to `creatingfire.org`.

## How Revenue Works (automated)

1. Visitor lands on `creatingfire.org` → sees pricing → clicks Subscribe
2. Dashboard calls `POST /signup` → Worker creates Stripe Checkout Session
3. Customer pays → Stripe fires `checkout.session.completed` webhook
4. Worker verifies HMAC signature → provisions customer in KV → returns API key
5. Customer uses API key → quota checked on every request, usage tracked in KV
6. Hourly cron → posts usage records to Stripe for metered billing → sends health report

## Dev Workflow

```bash
npm run dev              # local Wrangler dev server
npm run typecheck        # TypeScript check
npm run deploy           # deploy to production
npm run deploy:staging   # deploy to staging env
```
