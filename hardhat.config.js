require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const {
  DEPLOYER_PRIVATE_KEY,
  RPC_URL,
  MAINNET_RPC_URL,
  SEPOLIA_RPC_URL,
  POLYGON_RPC_URL,
  ETHERSCAN_API_KEY,
  REPORT_GAS,
} = process.env;

const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

module.exports = {
  solidity: "0.8.26",
  networks: {
    mainnet: {
      url: MAINNET_RPC_URL || RPC_URL || "http://127.0.0.1:8545",
      accounts,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || RPC_URL || "http://127.0.0.1:8545",
      accounts,
    },
    polygon: {
      url: POLYGON_RPC_URL || RPC_URL || "http://127.0.0.1:8545",
      accounts,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts,
    },
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};
