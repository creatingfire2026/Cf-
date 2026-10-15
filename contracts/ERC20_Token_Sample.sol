// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title ERC20_Token_Sample
 * @notice ERC20 token with burn capability and an explicit initial recipient.
 * @dev Mints 100 billion tokens once at construction. No owner, admin, or later minting.
 */
contract ERC20_Token_Sample is ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 100_000_000_000 * 10 ** 18;

    error InvalidInitialRecipient();
    error ZeroBurnAmount();

    event TokensBurned(address indexed burner, uint256 amount);

    /**
     * @param initialRecipient Address that receives the complete initial supply.
     */
    constructor(address initialRecipient) ERC20("ERC20 Token Sample1", "SAMPLE1") {
        if (initialRecipient == address(0)) revert InvalidInitialRecipient();
        _mint(initialRecipient, INITIAL_SUPPLY);
    }

    function burnTokens(uint256 amount) external {
        if (amount == 0) revert ZeroBurnAmount();
        burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        if (amount == 0) revert ZeroBurnAmount();
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }
}
