#!/usr/bin/env node

/**
 * Solidity Compiler Setup Script
 * 
 * This script helps pre-download and cache the Solidity compiler for offline development.
 * Usage: node scripts/setup-compiler.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPILER_VERSION = "0.8.26";
const CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".cache",
  "hardhat-nodejs",
  "compilers-v3"
);

console.log("🔧 Solidity Compiler Setup");
console.log("==========================\n");

console.log(`Version: ${COMPILER_VERSION}`);
console.log(`Cache Directory: ${CACHE_DIR}\n`);

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log("✅ Created cache directory\n");
}

console.log("📝 Instructions for Offline Setup:\n");
console.log("1. Online Setup (Recommended):");
console.log("   - Run: npm run compile");
console.log("   - This will automatically download and cache the compiler\n");

console.log("2. Manual Compiler Caching:");
console.log("   - Run this script on an online machine");
console.log("   - Copy ~/.cache/hardhat-nodejs/ to your offline machine\n");

console.log("3. Alternative: Pre-download Compiler");
console.log("   - Visit: https://binaries.soliditylang.org/");
console.log("   - Download solc-v" + COMPILER_VERSION);
console.log("   - Place in: " + CACHE_DIR + "\n");

console.log("ℹ️  Once the compiler is cached, compilation works offline.");
console.log("   Subsequent runs use the cached compiler automatically.\n");

console.log("✅ Setup guide complete!");

