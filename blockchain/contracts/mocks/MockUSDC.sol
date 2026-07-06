// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @author CROO Hub
/// @notice Test-only 6-decimal ERC20 standing in for USDC on local networks and Base Sepolia,
///         where no canonical, freely-mintable USDC is available. NOT for production use - the
///         real deployment must point {EscrowCommerce} at Base's official USDC contract.
/// @dev Owner-gated `mint` lets deploy/test scripts fund buyer accounts on demand. Anyone may call
///      `faucet` to self-mint a small fixed amount, mirroring typical testnet faucet UX.
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    /// @notice Amount minted to the caller per {faucet} call (1,000 USDC).
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** DECIMALS;

    constructor(address initialOwner) ERC20("USD Coin (Mock)", "USDC") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Mints `amount` tokens to `to`. Restricted to the contract owner (deployer/faucet script).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Self-service faucet: mints a fixed {FAUCET_AMOUNT} to the caller for testing.
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
