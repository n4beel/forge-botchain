// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ForgedToken} from "./ForgedToken.sol";

/// @title TokenFactory
/// @notice Deploys a fixed-supply ERC-20 in one transaction.
///
/// @dev The factory stores nothing. Every token it creates is announced in a log indexed by
/// creator, and the frontend reads those logs from the factory's deploy block — which is why the
/// deployment config carries that block and the UI refuses to run without it. An on-chain array of
/// every token ever made would cost each user an SSTORE to append to, for a list only the UI reads.
contract TokenFactory {
  /// @param token The newly deployed token.
  /// @param creator Who asked for it, and who holds the entire supply.
  event TokenForged(
    address indexed token,
    address indexed creator,
    string name,
    string symbol,
    uint8 decimals,
    uint256 supply
  );

  error EmptyName();
  error EmptySymbol();
  error NameTooLong(uint256 length, uint256 max);
  error SymbolTooLong(uint256 length, uint256 max);
  error ZeroSupply();
  error DecimalsTooHigh(uint8 decimals, uint8 max);

  uint256 public constant MAX_NAME_BYTES = 64;
  uint256 public constant MAX_SYMBOL_BYTES = 16;
  /// @dev 18 is the ERC-20 convention and what every wallet and explorer assumes when formatting.
  /// Above it, `totalSupply` for any meaningful number of whole tokens starts to crowd uint256.
  uint8 public constant MAX_DECIMALS = 18;

  /// @notice Deploy a token. The caller receives the entire supply.
  /// @param supply The total supply in base units, so 1000 tokens at 18 decimals is 1000e18. The
  /// UI does this multiplication; the contract takes the raw number so it never has to assume.
  function forge(string calldata name, string calldata symbol, uint8 decimals, uint256 supply)
    external
    returns (address token)
  {
    uint256 nameLength = bytes(name).length;
    uint256 symbolLength = bytes(symbol).length;

    if (nameLength == 0) revert EmptyName();
    if (symbolLength == 0) revert EmptySymbol();
    if (nameLength > MAX_NAME_BYTES) revert NameTooLong(nameLength, MAX_NAME_BYTES);
    if (symbolLength > MAX_SYMBOL_BYTES) revert SymbolTooLong(symbolLength, MAX_SYMBOL_BYTES);
    if (supply == 0) revert ZeroSupply();
    if (decimals > MAX_DECIMALS) revert DecimalsTooHigh(decimals, MAX_DECIMALS);

    token = address(new ForgedToken(name, symbol, decimals, supply, msg.sender));
    emit TokenForged(token, msg.sender, name, symbol, decimals, supply);
  }
}
