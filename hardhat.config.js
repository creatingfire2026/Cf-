import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import "dotenv/config";

function getSepoliaAccounts() {
  const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!rawKey) {
    return [];
  }
  const normalized = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      "Invalid DEPLOYER_PRIVATE_KEY format: expected a 32-byte hex string."
    );
  }
  return [normalized];
}

export default {
  plugins: [hardhatEthers, hardhatMocha, hardhatEthersChaiMatchers],
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ...(process.env.RPC_URL
      ? {
          sepolia: {
            type: "http",
            url: process.env.RPC_URL,
            accounts: getSepoliaAccounts(),
            chainId: 11155111,
          },
        }
      : {}),
  },
};
