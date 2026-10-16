// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title ForgedToken
/// @notice A fixed-supply ERC-20. The entire supply is minted to the creator at construction and
/// no more can ever exist.
///
/// @dev Written out rather than inherited from OpenZeppelin, for two reasons. The deployed
/// bytecode is what a user pays for on a chain with no faucet, and this is the whole token in
/// about a hundred lines. And a reviewer judging a token-deployer should be able to read the token
/// it deploys in one sitting, without resolving an import tree.
///
/// Deliberately absent: minting, burning, pausing, blocklists, owner privileges, upgradeability.
/// A token from here cannot be inflated, frozen or seized by anyone, including whoever deployed
/// it. That is the product. Anything else would need to be said out loud, and this app does not
/// say it.
contract ForgedToken {
  string public name;
  string public symbol;
  uint8 public immutable decimals;
  uint256 public immutable totalSupply;

  mapping(address account => uint256) public balanceOf;
  mapping(address owner => mapping(address spender => uint256)) public allowance;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  error InsufficientBalance(uint256 available, uint256 required);
  error InsufficientAllowance(uint256 available, uint256 required);
  error ZeroAddress();

  constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 supply_, address owner_) {
    name = name_;
    symbol = symbol_;
    decimals = decimals_;
    totalSupply = supply_;
    balanceOf[owner_] = supply_;

    // Minting is a transfer from the zero address, per ERC-20. Indexers rely on this to see the
    // supply come into existence rather than appear from nowhere.
    emit Transfer(address(0), owner_, supply_);
  }

  function transfer(address to, uint256 value) external returns (bool) {
    _transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(address from, address to, uint256 value) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    // The infinite-allowance convention: `type(uint256).max` is treated as "unlimited" and is not
    // decremented, which saves every spender an SSTORE on every transfer. Widely relied upon.
    if (allowed != type(uint256).max) {
      if (allowed < value) revert InsufficientAllowance(allowed, value);
      unchecked {
        allowance[from][msg.sender] = allowed - value;
      }
    }
    _transfer(from, to, value);
    return true;
  }

  function approve(address spender, uint256 value) external returns (bool) {
    allowance[msg.sender][spender] = value;
    emit Approval(msg.sender, spender, value);
    return true;
  }

  function _transfer(address from, address to, uint256 value) private {
    // Transferring to address(0) is how tokens get burned by accident. ERC-20 does not forbid it;
    // this token does, because a fixed supply that can silently shrink is a worse surprise than a
    // reverted transfer.
    if (to == address(0)) revert ZeroAddress();

    uint256 balance = balanceOf[from];
    if (balance < value) revert InsufficientBalance(balance, value);

    unchecked {
      // Both safe: `balance >= value` was just checked, and no balance can exceed totalSupply,
      // so the credit cannot overflow.
      balanceOf[from] = balance - value;
      balanceOf[to] += value;
    }

    emit Transfer(from, to, value);
  }
}
