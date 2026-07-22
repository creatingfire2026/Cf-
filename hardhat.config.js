require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const { DEPLOYER_PRIVATE_KEY, RPC_URL, ETHERSCAN_API_KEY, REPORT_GAS } =
  process.env;

const sharedNetwork = {
  url: RPC_URL || "http://127.0.0.1:8545",
  accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
};

module.exports = {
  solidity: "0.8.26",
  networks: {
    mainnet: sharedNetwork,
    sepolia: sharedNetwork,
    polygon: sharedNetwork,
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};
