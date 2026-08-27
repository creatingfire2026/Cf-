const { ethers } = require("hardhat");

const EXPECTED_CHAIN_ID = 11155111n;
const EXPECTED_SUPPLY = 100_000_000_000n * 10n ** 18n;
const REQUIRED_CONFIRMATION = "DEPLOY_SAMPLE1_TO_SEPOLIA";

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
      `Refusing deployment: expected Ethereum Sepolia chainId ${EXPECTED_CHAIN_ID}, received ${network.chainId}`
    );
  }

  if (deployerAddress.toLowerCase() === recipient.toLowerCase()) {
    throw new Error(
      "Deployment signer and INITIAL_RECIPIENT must be different testnet accounts"
    );
  }

  if (deployerBalance === 0n) {
    throw new Error("Sepolia deployment signer has no test ETH for gas");
  }

  if (process.env.DEPLOYMENT_CONFIRMATION !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Deployment confirmation missing. Set DEPLOYMENT_CONFIRMATION=${REQUIRED_CONFIRMATION} only after final approval`
    );
  }

  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  console.log("Deployment signer:", deployerAddress);
  console.log("Initial recipient:", recipient);
  console.log("Signer balance:", ethers.formatEther(deployerBalance), "ETH");

  const Token = await ethers.getContractFactory("ERC20_Token_Sample", deployer);
  const token = await Token.deploy(recipient);
  const deploymentTransaction = token.deploymentTransaction();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const recipientBalance = await token.balanceOf(recipient);
  const deployerTokenBalance = await token.balanceOf(deployerAddress);
  const totalSupply = await token.totalSupply();

  console.log(
    "Deployment transaction:",
    deploymentTransaction ? deploymentTransaction.hash : "unavailable"
  );
  console.log("ERC20_Token_Sample deployed to:", contractAddress);
  console.log(
    "Recipient balance:",
    ethers.formatUnits(recipientBalance, 18),
    await token.symbol()
  );

  if (recipientBalance !== EXPECTED_SUPPLY) {
    throw new Error("Post-deployment recipient balance mismatch");
  }

  if (totalSupply !== EXPECTED_SUPPLY) {
    throw new Error("Post-deployment total supply mismatch");
  }

  if (deployerTokenBalance !== 0n) {
    throw new Error("Deployment signer unexpectedly received SAMPLE1 tokens");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
