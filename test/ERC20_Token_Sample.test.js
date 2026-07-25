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
    it("sets the token metadata", async function () {
      expect(await token.name()).to.equal("ERC20 Token Sample1");
      expect(await token.symbol()).to.equal("SAMPLE1");
      expect(await token.decimals()).to.equal(18);
    });

    it("mints the complete supply to the explicit recipient", async function () {
      expect(await token.balanceOf(recipient.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
    });

    it("does not mint to the deployer", async function () {
      expect(await token.balanceOf(deployer.address)).to.equal(0);
    });

    it("rejects the zero-address recipient", async function () {
      const Token = await ethers.getContractFactory("ERC20_Token_Sample");
      await expect(Token.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        Token,
        "InvalidInitialRecipient"
      );
    });
  });

  describe("Transfers", function () {
    it("transfers from the explicit recipient", async function () {
      const amount = ethers.parseUnits("1000", 18);
      const recipientAddr = await recipient.getAddress();
      const aliceAddr = await alice.getAddress();
      await expect(token.connect(recipient).transfer(aliceAddr, amount))
        .to.emit(token, "Transfer")
        .withArgs(recipientAddr, aliceAddr, amount);

      expect(await token.balanceOf(aliceAddr)).to.equal(amount);
      expect(await token.balanceOf(recipientAddr)).to.equal(
        INITIAL_SUPPLY - amount
      );
    });

    it("reverts for an insufficient balance", async function () {
      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
      ).to.be.reverted;
    });
  });

  describe("Allowances", function () {
    it("supports approve and transferFrom", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.connect(recipient).approve(alice.address, amount);
      expect(
        await token.allowance(recipient.address, alice.address)
      ).to.equal(amount);

      await token
        .connect(alice)
        .transferFrom(recipient.address, bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
    });

    it("reverts when allowance is exceeded", async function () {
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
    it("burns from the caller and reduces supply", async function () {
      const amount = ethers.parseUnits("500", 18);
     const recipientAddr = await recipient.getAddress();
     await expect(token.connect(recipient).burnTokens(amount))
       .to.emit(token, "TokensBurned")
       .withArgs(recipientAddr, amount)
       .and.to.emit(token, "Transfer")
       .withArgs(recipientAddr, ethers.ZeroAddress, amount);

     expect(await token.balanceOf(recipientAddr)).to.equal(
       INITIAL_SUPPLY - amount
     );
     expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
   });

    it("rejects zero and insufficient burn amounts", async function () {
      await expect(
        token.connect(recipient).burnTokens(0)
      ).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
      await expect(token.connect(alice).burnTokens(1)).to.be.reverted;
    });
  });

  describe("burnFrom", function () {
    const amount = ethers.parseUnits("300", 18);

    beforeEach(async function () {
      await token
        .connect(recipient)
        .transfer(alice.address, ethers.parseUnits("1000", 18));
      await token.connect(alice).approve(bob.address, amount);
    });

    it("burns approved tokens and consumes allowance", async function () {
      const supplyBefore = await token.totalSupply();
      const aliceAddr = await alice.getAddress();
      await expect(token.connect(bob).burnFrom(aliceAddr, amount))
        .to.emit(token, "TokensBurned")
        .withArgs(aliceAddr, amount);

      expect(await token.allowance(aliceAddr, await bob.getAddress())).to.equal(0);
      expect(await token.totalSupply()).to.equal(supplyBefore - amount);
    });

    it("rejects zero and excessive allowance burns", async function () {
      await expect(
        token.connect(bob).burnFrom(alice.address, 0)
      ).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
      await expect(
        token.connect(bob).burnFrom(alice.address, amount + 1n)
      ).to.be.reverted;
    });
  });

  describe("Immutability", function () {
    it("exposes no public mint function", async function () {
      expect(typeof token.mint).to.equal("undefined");
    });
  });
});
