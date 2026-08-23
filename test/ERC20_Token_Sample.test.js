import { expect } from "chai";
import { ethers } from "hardhat";

// Utility function to replace hardhat-chai-matchers .to.be.reverted
async function expectReverted(promise) {
  try {
    await promise;
    throw new Error("Expected transaction to be reverted");
  } catch (err) {
    if (err.message === "Expected transaction to be reverted") {
      throw err;
    }
    // Transaction was reverted as expected
  }
}

// Utility function to check for custom revert errors
async function expectRevertedWithCustomError(promise, contract, errorName) {
  try {
    await promise;
    throw new Error("Expected transaction to be reverted");
  } catch (err) {
    if (err.message === "Expected transaction to be reverted") {
      throw err;
    }
    // Transaction was reverted, check for custom error
    // First try to decode the error using the contract interface
    if (err.data && contract && contract.interface) {
      try {
        const decodedError = contract.interface.parseError(err.data);
        if (!decodedError) {
          // parseError returned null/undefined for error data
          throw new Error(
            `Failed to decode error. Expected "${errorName}" but parseError returned null. Error data: ${err.data}`
          );
        }
        expect(decodedError.name).to.equal(errorName);
        return;
      } catch (decodeErr) {
        // Re-throw AssertionError to preserve test failure details
        if (decodeErr.name === "AssertionError") {
          throw decodeErr;
        }
        // Re-throw if it's our own error
        if (decodeErr.message?.includes("Failed to decode error")) {
          throw decodeErr;
        }
        // If decoding fails with error data present, it's likely an unexpected error
        throw new Error(
          `Failed to decode error. Expected "${errorName}" but got: ${err.message || err.reason || err.data}`
        );
      }
    }
    // If we have a contract but no error data, we can't reliably decode the custom error
    if (contract) {
      throw new Error(
        `Expected custom error "${errorName}" but no error data was available for decoding. ` +
        `Got revert: ${err.message || err.reason || "unknown error"}`
      );
    }
    // Fallback: if no contract provided, check message/reason fields
    // This path is only used when contract is not provided to the helper
    const errorContent = [err.message, err.reason]
      .filter((val) => val != null)
      .join(" ");
    expect(errorContent).to.include(errorName);
  }
}

// Helper function to find event in transaction receipt
function findEvent(receipt, contract, eventName) {
  const event = receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.name === eventName);

  if (!event) {
    throw new Error(`Event "${eventName}" not found in transaction receipt`);
  }
  return event;
}

describe("ERC20_Token_Sample", function () {
  let token;
  let deployer, alice, bob;

  const INITIAL_SUPPLY = ethers.parseUnits("100000000000", 18); // 100 billion

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ERC20_Token_Sample");
    token = await Token.deploy();
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------
  describe("Deployment", function () {
    it("sets the correct name and symbol", async function () {
      expect(await token.name()).to.equal("ERC20 Token Sample1");
      expect(await token.symbol()).to.equal("SAMPLE1");
    });

    it("uses 18 decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("mints INITIAL_SUPPLY to the deployer", async function () {
      expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
    });

    it("totalSupply equals INITIAL_SUPPLY", async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("INITIAL_SUPPLY constant is 100 billion tokens", async function () {
      expect(await token.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });
  });

  // ---------------------------------------------------------------------------
  // Standard ERC20 transfers
  // ---------------------------------------------------------------------------
  describe("Transfer", function () {
    it("transfers tokens between accounts", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.balanceOf(deployer.address)).to.equal(
        INITIAL_SUPPLY - amount
      );
    });

    it("reverts when sender has insufficient balance", async function () {
      const amount = ethers.parseUnits("1", 18);
      await expectReverted(
        token.connect(alice).transfer(bob.address, amount)
      );
    });

    it("emits a Transfer event", async function () {
      const amount = ethers.parseUnits("500", 18);
      const tx = await token.transfer(alice.address, amount);
      const receipt = await tx.wait();
      
      const event = findEvent(receipt, token, "Transfer");
      
      expect(event).to.exist;
      expect(event.args[0]).to.equal(deployer.address);
      expect(event.args[1]).to.equal(alice.address);
      expect(event.args[2]).to.equal(amount);
    });
  });

  // ---------------------------------------------------------------------------
  // Allowance / transferFrom
  // ---------------------------------------------------------------------------
  describe("Allowance", function () {
    it("sets and reads allowance", async function () {
      const amount = ethers.parseUnits("200", 18);
      await token.approve(alice.address, amount);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(
        amount
      );
    });

    it("allows transferFrom within allowance", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.approve(alice.address, amount);
      await token.connect(alice).transferFrom(deployer.address, bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
    });

    it("reverts transferFrom when allowance exceeded", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.approve(alice.address, amount);
      await expectReverted(
        token
          .connect(alice)
          .transferFrom(deployer.address, bob.address, amount + 1n)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // burnTokens (caller burns own tokens)
  // ---------------------------------------------------------------------------
  describe("burnTokens", function () {
    it("reduces the caller's balance", async function () {
      const burnAmount = ethers.parseUnits("1000", 18);
      await token.burnTokens(burnAmount);
      expect(await token.balanceOf(deployer.address)).to.equal(
        INITIAL_SUPPLY - burnAmount
      );
    });

    it("reduces totalSupply", async function () {
      const burnAmount = ethers.parseUnits("500", 18);
      await token.burnTokens(burnAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("emits TokensBurned", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      const tx = await token.burnTokens(burnAmount);
      const receipt = await tx.wait();
      
      const event = findEvent(receipt, token, "TokensBurned");
      
      expect(event).to.exist;
      expect(event.args[0]).to.equal(deployer.address);
      expect(event.args[1]).to.equal(burnAmount);
    });

    it("also emits the standard Transfer-to-zero event", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      const tx = await token.burnTokens(burnAmount);
      const receipt = await tx.wait();
      
      const event = findEvent(receipt, token, "Transfer");
      
      expect(event).to.exist;
      expect(event.args[0]).to.equal(deployer.address);
      expect(event.args[1]).to.equal(ethers.ZeroAddress);
      expect(event.args[2]).to.equal(burnAmount);
    });

    it("reverts when amount is 0", async function () {
      await expectRevertedWithCustomError(token.burnTokens(0), token, "ZeroBurnAmount");
    });

    it("reverts when caller has insufficient balance", async function () {
      const tooMuch = INITIAL_SUPPLY + 1n;
      await expectReverted(token.burnTokens(tooMuch));
    });
  });

  // ---------------------------------------------------------------------------
  // burnFrom (burn from approved account)
  // ---------------------------------------------------------------------------
  describe("burnFrom", function () {
    const burnAmount = ethers.parseUnits("300", 18);

    beforeEach(async function () {
      // Transfer some tokens to alice so she has a balance to burn from
      await token.transfer(alice.address, ethers.parseUnits("1000", 18));
      // Alice approves bob to burn on her behalf
      await token.connect(alice).approve(bob.address, burnAmount);
    });

    it("burns tokens from the approved account", async function () {
      const aliceBefore = await token.balanceOf(alice.address);
      await token.connect(bob).burnFrom(alice.address, burnAmount);
      expect(await token.balanceOf(alice.address)).to.equal(
        aliceBefore - burnAmount
      );
    });

    it("reduces totalSupply", async function () {
      const supplyBefore = await token.totalSupply();
      await token.connect(bob).burnFrom(alice.address, burnAmount);
      expect(await token.totalSupply()).to.equal(supplyBefore - burnAmount);
    });

    it("consumes the allowance", async function () {
      await token.connect(bob).burnFrom(alice.address, burnAmount);
      expect(
        await token.allowance(alice.address, bob.address)
      ).to.equal(0);
    });

    it("emits TokensBurned with the token holder's address", async function () {
      const tx = await token.connect(bob).burnFrom(alice.address, burnAmount);
      const receipt = await tx.wait();
      
      const event = findEvent(receipt, token, "TokensBurned");
      
      expect(event).to.exist;
      expect(event.args[0]).to.equal(alice.address);
      expect(event.args[1]).to.equal(burnAmount);
    });

    it("reverts when amount is 0", async function () {
      await expectRevertedWithCustomError(
        token.connect(bob).burnFrom(alice.address, 0),
        token,
        "ZeroBurnAmount"
      );
    });

    it("reverts when allowance is insufficient", async function () {
      await expectReverted(
        token.connect(bob).burnFrom(alice.address, burnAmount + 1n)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Immutability — no further minting possible
  // ---------------------------------------------------------------------------
  describe("Immutability", function () {
    it("has no mint function callable by anyone", async function () {
      expect(typeof token.mint).to.equal("undefined");
    });

    it("supply only decreases after burns", async function () {
      const before = await token.totalSupply();
      await token.burnTokens(ethers.parseUnits("1", 18));
      expect(await token.totalSupply()).to.be.lessThan(before);
    });
  });
});
