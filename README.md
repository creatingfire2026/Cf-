# Cf- (`ERC20_Token_Sample`)

Fixed-supply, burnable ERC-20 token (`SAMPLE1`) built with OpenZeppelin v5 and Hardhat 3.

## Project Status

- **Contract:** `ERC20_Token_Sample` (Solidity `^0.8.26`, 100,000,000,000 `SAMPLE1`, 18 decimals, immutable supply, no owner/mint role).
- **CI Security:** GitHub Actions runs Gitleaks secret scanning, `npm audit --audit-level=high`, Solhint linting, compilation, and unit tests. **CI never performs deployments.**

## Required Tools

- Node.js `>= 22.x`
- npm `>= 10.x`
- `gitleaks` (optional locally; enforced in CI)

## Safe Local Setup

1. Install locked dependencies: `npm ci`
2. Copy the env template without committing secrets: `cp .env.example .env`
3. Leave `DEPLOYER_PRIVATE_KEY` empty for local compile/test. Never commit `.env`, `*.pem`, `*.key`, or keystore files.

## Validation Commands

- Compile: `npm run compile`
- Test: `npm test`
- Lint: `npm run lint`
- Dependency audit: `npm audit --audit-level=high`
- Secret scan: `gitleaks detect --source . --no-banner --redact`

## Testnet Deployment Guidance

Deployment is never executed by CI. Only local (`hardhat`/`localhost`) and `sepolia` testnet deployments are permitted by `scripts/deploy.js` (mainnet `chainId 1` is explicitly blocked):
`npx hardhat run scripts/deploy.js --network sepolia`

## Secret Rotation

If a secret is ever committed to Git history, treat it as compromised immediately: revoke/rotate the key or API token, move any funds to a new wallet, back up the repository, and rewrite history using `git filter-repo` or BFG.
