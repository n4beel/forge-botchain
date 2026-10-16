// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {ForgedToken} from "../src/ForgedToken.sol";

/// The factory is the product, but this is the thing people end up holding. An ERC-20 that is
/// subtly wrong is worse than no token, so the mechanics get their own suite.
contract ForgedTokenTest is Test {
  ForgedToken internal token;

  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);
  address internal carol = address(0xCA201);

  uint256 internal constant SUPPLY = 1_000_000e18;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  function setUp() public {
    token = new ForgedToken("Acme Token", "ACME", 18, SUPPLY, alice);
  }

  // --- transfer --------------------------------------------------------------------------------

  function test_Transfer() public {
    vm.prank(alice);
    assertTrue(token.transfer(bob, 100e18));

    assertEq(token.balanceOf(alice), SUPPLY - 100e18);
    assertEq(token.balanceOf(bob), 100e18);
  }

  function test_TransferEmits() public {
    vm.expectEmit(true, true, false, true, address(token));
    emit Transfer(alice, bob, 100e18);
    vm.prank(alice);
    token.transfer(bob, 100e18);
  }

  function test_TransferRevertsWhenShort() public {
    vm.expectRevert(abi.encodeWithSelector(ForgedToken.InsufficientBalance.selector, 0, 1));
    vm.prank(bob);
    token.transfer(alice, 1);
  }

  /// ERC-20 permits a transfer to address(0); this token refuses. A fixed supply that can silently
  /// shrink through a mistyped address is a worse surprise than a reverted transfer.
  function test_TransferToZeroReverts() public {
    vm.expectRevert(ForgedToken.ZeroAddress.selector);
    vm.prank(alice);
    token.transfer(address(0), 1);
  }

  function test_SelfTransferDoesNotCreateTokens() public {
    // The classic bug: reading the balance twice and writing it back, so a self-transfer mints.
    vm.prank(alice);
    token.transfer(alice, 500e18);
    assertEq(token.balanceOf(alice), SUPPLY, "self-transfer changed the balance");
  }

  function test_ZeroValueTransferIsAllowed() public {
    // Some integrations use a zero-value transfer as a ping. ERC-20 requires it to succeed.
    vm.prank(bob);
    assertTrue(token.transfer(alice, 0));
  }

  // --- approve / transferFrom ------------------------------------------------------------------

  function test_ApproveAndTransferFrom() public {
    vm.prank(alice);
    token.approve(bob, 100e18);
    assertEq(token.allowance(alice, bob), 100e18);

    vm.prank(bob);
    token.transferFrom(alice, carol, 40e18);

    assertEq(token.balanceOf(carol), 40e18);
    assertEq(token.allowance(alice, bob), 60e18, "allowance decremented");
  }

  function test_TransferFromRevertsBeyondAllowance() public {
    vm.prank(alice);
    token.approve(bob, 10e18);

    vm.expectRevert(abi.encodeWithSelector(ForgedToken.InsufficientAllowance.selector, 10e18, 11e18));
    vm.prank(bob);
    token.transferFrom(alice, carol, 11e18);
  }

  /// The infinite-allowance convention: max uint is "unlimited" and is never decremented, which
  /// saves every spender an SSTORE per transfer. Widely relied on by routers and vaults.
  function test_InfiniteAllowanceIsNotDecremented() public {
    vm.prank(alice);
    token.approve(bob, type(uint256).max);

    vm.prank(bob);
    token.transferFrom(alice, carol, 100e18);

    assertEq(token.allowance(alice, bob), type(uint256).max, "infinite allowance was spent");
  }

  function test_ApproveEmits() public {
    vm.expectEmit(true, true, false, true, address(token));
    emit Approval(alice, bob, 7);
    vm.prank(alice);
    token.approve(bob, 7);
  }

  // --- what this token deliberately cannot do ---------------------------------------------------

  /// The product claim is that a forged token cannot be inflated, frozen or seized by anyone,
  /// including its creator. That is only true if no such function exists, so this asserts the
  /// supply is immutable through the only paths there are.
  function test_SupplyIsFixedForever() public {
    uint256 before = token.totalSupply();

    vm.prank(alice);
    token.transfer(bob, 1000e18);
    vm.prank(bob);
    token.transfer(carol, 500e18);

    assertEq(token.totalSupply(), before, "supply moved");
    assertEq(
      token.balanceOf(alice) + token.balanceOf(bob) + token.balanceOf(carol),
      before,
      "balances no longer sum to the supply"
    );
  }

  // --- properties ------------------------------------------------------------------------------

  function testFuzz_TransferConservesTheSupply(uint256 amount, address to) public {
    vm.assume(to != address(0) && to != alice);
    amount = bound(amount, 0, SUPPLY);

    vm.prank(alice);
    token.transfer(to, amount);

    assertEq(token.balanceOf(alice) + token.balanceOf(to), SUPPLY);
    assertEq(token.totalSupply(), SUPPLY);
  }

  function testFuzz_CannotSpendMoreThanTheBalance(uint256 amount) public {
    amount = bound(amount, SUPPLY + 1, type(uint256).max);

    vm.expectRevert();
    vm.prank(alice);
    token.transfer(bob, amount);
  }
}
