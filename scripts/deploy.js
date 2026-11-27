import hre from "hardhat";

const ALLOWED_LOCAL_CHAINS = new Set([31337n]);
const SEPOLIA_CHAIN_ID = 11155111n;

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;
  const networkInfo = await ethers.provider.getNetwork();

  if (networkInfo.chainId === 1n) {
    throw new Error(
      "Refusing to deploy to Ethereum mainnet (chainId 1). Use a testnet such as Sepolia."
    );
  }

  if (!ALLOWED_LOCAL_CHAINS.has(networkInfo.chainId)) {
    if (networkInfo.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(
        `Unsupported target chainId ${networkInfo.chainId}. Only localhost (31337) and Sepolia (11155111) are permitted.`
      );
    }
    if (!process.env.RPC_URL?.trim()) {
      throw new Error("Missing required RPC_URL environment variable for Sepolia deployment.");
    }
    if (!process.env.DEPLOYER_PRIVATE_KEY?.trim()) {
      throw new Error("Missing required DEPLOYER_PRIVATE_KEY environment variable for Sepolia deployment.");
    }
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer available for the selected network.");
  }

  console.log("Network chainId:", networkInfo.chainId.toString());
  console.log("Deploying from:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const Token = await ethers.getContractFactory("ERC20_Token_Sample", deployer);
  const token = await Token.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("ERC20_Token_Sample deployed to:", address);
  console.log(
    "Total supply:",
    ethers.formatUnits(await token.totalSupply(), 18),
    await token.symbol()
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deployment aborted:", err.message);
    process.exit(1);
  });
