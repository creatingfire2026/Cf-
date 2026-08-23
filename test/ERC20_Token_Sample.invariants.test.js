/**
 * Invariant / property / negative tests for ERC20_Token_Sample.
 *
 * These tests complement the happy-path suite and verify:
 *   - Supply conservation after any sequence of transfers or burns
 *   - Allowance consumption correctness (partial and exact)
 *   - Zero-value rejection for every operation that forbids it
 *   - Authorization: burnFrom rejects callers without sufficient allowance
 *   - Burn behaviour: direct `burn()` path also conserves supply and is
 *     reachable because ERC20Burnable is inherited.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20_Token_Sample – invariants & negative tests", function () {
  let token;
  let deployer, alice, bob, carol;

  const INITIAL_SUPPLY = ethers.parseUnits("100000000000", 18);
  const ONE = ethers.parseUnits("1", 18);

  beforeEach(async function () {
    [deployer, alice, bob, carol] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ERC20_Token_Sample");
    token = await Token.deploy();
  });

  // -------------------------------------------------------------------------
  // Supply conservation
  // -------------------------------------------------------------------------
  describe("Supply conservation invariant", function () {
    it("totalSupply = sum of all balances after transfers", async function () {
      // Transfer to alice and bob
      await token.transfer(alice.address, ethers.parseUnits("1000", 18));
      await token.transfer(bob.address, ethers.parseUnits("2500", 18));

      const deployerBal = await token.balanceOf(deployer.address);
      const aliceBal = await token.balanceOf(alice.address);
      const bobBal = await token.balanceOf(bob.address);
      const carolBal = await token.balanceOf(carol.address);

      const supply = await token.totalSupply();
      expect(deployerBal + aliceBal + bobBal + carolBal).to.equal(supply);
    });

    it("totalSupply = INITIAL_SUPPLY – sum of all burned amounts (burnTokens)", async function () {
      const burn1 = ethers.parseUnits("1000", 18);
      const burn2 = ethers.parseUnits("500", 18);

      await token.burnTokens(burn1);
      await token.transfer(alice.address, ethers.parseUnits("2000", 18));
      await token.connect(alice).burnTokens(burn2);

      const expected = INITIAL_SUPPLY - burn1 - burn2;
      expect(await token.totalSupply()).to.equal(expected);
    });

    it("totalSupply = INITIAL_SUPPLY – burned amount after burnFrom", async function () {
      const amount = ethers.parseUnits("750", 18);
      await token.transfer(alice.address, amount);
      await token.connect(alice).approve(bob.address, amount);
      await token.connect(bob).burnFrom(alice.address, amount);

      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
    });

    it("totalSupply is unchanged after a pure transfer (no burn)", async function () {
      const before = await token.totalSupply();
      await token.transfer(alice.address, ethers.parseUnits("9999", 18));
      await token.connect(alice).transfer(bob.address, ethers.parseUnits("1234", 18));
      expect(await token.totalSupply()).to.equal(before);
    });

    it("direct ERC20Burnable.burn() also reduces totalSupply correctly", async function () {
      const amount = ethers.parseUnits("300", 18);
      // burn() is the raw ERC20Burnable method; it does NOT emit TokensBurned
      await token["burn(uint256)"](amount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
    });
  });

  // -------------------------------------------------------------------------
  // Allowance consumption
  // -------------------------------------------------------------------------
  describe("Allowance consumption", function () {
    it("partial burnFrom reduces allowance by exactly the burned amount", async function () {
      const approved = ethers.parseUnits("1000", 18);
      const burned = ethers.parseUnits("400", 18);
      await token.transfer(alice.address, approved);
      await token.connect(alice).approve(bob.address, approved);

      await token.connect(bob).burnFrom(alice.address, burned);

      expect(await token.allowance(alice.address, bob.address)).to.equal(
        approved - burned
      );
    });

    it("exact burnFrom zeroes the allowance", async function () {
      const amount = ethers.parseUnits("200", 18);
      await token.transfer(alice.address, amount);
      await token.connect(alice).approve(bob.address, amount);

      await token.connect(bob).burnFrom(alice.address, amount);

      expect(await token.allowance(alice.address, bob.address)).to.equal(0n);
    });

    it("approve overwrite replaces allowance atomically", async function () {
      await token.approve(alice.address, ethers.parseUnits("100", 18));
      await token.approve(alice.address, ethers.parseUnits("50", 18));
      expect(await token.allowance(deployer.address, alice.address)).to.equal(
        ethers.parseUnits("50", 18)
      );
    });

    it("partial transferFrom reduces allowance by exactly the transferred amount", async function () {
      const approved = ethers.parseUnits("500", 18);
      const transferred = ethers.parseUnits("200", 18);
      await token.approve(alice.address, approved);

      await token.connect(alice).transferFrom(deployer.address, bob.address, transferred);

      expect(await token.allowance(deployer.address, alice.address)).to.equal(
        approved - transferred
      );
    });
  });

  // -------------------------------------------------------------------------
  // Zero-value rejection
  // -------------------------------------------------------------------------
  describe("Zero-value rejection", function () {
    it("burnTokens(0) reverts with ZeroBurnAmount", async function () {
      await expect(token.burnTokens(0n)).to.be.revertedWithCustomError(
        token,
        "ZeroBurnAmount"
      );
    });

    it("burnFrom(account, 0) reverts with ZeroBurnAmount", async function () {
      await token.transfer(alice.address, ONE);
      await token.connect(alice).approve(bob.address, ONE);
      await expect(
        token.connect(bob).burnFrom(alice.address, 0n)
      ).to.be.revertedWithCustomError(token, "ZeroBurnAmount");
    });

    it("transfer(to, 0) is permitted by ERC-20 standard and leaves balances unchanged", async function () {
      // ERC-20 standard allows zero-value transfers; OZ does not revert them.
      const before = await token.balanceOf(alice.address);
      await expect(token.transfer(alice.address, 0n)).to.not.be.reverted;
      expect(await token.balanceOf(alice.address)).to.equal(before);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization / access control
  // -------------------------------------------------------------------------
  describe("Authorization", function () {
    it("burnFrom reverts when the caller has no allowance", async function () {
      await token.transfer(alice.address, ONE);
      // bob has zero allowance
      await expect(
        token.connect(bob).burnFrom(alice.address, ONE)
      ).to.be.reverted;
    });

    it("burnFrom reverts when caller's allowance is smaller than amount", async function () {
      const small = ethers.parseUnits("1", 18);
      const large = ethers.parseUnits("2", 18);
      await token.transfer(alice.address, large);
      await token.connect(alice).approve(bob.address, small);
      await expect(
        token.connect(bob).burnFrom(alice.address, large)
      ).to.be.reverted;
    });

    it("transferFrom reverts for an unapproved caller", async function () {
      await expect(
        token.connect(carol).transferFrom(deployer.address, bob.address, ONE)
      ).to.be.reverted;
    });

    it("any account can call burnTokens on its own tokens", async function () {
      await token.transfer(alice.address, ONE);
      await expect(token.connect(alice).burnTokens(ONE)).to.not.be.reverted;
    });
  });

  // -------------------------------------------------------------------------
  // Burn behaviour consistency
  // -------------------------------------------------------------------------
  describe("Burn behaviour consistency", function () {
    it("burnTokens emits both TokensBurned and Transfer(to=0)", async function () {
      const amount = ethers.parseUnits("50", 18);
      const tx = token.burnTokens(amount);
      await expect(tx)
        .to.emit(token, "TokensBurned")
        .withArgs(deployer.address, amount);
      await expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, ethers.ZeroAddress, amount);
    });

    it("burnFrom emits TokensBurned with the token-holder (not the caller) as burner", async function () {
      const amount = ethers.parseUnits("100", 18);
      await token.transfer(alice.address, amount);
      await token.connect(alice).approve(bob.address, amount);
      await expect(token.connect(bob).burnFrom(alice.address, amount))
        .to.emit(token, "TokensBurned")
        .withArgs(alice.address, amount); // alice, not bob
    });

    it("direct burn() (ERC20Burnable) does NOT emit TokensBurned", async function () {
      const amount = ethers.parseUnits("10", 18);
      const tx = await token["burn(uint256)"](amount);
      const receipt = await tx.wait();
      const tokensBurnedTopic = token.interface.getEvent("TokensBurned").topicHash;
      const hasBurnedEvent = receipt.logs.some(
        (log) => log.topics[0] === tokensBurnedTopic
      );
      expect(hasBurnedEvent).to.be.false;
    });

    it("consecutive burns correctly reduce totalSupply", async function () {
      const burns = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("200", 18),
        ethers.parseUnits("300", 18),
      ];
      let expectedSupply = INITIAL_SUPPLY;
      for (const b of burns) {
        await token.burnTokens(b);
        expectedSupply -= b;
        expect(await token.totalSupply()).to.equal(expectedSupply);
      }
    });

    it("burning entire supply reduces totalSupply to zero", async function () {
      await token.burnTokens(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(0n);
      expect(await token.balanceOf(deployer.address)).to.equal(0n);
    });
  });
});
