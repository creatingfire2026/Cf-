# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |

## Reporting a Vulnerability

**Do not report security vulnerabilities or exposed secrets in public GitHub issues, pull requests, or discussions.**

Report vulnerabilities privately using GitHub Security Advisories:
https://github.com/creatingfire2026/Cf-/security/advisories/new

Include reproduction steps and impact analysis, and redact any sensitive data.

## Secret Exposure Response

If a real private key, seed phrase, API token, or credentialed RPC URL is ever committed:
1. Treat the secret as compromised immediately.
2. Revoke and rotate all exposed API keys, RPC credentials, and tokens.
3. Transfer assets out of any exposed wallet to a fresh key immediately.
4. Create an offline backup mirror, then scrub Git history with `git filter-repo` or BFG.

## Scope

This policy covers Solidity contracts under `contracts/`, Hardhat configuration, deployment scripts under `scripts/`, and CI workflows under `.github/workflows/`.
