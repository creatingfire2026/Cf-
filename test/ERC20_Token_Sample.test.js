const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20_Token_Sample", function () {
  let token;
  let deployer, recipient, alice, bob;

  const INITIAL_SUPPLY = ethers.parseUnits("100000000000", 18);

  beforeEach(async function () {
    [deployer, recipient, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory(
      "ERC20_Token_Sample",
      deployer
    );
    token = await Token.deploy(recipient.address);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets the correct name and symbol", async function () {
      expect(await token.name()).to.equal("ERC20 Token Sample1");
      expect(await token.symbol()).to.equal("SAMPLE1");
    });

    it("uses 18 decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("mints INITIAL_SUPPLY to the explicit recipient", async function () {
      expect(await token.balanceOf(recipient.address)).to.equal(INITIAL_SUPPLY);
    });

    it("does not mint to the deployer", async function () {
      expect(await token.balanceOf(deployer.address)).to.equal(0);
    });

    it("sets totalSupply to INITIAL_SUPPLY", async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });

    it("rejects the zero-address recipient", async function () {
      const Token = await ethers.getContractFactory("ERC20_Token_Sample");
      await expect(Token.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        Token,
        "InvalidInitialRecipient"
      );
    });

    it("emits the standard mint Transfer event for the recipient", async function () {
      const Token = await ethers.getContractFactory("ERC20_Token_Sample");
      await expect(Token.deploy(recipient.address))
        .to.emit(Token, "Transfer")
        .withArgs(ethers.ZeroAddress, recipient.address, INITIAL_SUPPLY);
    });
  });

  describe("Transfer", function () {
    it("transfers tokens from the explicit recipient", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.connect(recipient).transfer(alice.address, amount);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.balanceOf(recipient.address)).to.equal(
        INITIAL_SUPPLY - amount
      );
    });

    it("reverts when sender has insufficient balance", async function () {
      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
      ).to.be.reverted;
    });

    it("emits a Transfer event", async function () {
      const amount = ethers.parseUnits("500", 18);
      await expect(token.connect(recipient).transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(recipient.address, alice.address, amount);
    });
  });

  describe("Allowance", function () {
    it("sets and reads allowance from the recipient", async function () {
      const amount = ethers.parseUnits("200", 18);
      await token.connect(recipient).approve(alice.address, amount);

      expect(
        await token.allowance(recipient.address, alice.address)
      ).to.equal(amount);
    });

    it("allows transferFrom within allowance", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.connect(recipient).approve(alice.address, amount);
      await token
        .connect(alice)
        .transferFrom(recipient.address, bob.address, amount);

      expect(await token.balanceOf(bob.address)).to.equal(amount);
    });

    it("reverts transferFrom when allowance is exceeded", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.connect(recipient).approve(alice.address, amount);

      await expect(
        token
          .connect(alice)
          .transferFrom(recipient.address, bob.address, amount + 1n)
      ).to.be.reverted;
    });
  });

  describe("burnTokens", function () {
    it("reduces the recipient balance", async function () {
      const burnAmount = ethers.parseUnits("1000", 18);
      await token.connect(recipient).burnTokens(burnAmount);

      expect(await token.balanceOf(recipient.address)).to.equal(
        INITIAL_SUPPLY - burnAmount
      );
    });

    it("reduces totalSupply", async function () {
      const burnAmount = ethers.parseUnits("500", 18);
      await token.connect(recipient).burnTokens(burnAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("emits TokensBurned", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      await expect(token.connect(recipient).burnTokens(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(recipient.address, burnAmount);
    });

    it("emits the standard Transfer-to-zero event", async function () {
      const burnAmount = ethers.parseUnits("100", 18);
      await expect(token.connect(recipient).burnTokens(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(recipient.address, ethers.ZeroAddress, burnAmount);
    });

    it("reverts when amount is zero", async function () {
      await expect(
        token.connect(recipient).burnTokens(0)
      ).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
    });

    it("reverts when caller has insufficient balance", async function () {
      await expect(token.connect(alice).burnTokens(1)).to.be.reverted;
    });
  });

  describe("burnFrom", function () {
    const burnAmount = ethers.parseUnits("300", 18);

    beforeEach(async function () {
      await token
        .connect(recipient)
        .transfer(alice.address, ethers.parseUnits("1000", 18));
      await token.connect(alice).approve(bob.address, burnAmount);
    });

    it("burns tokens from the approved account", async function () {
      const aliceBefore = await token.balanceOf(alice.address);
      await token.connect(bob).burnFrom(alice.address, burnAmount);

      expect(await token.balanceOf(alice.address)).to.equal(
        aliceBefore - burnAmount
      );
    });

    it("reduces totalSupply and consumes allowance", async function () {
      const supplyBefore = await token.totalSupply();
      await token.connect(bob).burnFrom(alice.address, burnAmount);

      expect(await token.totalSupply()).to.equal(supplyBefore - burnAmount);
      expect(await token.allowance(alice.address, bob.address)).to.equal(0);
    });

    it("emits TokensBurned for the token holder", async function () {
      await expect(token.connect(bob).burnFrom(alice.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(alice.address, burnAmount);
    });

    it("reverts when amount is zero", async function () {
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

  describe("Immutability", function () {
    it("has no public mint function", async function () {
      expect(typeof token.mint).to.equal("undefined");
    });

    it("supply only decreases after burns", async function () {
      const before = await token.totalSupply();
      await token.connect(recipient).burnTokens(ethers.parseUnits("1", 18));
      expect(await token.totalSupply()).to.be.lessThan(before);
    });
  });
});
