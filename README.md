# Cf- | ERC20 Token Sample

> A production-ready ERC20 token implementation with advanced burn capabilities on Ethereum.

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Lint Solidity code
npm run lint
```

## Documentation

- **[Setup Guide](./SETUP.md)** - Complete development environment setup and troubleshooting
- **[Smart Contracts](./contracts/)** - ERC20_Token_Sample implementation details
- **[Tests](./test/)** - Test suite and coverage information

## Features

- ✅ Full ERC20 token implementation (OpenZeppelin)
- ✅ Advanced burn functionality with event logging
- ✅ 100 billion token initial supply (18 decimals)
- ✅ No owner/admin functions - fully immutable after deployment
- ✅ Comprehensive test coverage
- ✅ Automated GitHub Actions CI/CD

## Project Structure

```
contracts/    → Smart contracts (Solidity)
scripts/      → Deployment scripts
test/         → Test suite (Chai/Hardhat)
artifacts/    → Compiled contract artifacts (generated)
```

## Configuration

See [SETUP.md](./SETUP.md) for detailed configuration and deployment instructions.

## License

MIT License - see LICENSE file for details 
