# Offline Development Setup Guide

This guide provides instructions for setting up and using the Cf- project in offline environments.

## Overview

The main challenge with offline development is downloading the Solidity compiler. Once cached, all subsequent compilations work offline.

## Solidity Compiler Facts

- **Size**: ~50MB per version
- **Location**: Cached in `~/.cache/hardhat-nodejs/compilers-v3/`
- **Required Version**: 0.8.26
- **Caching**: Automatic after first download (online)

## Scenario 1: Setting Up Online First (Recommended)

**Best for**: Developers with intermittent internet access

### Steps

1. **Initial Setup (Online)**
   ```bash
   npm install
   npm run compile
   ```
   
2. **Cache Location**
   - Linux/macOS: `~/.cache/hardhat-nodejs/compilers-v3/`
   - Windows: `%LOCALAPPDATA%/hardhat-nodejs/compilers-v3/`

3. **Verify Cache**
   ```bash
   ls ~/.cache/hardhat-nodejs/compilers-v3/
   # Should show solc-linux-amd64-v0.8.26 or similar
   ```

4. **Work Offline**
   - Once cached, run `npm run compile` without internet
   - Tests work completely offline
   - No internet required for linting, running tests, or development

## Scenario 2: Offline on First Install

**For**: Air-gapped or offline environments

### Option A: Manual Compiler Download

1. **On an online machine:**
   ```bash
   # Visit https://binaries.soliditylang.org/
   # Download the compiler for your platform:
   # - solc-macosx-amd64-v0.8.26
   # - solc-linux-amd64-v0.8.26
   # - solc-windows-amd64-v0.8.26
   ```

2. **Create cache directory:**
   ```bash
   mkdir -p ~/.cache/hardhat-nodejs/compilers-v3/
   ```

3. **Copy compiler:**
   ```bash
   cp downloaded-compiler ~/.cache/hardhat-nodejs/compilers-v3/
   chmod +x ~/.cache/hardhat-nodejs/compilers-v3/solc-*
   ```

4. **Transfer to offline machine:**
   - Backup the `~/.cache/hardhat-nodejs/` directory
   - Transfer via USB drive, external storage, or secure channel
   - Restore on offline machine

### Option B: Transfer Pre-cached Directory

1. **On online machine:**
   ```bash
   # After running: npm install && npm run compile
   tar -czf hardhat-cache.tar.gz ~/.cache/hardhat-nodejs/
   ```

2. **Transfer to offline machine:**
   ```bash
   tar -xzf hardhat-cache.tar.gz -C ~/
   ```

3. **Verify installation:**
   ```bash
   npm run compile
   ```

## Working Offline

Once the compiler is cached:

### Compilation
```bash
npm run compile  # Works offline ✅
```

### Testing
```bash
npm run test     # Works offline ✅
```

### Linting
```bash
npm run lint     # Works offline ✅
```

### Development
```bash
npx hardhat console  # Works offline ✅
```

## Troubleshooting

### Issue: "Couldn't download compiler version list"

**Causes:**
- No internet connection
- Compiler not in cache
- Firewall blocking binaries.soliditylang.org

**Solutions:**
1. Check cache directory exists and contains compiler
2. Verify compiler has execute permissions: `chmod +x ~/.cache/hardhat-nodejs/compilers-v3/solc-*`
3. Verify solc binary works: `~/.cache/hardhat-nodejs/compilers-v3/solc-* --version`

### Issue: Compiler for wrong platform

**Solution:**
- Check your architecture: `uname -m` (or `arch` on macOS)
- Download matching compiler:
  - amd64/x86_64 → solc-linux-amd64 / solc-macosx-amd64 / solc-windows-amd64
  - arm64 → solc-linux-arm64 / solc-macosx-arm64

### Issue: Permission denied on compiler

**Solution:**
```bash
chmod +x ~/.cache/hardhat-nodejs/compilers-v3/solc-*
```

## Network Requirements

### Online Phase
- Internet access required
- ~150MB download (npm dependencies + Solidity compiler)
- 10-15 minutes typical setup

### Offline Phase
- ✅ No internet required
- ✅ Full development workflow
- ✅ Complete testing suite

## CI/CD Pipeline Caching

The project includes GitHub Actions workflows with compiler caching:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: npm
```

This automatically caches:
- npm dependencies
- (Future: Hardhat compiler cache)

## Platform-Specific Notes

### Linux
```bash
# Cache directory
~/.cache/hardhat-nodejs/compilers-v3/
```

### macOS
```bash
# Cache directory
~/.cache/hardhat-nodejs/compilers-v3/
```

### Windows
```bash
# Cache directory
%LOCALAPPDATA%\hardhat-nodejs\compilers-v3\
```

## Docker / Container Setup

For containerized development:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy pre-cached compiler
COPY .cache/hardhat-nodejs ~/.cache/hardhat-nodejs

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy project
COPY . .

# Compilation works offline in container
RUN npm run compile
```

## Additional Resources

- **Hardhat Docs**: https://hardhat.org/docs
- **Solidity Binaries**: https://binaries.soliditylang.org/
- **System Requirements**: Node.js 18+ (22 recommended)

## Questions?

See the main [SETUP.md](./SETUP.md) guide for more information on development workflows and configuration.
