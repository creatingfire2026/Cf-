// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title ERC20_Token_Sample
 * @notice Production-ready ERC20 token with burn capability.
 * @dev Mints 100 billion tokens to the deployer at construction.
 *      No owner, no admin functions, immutable after deployment.
 *
 *      Inherited from OpenZeppelin:
 *        - transfer / transferFrom
 *        - approve
 *        - balanceOf / allowance / totalSupply
 *        - burn / burnFrom  (ERC20Burnable, extended below)
 */
contract ERC20_Token_Sample is ERC20, ERC20Burnable {
    // =========================================================================
    // Constants
    // =========================================================================

    /// @notice 100 billion tokens (18 decimals).
    uint256 public constant INITIAL_SUPPLY = 100_000_000_000 * 10 ** 18;

    // =========================================================================
    // Errors
    // =========================================================================

    /// @notice Thrown when a burn amount of zero is supplied.
    error ZeroBurnAmount();

    // =========================================================================
    // Events
    // =========================================================================

    /// @notice Emitted whenever tokens are permanently removed from supply.
    /// @param burner  Address whose tokens were burned.
    /// @param amount  Quantity of tokens burned.
    event TokensBurned(address indexed burner, uint256 amount);

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Deploys the token and mints the entire initial supply to the
     *         deployer. No further minting is ever possible.
     */
    constructor() ERC20("ERC20 Token Sample1", "SAMPLE1") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // =========================================================================
    // Burn helpers
    // =========================================================================

    /**
     * @notice Burns `amount` tokens from the caller's balance.
     * @param amount Number of tokens to burn. Must be greater than zero.
     */
    function burnTokens(uint256 amount) external {
        if (amount == 0) revert ZeroBurnAmount();
        burn(amount); // ERC20Burnable.burn handles balance check & Transfer event
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Burns `amount` tokens from `account` using the caller's allowance.
     * @dev    Overrides ERC20Burnable.burnFrom solely to emit TokensBurned.
     *         All allowance and balance checks are delegated to the parent.
     * @param account Address whose tokens will be burned.
     * @param amount  Number of tokens to burn. Must be greater than zero.
     */
    function burnFrom(address account, uint256 amount) public override {
        if (amount == 0) revert ZeroBurnAmount();
        super.burnFrom(account, amount); // handles _spendAllowance + _burn
        emit TokensBurned(account, amount);
    }
}
