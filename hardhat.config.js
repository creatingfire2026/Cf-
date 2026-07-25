require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const networks = {};

if (process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.SEPOLIA_PRIVATE_KEY],
  };
}

module.exports = {
  solidity: "0.8.26",
  networks,
};
