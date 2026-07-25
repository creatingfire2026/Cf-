const { ethers } = require("hardhat");

const DEFAULT_RECIPIENT =
  "0x32fcb670a04bd7eac165c3ed485165098e2374bd";
const EXPECTED_SUPPLY = 100_000_000_000n * 10n ** 18n;

async function main() {
  const recipient = process.env.INITIAL_RECIPIENT || DEFAULT_RECIPIENT;

  if (!ethers.isAddress(recipient)) {
    throw new Error("INITIAL_RECIPIENT is not a valid EVM address");
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  console.log("Deployment signer:", deployer.address);
  console.log("Initial recipient:", recipient);
  console.log(
    "Signer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const Token = await ethers.getContractFactory(
    "ERC20_Token_Sample",
    deployer
  );
  const token = await Token.deploy(recipient);
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const recipientBalance = await token.balanceOf(recipient);

  console.log("ERC20_Token_Sample deployed to:", contractAddress);
  console.log(
    "Recipient balance:",
    ethers.formatUnits(recipientBalance, 18),
    await token.symbol()
  );

  if (recipientBalance !== EXPECTED_SUPPLY) {
    throw new Error("Post-deployment recipient balance mismatch");
  }

  if ((await token.balanceOf(deployer.address)) !== 0n && deployer.address.toLowerCase() !== recipient.toLowerCase()) {
    throw new Error("Deployment signer unexpectedly received tokens");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
