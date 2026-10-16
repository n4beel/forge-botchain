/**
 * TokenFactory's ABI, and the slice of ERC-20 the UI reads back from a forged token.
 *
 * Hand-written and `as const` rather than imported from `contracts/out`. The const assertion is
 * what gives viem and wagmi their argument and return types; a generated JSON artifact loses that
 * unless it is cast, and a mistyped argument would then only surface as a revert.
 */
export const tokenFactoryAbi = [
  {
    type: "function",
    name: "forge",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "decimals", type: "uint8" },
      { name: "supply", type: "uint256" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "event",
    name: "TokenForged",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "decimals", type: "uint8", indexed: false },
      { name: "supply", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "EmptyName", inputs: [] },
  { type: "error", name: "EmptySymbol", inputs: [] },
  { type: "error", name: "ZeroSupply", inputs: [] },
  {
    type: "error",
    name: "NameTooLong",
    inputs: [{ name: "length", type: "uint256" }, { name: "max", type: "uint256" }],
  },
  {
    type: "error",
    name: "SymbolTooLong",
    inputs: [{ name: "length", type: "uint256" }, { name: "max", type: "uint256" }],
  },
  {
    type: "error",
    name: "DecimalsTooHigh",
    inputs: [{ name: "decimals", type: "uint8" }, { name: "max", type: "uint8" }],
  },
] as const;

/** Only what the UI reads back to confirm a token is real. Not a full ERC-20 interface. */
export const forgedTokenAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
