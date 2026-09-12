# Deployment Prerequisites, Controls, and Unresolved Risks

> **Status: documentation only — no deployment has been performed and none should be**  
> This document satisfies item 7 of the hardening pilot (issue #7).

---

## Table of Contents

1. [Prerequisites before any deployment attempt](#1-prerequisites-before-any-deployment-attempt)
2. [Recipient-wallet controls](#2-recipient-wallet-controls)
3. [Verification steps](#3-verification-steps)
4. [Rollback limitations](#4-rollback-limitations)
5. [Unresolved risks and open questions](#5-unresolved-risks-and-open-questions)

---

## 1. Prerequisites before any deployment attempt

### 1.1 Environment prerequisites

| Requirement | Detail |
|---|---|
| Node.js version | 22 LTS (matches CI) |
| Hardhat version | 2.x (see `package.json`) |
| Solidity compiler | 0.8.26 (locally bundled `solc@0.8.26` satisfies this offline) |
| Network target | **Sepolia testnet only** – never mainnet without explicit owner decision |
| RPC endpoint | A non-public Alchemy or Infura project URL for Sepolia |

### 1.2 Configuration prerequisites

Copy `.env.example` to `.env` and populate **every** field before running `scripts/deploy.js`:

```
DEPLOYER_PRIVATE_KEY=0x...      # Sepolia-funded test wallet private key (no real value)
RPC_URL=https://...             # Sepolia RPC endpoint
ETHERSCAN_API_KEY=...           # Only needed for Etherscan verification
REPORT_GAS=false                # Optional
```

> **Never commit a populated `.env` file.** The `.gitignore` already excludes it.

### 1.3 Pre-deployment checklist

- [ ] `npm ci` completes without errors on Node.js 22
- [ ] `npx hardhat compile` succeeds with zero warnings
- [ ] `npx hardhat test` – all tests pass (currently 46)
- [ ] `npx solhint 'contracts/**/*.sol'` – zero lint errors
- [ ] `npx hardhat coverage` – 100 % statement, branch, function, and line coverage
- [ ] `npm audit --audit-level=high` – no high or critical advisories
- [ ] Secret scan (gitleaks) – no secrets detected in history
- [ ] Deployer wallet balance ≥ estimated gas × 1.5 on Sepolia
- [ ] RPC endpoint tested with a read-only call (`eth_blockNumber`)

### 1.4 Mainnet / production gate

The deployment script **must not** be pointed at mainnet or any production network without:

- Explicit written approval from the repository owner
- A completed independent smart-contract audit
- A multi-signature scheme or time-lock for any privileged operations (N/A for this contract because it is immutable, but the deployer key must still be protected)
- A post-deployment monitoring plan

---

## 2. Recipient-wallet controls

`ERC20_Token_Sample` mints 100 billion tokens to `msg.sender` (the deployer) at construction.
All subsequent transfers are the responsibility of the key holder.

### Recommended controls

| Control | Why it matters |
|---|---|
| Use a hardware wallet or hardware-backed key for the deployer | A hot-wallet compromise transfers all minted tokens irrevocably |
| Immediately transfer tokens to a multi-sig (e.g. Gnosis Safe) after deployment | Removes single-point-of-failure from a single EOA |
| Record the deployer address and deployment transaction on-chain | Required for post-deployment audits |
| Maintain an off-chain cap table / distribution schedule | The contract itself enforces nothing; all distribution logic is off-chain |

### What the contract does NOT enforce

- Vesting schedules  
- Whitelist or KYC on recipients  
- Maximum holding limits  
- Pausing or freezing of transfers  

If any of these controls are required before a real deployment, they must be added to the contract before deployment.

---

## 3. Verification steps

### 3.1 On-chain verification (Etherscan)

After deploying to Sepolia, verify the source code:

```bash
npx hardhat verify --network sepolia <deployed_address>
```

This requires `ETHERSCAN_API_KEY` to be set in `.env`.

### 3.2 Manual post-deployment checks

Run these checks immediately after deployment (read-only, no transactions):

```bash
npx hardhat console --network sepolia
```

```js
const token = await ethers.getContractAt("ERC20_Token_Sample", "<deployed_address>");
await token.name();
await token.symbol();
await token.decimals();
await token.INITIAL_SUPPLY();
await token.totalSupply();
await token.balanceOf("<deployer_address>");
```

Expected outputs to verify:

| Check | Expected value |
|---|---|
| `token.name()` | `"ERC20 Token Sample1"` |
| `token.symbol()` | `"SAMPLE1"` |
| `token.decimals()` | `18` |
| `token.INITIAL_SUPPLY()` | `100000000000000000000000000000` (100 billion × 10¹⁸) |
| `token.totalSupply()` | Equal to `INITIAL_SUPPLY` |
| `token.balanceOf(deployer)` | Equal to `INITIAL_SUPPLY` |

### 3.3 ABI and bytecode pin

Before any deployment, record:

- The `keccak256` of the compiled bytecode artifact at `artifacts/contracts/ERC20_Token_Sample.sol/ERC20_Token_Sample.json`
- The Hardhat compilation metadata hash

These values allow a third party to verify that the deployed bytecode matches the audited source.

---

## 4. Rollback limitations

`ERC20_Token_Sample` is **fully immutable** once deployed:

- No owner address
- No `pause()` / `unpause()` function
- No `upgradeTo()` proxy pattern
- No emergency withdrawal or blacklist mechanism

### Consequences

| Scenario | Outcome |
|---|---|
| Bug discovered in the contract after deployment | A new contract must be deployed; the old one cannot be modified or stopped |
| Deployer key compromised | All tokens held by the deployer can be transferred by the attacker; no on-chain mechanism to freeze |
| Erroneous token distribution | Cannot be reversed; all transfers are permanent |
| Need to change token name / symbol | Impossible; requires redeployment |

### Mitigation (before deployment)

1. Complete an independent audit.
2. Run an extended testnet period (≥ 2 weeks on Sepolia with realistic transaction volumes).
3. Move deployer holdings to a multi-sig immediately post-deployment.
4. Document a "successor contract" plan in case redeployment is needed.

---

## 5. Unresolved risks and open questions

| # | Risk / Question | Severity | Status |
|---|---|---|---|
| R-1 | **No audit performed.** The contract has not been reviewed by an independent smart-contract security firm. | High | Open |
| R-2 | **Duplicate burn interfaces.** `burnTokens`, `burnFrom` (override), and the inherited `burn` / `burnFrom` from `ERC20Burnable` all exist. Only `burnTokens` and the `burnFrom` override emit `TokensBurned`. A caller using the raw `ERC20Burnable.burn()` path bypasses `TokensBurned`, which may surprise off-chain indexers. See the test `direct burn() (ERC20Burnable) does NOT emit TokensBurned` for the confirmed behaviour. **Smallest safe correction:** document this as intended or rename `burnTokens` to make the two-path design explicit; no change is needed if off-chain indexers also watch the standard `Transfer(to=0x0)` event. | Medium | Documented – owner decision pending |
| R-3 | **No deployment script network gate.** `scripts/deploy.js` does not prevent execution against mainnet. A `SEPOLIA_ONLY=true` guard should be added before any live deployment. | Medium | Open |
| R-4 | **`INITIAL_SUPPLY` is minted to `msg.sender` with no split or vesting.** The entire float is in one wallet at T+0. | Medium | By design – multi-sig transfer required post-deployment |
| R-5 | **No events for `approve`.** OpenZeppelin emits `Approval` but there is no custom project event. This is standard and acceptable. | Low | Accepted |
| R-6 | **`npm audit` advisory backlog.** Several transitive dependencies report low/moderate advisories. None affect the Solidity compilation or runtime path. | Low | Tracked – resolve before mainnet |
| R-7 | **`solc` npm package bundled as offline fallback.** CI uses the bundled `solc@0.8.26` when `binaries.soliditylang.org` is unreachable. If the version is changed in `hardhat.config.js`, the bundled package version must also be updated. | Low | Documented |
