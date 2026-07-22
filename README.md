# CreatingFire Ecosystem

CreatingFire Ecosystem unifies the `Cf-` ERC20 token contract and Theodore's multi-agent automation system behind a Cloudflare Worker orchestration layer.

## System Overview

- **Smart contract layer**: ERC20 token (`contracts/ERC20_Token_Sample.sol`) with burn features.
- **Orchestration layer**: Cloudflare Worker (`src/worker.js`) for token operations + multi-agent routes.
- **Agent layer**:
  - `src/agents/finance.js`
  - `src/agents/jobs.js`
  - `src/agents/toolchain.js`
- **Data layer**:
  - KV: `AGENT_STATE`, `TOKEN_CACHE`
  - D1: `THEODORE_DB` with schema at `src/db/schema.sql`

## Architecture Diagram (ASCII)

```text
                         ┌──────────────────────────────┐
                         │   Cloudflare Worker API      │
                         │   src/worker.js              │
                         └───────┬────────────┬─────────┘
                                 │            │
                      ┌──────────▼───────┐ ┌──▼────────────────┐
                      │  ERC20 on-chain  │ │ Multi-Agent Layer │
                      │ deploy/status/burn│ │ finance/jobs/tools│
                      └──────────┬───────┘ └──┬────────────────┘
                                 │             │
                          ┌──────▼──────┐ ┌────▼──────────────┐
                          │ JSON-RPC    │ │ KV + D1 Storage   │
                          │ (RPC_URL)   │ │ state/events/runs │
                          └─────────────┘ └───────────────────┘
```

## Setup

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/creatingfire2026/Cf-.git
   cd Cf-
   npm install
   ```
2. Configure environment values:
   ```bash
   cp .env.example .env
   ```
3. Configure Cloudflare secrets/vars:
   - `wrangler.toml`
   - `wrangler secret put API_SECRET`
   - `wrangler secret put RPC_URL`
4. Apply D1 schema:
   ```bash
   npx wrangler d1 execute THEODORE_DB --file=src/db/schema.sql
   ```
5. Deploy Worker:
   ```bash
   npm run worker:deploy
   ```

## API Endpoints

All endpoints require:

- Header: `Authorization` with a valid API token
- JSON response envelope: `{ success, data, timestamp }`

### Health
- `GET /` — system health and binding status

### Token
- `POST /token/deploy` — deploy via JSON-RPC (`eth_sendRawTransaction` or `eth_sendTransaction`)
- `GET /token/status?contractAddress=0x...` — token name/symbol/supply
- `POST /token/burn` — call `burnTokens(amount)`

### Agents
- `POST /agent/finance` — ticker/query analysis (mock structure)
- `POST /agent/jobs` — skill/location job search (mock structure)
- `POST /agent/toolchain` — toolchain optimization suggestions
- `GET /agent/status` — aggregate status from KV

### Scheduling
- `POST /cron` — manual trigger for scheduled orchestration tasks
- Scheduled cron (`0 * * * *`) runs the same orchestration logic automatically

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Hardhat | Deployment signer key |
| `RPC_URL` | Hardhat + Worker | Chain RPC endpoint |
| `ETHERSCAN_API_KEY` | Hardhat | Verification API key |
| `REPORT_GAS` | Hardhat | Enable gas reporting (`true`/`false`) |
| `API_SECRET` | Worker | ****** validation |
| `NETWORK` | Worker vars | Target network label (`mainnet`) |
| `TOKEN_CONTRACT_ADDRESS` | Worker | Default token address for status/burn |
| `TOKEN_BYTECODE` | Worker | Optional default deployment bytecode |
| `DEPLOYER_ADDRESS` | Worker | Optional unlocked RPC deploy/burn sender |

## GitHub Actions CI/CD

- `test.yml`: compiles and tests Hardhat project.
- `deploy.yml`:
  - Runs `npm test`
  - Runs `npm run lint`
  - Deploys Worker with `wrangler deploy` after successful checks

Required GitHub secrets for deployment:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Repository Links

- ERC20 + orchestration repo: https://github.com/creatingfire2026/Cf-
- Theodore's Multi-Agent System repo: https://github.com/creatingfire2026/Theodore-s-Automated-copilot-Multi-Agent-System
