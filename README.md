# SAMPLE1 ERC-20

SAMPLE1 is a fixed-supply, burnable ERC-20 pilot built with OpenZeppelin and Hardhat 2. The preparation branch is restricted to Ethereum Sepolia testnet and does not include mainnet deployment or automatic deployment.

## Token parameters

- Name: `ERC20 Token Sample1`
- Symbol: `SAMPLE1`
- Decimals: `18`
- Initial supply: `100,000,000,000 SAMPLE1`
- Additional minting: none
- Owner/admin role: none

The constructor requires an explicit initial recipient. The full supply is minted once to that address. The deployment signer must be a separate, testnet-only wallet and receives no SAMPLE1.

## Phase 1: preparation and validation

Install and validate from a clean checkout:

```bash
npm ci
npm run scan:secrets
npm run compile
npm test
npm run lint
npm audit --omit=dev --audit-level=high
```

The GitHub Actions workflow performs these checks on pushes and pull requests. It does not deploy anything.

## Local Sepolia configuration

Copy `.env.example` to `.env` and provide:

```dotenv
SEPOLIA_RPC_URL=<Ethereum Sepolia RPC URL>
SEPOLIA_PRIVATE_KEY=<private key for a dedicated testnet-only deployer>
INITIAL_RECIPIENT=<public self-custody EVM wallet address>
DEPLOYMENT_CONFIRMATION=REPLACE_AFTER_FINAL_APPROVAL
```

Use a self-custody wallet as the recipient. Do not use a custodial exchange deposit address. Never commit `.env`, a private key, seed phrase, wallet backup, password, or signing PIN.

Run the non-transactional preflight only after the RPC URL, testnet deployer, recipient address, and Sepolia test ETH are ready:

```bash
npm run preflight:sepolia
```

The preflight verifies:

- Ethereum Sepolia chain ID `11155111`;
- a valid nonzero recipient;
- separate deployer and recipient addresses;
- available Sepolia test ETH;
- the contract source SHA-256;
- that no transaction was sent.

## Phase 2: separate deployment approval

Preparation authorization does not authorize deployment. After the preflight report is reviewed, set the following value only when separate deployment approval is explicitly granted:

```dotenv
DEPLOYMENT_CONFIRMATION=DEPLOY_SAMPLE1_TO_SEPOLIA
```

Then the authorized operator may run:

```bash
npm run deploy:sepolia
```

The deployment script refuses non-Sepolia networks, missing recipients, zero addresses, identical deployer/recipient accounts, empty deployer balances, and missing final confirmation. After deployment it verifies the transaction, total supply, recipient balance, and zero SAMPLE1 balance for the deployer.

## Prohibited during this pilot

- Ethereum mainnet or another production network
- real-money funding requirements
- primary-wallet private keys
- custodial exchange deposit addresses as the token recipient
- automatic deployment from GitHub Actions
- deployment before separate final approval
