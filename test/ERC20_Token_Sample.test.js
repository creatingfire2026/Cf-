const { expect } = require("chai");
const { ethers } = require("hardhat");

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
      await expect(
        token.connect(alice).transfer(bob.address, amount)
      ).to.be.reverted;
    });

    it("emits a Transfer event", async function () {
      const amount = ethers.parseUnits("500", 18);
      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, alice.address, amount);
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
      await expect(
        token
          .connect(alice)
          .transferFrom(deployer.address, bob.address, amount + 1n)
      ).to.be.reverted;
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
      await expect(token.burnTokens(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(deployer.address, burnAmount);
    });

    it("also emits the standard Transfer-to-zero event", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      await expect(token.burnTokens(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, ethers.ZeroAddress, burnAmount);
    });

    it("reverts when amount is 0", async function () {
      await expect(token.burnTokens(0)).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
    });

    it("reverts when caller has insufficient balance", async function () {
      const tooMuch = INITIAL_SUPPLY + 1n;
      await expect(token.burnTokens(tooMuch)).to.be.reverted;
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
      await expect(token.connect(bob).burnFrom(alice.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(alice.address, burnAmount);
    });

    it("reverts when amount is 0", async function () {
      await expect(
        token.connect(bob).burnFrom(alice.address, 0)
      ).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
    });

    it("reverts when allowance is insufficient", async function () {
      await expect(
        token.connect(bob).burnFrom(alice.address, burnAmount + 1n)
      ).to.be.reverted;
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
