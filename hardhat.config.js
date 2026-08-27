require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} = require("hardhat/builtin-tasks/task-names");

/**
 * Overrides the default Solidity compiler build resolution to fall back to the
 * locally installed `solc` npm package when the compiler binary cannot be
 * downloaded from the internet (e.g. in CI or restricted network environments).
 *
 * @param {object} args - Subtask arguments (solcVersion, quiet).
 * @param {object} _hre - Hardhat Runtime Environment (unused).
 * @param {Function} runSuper - The default subtask implementation.
 * @returns {{ compilerPath: string, isSolcJs: boolean, version: string, longVersion: string }}
 */
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, _hre, runSuper) => {
  try {
    return await runSuper(args);
  } catch (_err) {
    const { version } = require("solc/package.json");
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version,
      longVersion: version,
    };
  }
});

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
