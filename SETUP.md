# Project Setup Guide

## Overview
This is a **Hardhat-based Ethereum project** featuring a production-ready ERC20 token with burn capability. This guide will walk you through setting up the development environment and running tests.

## Prerequisites
- **Node.js**: v18+ (v22 recommended)
- **npm**: v9+ (comes with Node.js)
- **Git**: For cloning and version control

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/creatingfire2026/Cf-.git
cd Cf-
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- **Hardhat**: Ethereum development framework
- **Ethers.js**: Blockchain interaction library
- **Chai**: Assertion library for testing
- **OpenZeppelin Contracts**: Secure smart contract templates
- **Solhint**: Solidity linter

## Building & Compilation

### Compile Smart Contracts
```bash
npm run compile
```

This command:
- Downloads the Solidity compiler (v0.8.26)
- Compiles all `.sol` files in the `contracts/` directory
- Generates ABI and bytecode in the `artifacts/` directory

**Note**: First compilation requires downloading the Solidity compiler (~50MB). This is cached locally for future builds.

## Running Tests

### Execute All Tests
```bash
npm run test
```

This will:
- Start a local Hardhat test network
- Deploy the ERC20 token contract
- Run all test suites
- Display coverage and results

### Test Coverage
```bash
npm run coverage
```

Generates a detailed coverage report of the smart contracts.

## Code Quality

### Lint Solidity Code
```bash
npm lint
```

Runs Solhint to check for common Solidity issues and best practices.

## Project Structure

```
Cf-/
├── contracts/
│   └── ERC20_Token_Sample.sol      # ERC20 token implementation
├── scripts/
│   └── deploy.js                   # Deployment script
├── test/
│   └── ERC20_Token_Sample.test.js   # Test suite
├── artifacts/                       # Compiled contract artifacts (generated)
├── cache/                          # Hardhat cache (generated)
├── node_modules/                   # Dependencies
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Project metadata & scripts
└── README.md                       # Project overview
```

## Configuration

### Hardhat Configuration (`hardhat.config.js`)
- **Solidity Version**: 0.8.26
- **Test Framework**: Hardhat + Chai
- **Default Network**: Hardhat (local test network)

### Environment Variables
Copy `.env.example` to `.env` for local configuration:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `DEPLOYER_PRIVATE_KEY`: Your wallet's private key (for mainnet deployment)
- `RPC_URL`: Network endpoint (Infura, Alchemy, etc.)
- `ETHERSCAN_API_KEY`: For contract verification
- `REPORT_GAS`: Set to "true" for gas reporting in tests

**⚠️ Security**: Never commit `.env` to version control!

## Network Deployment

### Local Hardhat Network (Default)
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Deploying to Public Networks

1. Add network configuration to `hardhat.config.js`
2. Set private key in `.env`
3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network <network-name>
   ```

## Troubleshooting

### Compilation Issues

**Error: "Couldn't download compiler version list"**
- **Cause**: Network connectivity issue or blocked access to `binaries.soliditylang.org`
- **Solution**: 
  - Ensure internet connection
  - Check firewall/proxy settings
  - Try again after a few minutes

**Error: "Cannot find module 'hardhat'"**
- **Solution**: Run `npm install` again to reinstall dependencies

### Test Failures

**Contract deployment fails**
- Check that contracts compile with `npm run compile`
- Verify contract syntax in `contracts/`

**Transaction reverts**
- Check test assumptions (e.g., token amounts, addresses)
- Review event assertions and balances
- Enable gas reporting with `REPORT_GAS=true`

## Development Tips

### Debugging Tests
Add debugging output:
```javascript
console.log("Balance:", ethers.formatEther(await token.balanceOf(deployer)));
```

Run specific test:
```bash
npx hardhat test --grep "specific test name"
```

### Gas Optimization
Enable gas reporting:
```bash
REPORT_GAS=true npm run test
```

### Console in Tests
Hardhat provides a network inspection console:
```bash
npx hardhat console
```

## Continuous Integration

The project includes GitHub Actions workflows for:
- **Automated Testing**: Runs on every push and PR
- **Code Quality**: Linting checks
- **Compilation Verification**: Ensures contracts compile

See `.github/workflows/` for workflow configurations.

## Additional Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **Ethers.js**: https://docs.ethers.org/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Solidity**: https://docs.soliditylang.org/
- **ERC20 Standard**: https://eips.ethereum.org/EIPS/eip-20

## Support

For issues and questions:
1. Check this guide's troubleshooting section
2. Review existing issues on GitHub
3. Create a new issue with detailed error messages and steps to reproduce

## License

See LICENSE file in the repository.
