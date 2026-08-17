# SAMPLE1 ERC-20

SAMPLE1 is a fixed-supply, burnable ERC-20 built with OpenZeppelin and Hardhat 2.

## Token parameters

- Name: `ERC20 Token Sample1`
- Symbol: `SAMPLE1`
- Decimals: `18`
- Initial supply: `100,000,000,000 SAMPLE1`
- Additional minting: none
- Owner/admin role: none

The constructor requires an explicit initial recipient. Deployment does not assign supply to the deployment signer unless that signer is deliberately supplied as the recipient.

## Local validation

```bash
npm install
npm run compile
npm test
```

## Sepolia deployment

Copy `.env.example` to `.env` and configure:

```dotenv
SEPOLIA_RPC_URL=<your Sepolia RPC URL>
SEPOLIA_PRIVATE_KEY=<private key for a dedicated funded Sepolia deployer>
INITIAL_RECIPIENT=0x32fcb670a04bd7eac165c3ed485165098e2374bd
```

Never commit `.env`, a private key, seed phrase, wallet backup, or signing PIN. The repository `.gitignore` excludes `.env`.

Deploy only after compilation and tests pass:

```bash
npm run deploy:sepolia
```

The deployment script prints the network, signer, recipient, contract address, and recipient balance. It fails if the complete initial supply is not assigned to the explicit recipient.

## Execution gate

Before Sepolia deployment, verify:

- the recipient address is correct;
- the deployment signer is a dedicated testnet account;
- the signer contains sufficient Sepolia test ETH;
- `npm run compile` succeeds;
- `npm test` succeeds;
- no real secret appears in Git history.

Mainnet deployment is intentionally outside this workflow and requires a separate review.
