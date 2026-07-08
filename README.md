# creatingfire.org — Central Orchestration Engine

A self-owned **workflow engine** deployed on Cloudflare Workers at `creatingfire.org`.  
No third-party restrictions. Your logic, your infrastructure.

## Architecture

| Layer | Cloudflare Resource | Purpose |
|---|---|---|
| Router | **Workers** | HTTP API, auth, routing |
| State | **Durable Objects** | Per-job stateful execution |
| Async | **Queues** | Decoupled job processing |
| Config | **KV** | Workflow registry, settings |
| Assets | **R2** | AI outputs, content, materials |
| UI | **Pages** (`/dashboard`) | Control dashboard |
| Schedule | **Cron Triggers** | Hourly orchestration heartbeat |

## Domains

- `ai` — generation, analysis, publish to R2
- `marketing` — campaigns, content, tracking
- `education` — materials, enroll, progress
- `webhook` — inbound event intake
- `system` — health-checks, cron jobs

## API

All protected routes require: `Authorization: Bearer <YOUR_API_SECRET>` header.
| Method | Path | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| POST | `/webhook` | Inbound webhook intake |
| POST | `/workflow` | Submit a workflow job |
| GET | `/workflow/:id` | Get job status |
| GET | `/workflows` | List workflow keys |
| GET | `/config/:key` | Read config value |
| POST | `/config/:key` | Write config value |
| POST | `/cron` | Trigger cron manually |

### Submit a job

```bash
curl -X POST https://creatingfire.org/workflow \
  -H "Authorization: Bearer <YOUR_API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"domain":"ai","action":"generate","payload":{"prompt":"..."}}'
```

## Setup

```bash
bash scripts/setup.sh
wrangler login
wrangler secret put API_SECRET
wrangler kv namespace create CF_KV
# update wrangler.toml with the KV namespace IDs printed above
wrangler queues create cf-workflow-queue
wrangler r2 bucket create cf-assets
npm run deploy
```

## GitHub Actions (CI/CD)

Add these secrets to your repository:

- `CLOUDFLARE_API_TOKEN` — from Cloudflare dashboard → My Profile → API Tokens
- `CLOUDFLARE_ACCOUNT_ID` — `4ba8ad1a8d6edbef7ae9c7b1a80d45af`

Every push to `main` auto-deploys to `creatingfire.org`.

## Dev Workflow (mob.sh + git-absorb)

```bash
mob start 25          # start 25-min session
# ... build a feature
git add -p            # stage relevant changes
git absorb            # auto-fixup into correct commits
git rebase --autosquash
mob next              # hand off / self-review
mob done              # squash → PR
```
