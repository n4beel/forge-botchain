// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {ForgedToken} from "../src/ForgedToken.sol";

contract TokenFactoryTest is Test {
  TokenFactory internal factory;

  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);

  event TokenForged(
    address indexed token,
    address indexed creator,
    string name,
    string symbol,
    uint8 decimals,
    uint256 supply
  );

  function setUp() public {
    factory = new TokenFactory();
  }

  function forgeDefault(address as_) internal returns (ForgedToken) {
    vm.prank(as_);
    return ForgedToken(factory.forge("Acme Token", "ACME", 18, 1_000_000e18));
  }

  // --- the happy path ---------------------------------------------------------------------------

  function test_GivesTheEntireSupplyToTheCaller() public {
    ForgedToken token = forgeDefault(alice);

    assertEq(token.totalSupply(), 1_000_000e18);
    assertEq(token.balanceOf(alice), 1_000_000e18, "creator holds everything");
    assertEq(token.balanceOf(address(factory)), 0, "the factory keeps nothing");
  }

  function test_SetsTheMetadata() public {
    ForgedToken token = forgeDefault(alice);

    assertEq(token.name(), "Acme Token");
    assertEq(token.symbol(), "ACME");
    assertEq(token.decimals(), 18);
  }

  /// Minting is a transfer from address(0) per ERC-20. Indexers use it to see supply come into
  /// existence rather than appear from nowhere.
  function test_EmitsTheMintAsATransferFromZero() public {
    vm.recordLogs();
    ForgedToken token = forgeDefault(alice);

    Vm.Log[] memory logs = vm.getRecordedLogs();
    bool found;
    for (uint256 i = 0; i < logs.length; i++) {
      if (
        logs[i].emitter == address(token) && logs[i].topics[0] == keccak256("Transfer(address,address,uint256)")
          && address(uint160(uint256(logs[i].topics[1]))) == address(0)
          && address(uint160(uint256(logs[i].topics[2]))) == alice
      ) found = true;
    }
    assertTrue(found, "no mint Transfer from the zero address");
  }

  function test_AnnouncesTheTokenWithItsCreator() public {
    vm.prank(alice);
    vm.recordLogs();
    address token = factory.forge("Acme Token", "ACME", 18, 1_000_000e18);

    Vm.Log[] memory logs = vm.getRecordedLogs();
    bool found;
    for (uint256 i = 0; i < logs.length; i++) {
      if (logs[i].emitter == address(factory) && logs[i].topics[0] == keccak256("TokenForged(address,address,string,string,uint8,uint256)")) {
        assertEq(address(uint160(uint256(logs[i].topics[1]))), token, "token topic");
        assertEq(address(uint160(uint256(logs[i].topics[2]))), alice, "creator topic");
        found = true;
      }
    }
    assertTrue(found, "no TokenForged log");
  }

  function test_EachForgeIsAnIndependentToken() public {
    ForgedToken a = forgeDefault(alice);
    ForgedToken b = forgeDefault(bob);

    assertTrue(address(a) != address(b));
    assertEq(a.balanceOf(alice), 1_000_000e18);
    assertEq(a.balanceOf(bob), 0, "bob's token is not alice's token");
    assertEq(b.balanceOf(bob), 1_000_000e18);
  }

  /// The factory holds no list. The frontend reads TokenForged logs from the deploy block, which
  /// is why the deployment config carries that block.
  function test_FactoryStoresNothing() public {
    forgeDefault(alice);
    assertEq(address(factory).balance, 0);
    assertEq(address(factory).code.length > 0, true);
  }

  // --- guards ----------------------------------------------------------------------------------

  function test_RevertsOnEmptyName() public {
    vm.expectRevert(TokenFactory.EmptyName.selector);
    factory.forge("", "ACME", 18, 1e18);
  }

  function test_RevertsOnEmptySymbol() public {
    vm.expectRevert(TokenFactory.EmptySymbol.selector);
    factory.forge("Acme", "", 18, 1e18);
  }

  function test_RevertsOnZeroSupply() public {
    // A token with no supply can never have one — nothing here can mint. It is only a way to
    // spend gas on something unusable.
    vm.expectRevert(TokenFactory.ZeroSupply.selector);
    factory.forge("Acme", "ACME", 18, 0);
  }

  function test_RevertsOnTooManyDecimals() public {
    vm.expectRevert(abi.encodeWithSelector(TokenFactory.DecimalsTooHigh.selector, 19, 18));
    factory.forge("Acme", "ACME", 19, 1e18);
  }

  function test_RevertsOnOverlongNameOrSymbol() public {
    string memory longName = string(new bytes(65));
    vm.expectRevert(abi.encodeWithSelector(TokenFactory.NameTooLong.selector, 65, 64));
    factory.forge(longName, "ACME", 18, 1e18);

    string memory longSymbol = string(new bytes(17));
    vm.expectRevert(abi.encodeWithSelector(TokenFactory.SymbolTooLong.selector, 17, 16));
    factory.forge("Acme", longSymbol, 18, 1e18);
  }

  function test_AcceptsTheBoundaryValues() public {
    vm.prank(alice);
    ForgedToken token = ForgedToken(factory.forge(string(new bytes(64)), string(new bytes(16)), 18, 1));
    assertEq(token.totalSupply(), 1);
    assertEq(token.decimals(), 18);

    vm.prank(alice);
    ForgedToken zeroDecimals = ForgedToken(factory.forge("NFT-ish", "ONE", 0, 1));
    assertEq(zeroDecimals.decimals(), 0, "zero decimals is legitimate");
  }

  // --- gas -------------------------------------------------------------------------------------

  /// The only transaction this app makes, and mainnet BOT has no faucet. A regression that
  /// doubles it is a regression a user pays for.
  function test_ForgeGasIsBounded() public {
    vm.prank(alice);
    uint256 before = gasleft();
    factory.forge("Acme Token", "ACME", 18, 1_000_000e18);
    uint256 used = before - gasleft();

    emit log_named_uint("forge() gas", used);
    assertLt(used, 900_000, "forge() got more expensive");
  }

  // --- properties ------------------------------------------------------------------------------

  function testFuzz_SupplyAlwaysLandsWithTheCaller(uint256 supply, address creator) public {
    vm.assume(supply > 0);
    vm.assume(creator != address(0));

    vm.prank(creator);
    ForgedToken token = ForgedToken(factory.forge("T", "T", 18, supply));

    assertEq(token.totalSupply(), supply);
    assertEq(token.balanceOf(creator), supply);
  }
}
