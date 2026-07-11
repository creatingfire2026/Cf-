const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  const Token = await ethers.getContractFactory("ERC20_Token_Sample");
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
    console.error(err);
    process.exit(1);
  });
