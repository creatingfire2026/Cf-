require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("solidity-coverage");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the solc npm package as a fallback when the remote compiler CDN is
// unreachable (e.g. in a network-restricted CI environment).
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  try {
    return await runSuper(args);
  } catch (error) {
    const solcPath = require.resolve("solc/soljson");
    const solc = require("solc");
    const longVersion = solc.version().replace(".Emscripten.clang", "");
    const version = longVersion.split("+")[0];
    if (args.solcVersion !== version) {
      throw error;
    }
    return {
      version,
      longVersion,
      compilerPath: solcPath,
      isSolcJs: true,
    };
  }
});

module.exports = {
  solidity: "0.8.26",
};
