const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const EXPECTED_CHAIN_ID = 11155111n;
const CONTRACT_PATH = path.join(
  __dirname,
  "..",
  "contracts",
  "ERC20_Token_Sample.sol"
);

async function main() {
  const recipientInput = process.env.INITIAL_RECIPIENT;

  if (!recipientInput) {
    throw new Error("INITIAL_RECIPIENT is required; no default recipient is allowed");
  }

  if (!ethers.isAddress(recipientInput)) {
    throw new Error("INITIAL_RECIPIENT is not a valid EVM address");
  }

  const recipient = ethers.getAddress(recipientInput);
  if (recipient === ethers.ZeroAddress) {
    throw new Error("INITIAL_RECIPIENT cannot be the zero address");
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const network = await ethers.provider.getNetwork();
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);

  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Preflight failed: expected Ethereum Sepolia chainId ${EXPECTED_CHAIN_ID}, received ${network.chainId}`
    );
  }

  if (deployerAddress.toLowerCase() === recipient.toLowerCase()) {
    throw new Error(
      "Preflight failed: deployment signer and recipient must be different testnet accounts"
    );
  }

  if (deployerBalance === 0n) {
    throw new Error("Preflight failed: deployment signer has no Sepolia test ETH");
  }

  const source = fs.readFileSync(CONTRACT_PATH);
  const sourceSha256 = crypto.createHash("sha256").update(source).digest("hex");

  console.log("SAMPLE1 SEPOLIA PREFLIGHT");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployment signer:", deployerAddress);
  console.log("Initial recipient:", recipient);
  console.log("Signer test ETH:", ethers.formatEther(deployerBalance));
  console.log("Contract source SHA-256:", sourceSha256);
  console.log("Transaction sent: no");
  console.log("Status: READY FOR SEPARATE FINAL DEPLOYMENT APPROVAL");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
