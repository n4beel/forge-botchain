import { parseUnits } from "viem";

/**
 * Turning what a user types into what the contract takes.
 *
 * The contract stores a raw `uint256` supply in base units, deliberately: it never has to assume
 * how a front end formats numbers. That means this conversion is the frontend's job, and getting
 * it wrong by a factor of 10^18 is the single most expensive mistake available here — a token
 * deployed with the wrong supply cannot be fixed, because nothing can mint or burn.
 */

export const MAX_NAME_BYTES = 64;
export const MAX_SYMBOL_BYTES = 16;
export const MAX_DECIMALS = 18;

const encoder = new TextEncoder();

/** The contract measures `bytes(name).length` — UTF-8 bytes, not JavaScript characters. */
export function byteLength(value: string): number {
  return encoder.encode(value).length;
}

/** Digits, optionally one decimal point. No sign, no exponent, no separators. */
const DECIMAL = /^\d*\.?\d*$/;

/**
 * Parse a typed supply into base units, or null if it is not a supply this app will deploy.
 *
 * `parseUnits` accepts things a form must not: scientific notation, signs, whitespace, and more
 * decimal places than the token has — which it silently truncates, so the user would be shown one
 * number and deploy another. The guard is a whitelist rather than a try/catch.
 */
export function parseSupply(value: string, decimals: number): bigint | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (trimmed === "" || trimmed === "." || !DECIMAL.test(trimmed)) return null;

  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) return null;

  try {
    const base = parseUnits(trimmed, decimals);
    return base > 0n ? base : null;
  } catch {
    return null;
  }
}

export type TokenDraft = {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
};

export type DraftProblem = { field: keyof TokenDraft; message: string };

/**
 * Everything wrong with a draft, in the order a user would fix it.
 *
 * Mirrors the contract's guards exactly, so the form rejects what the chain would reject rather
 * than letting a user pay gas to be told no. The contract remains the authority — this is a
 * courtesy, not a substitute, which is why the revert messages are still decoded.
 */
export function validateDraft(draft: TokenDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];

  const name = draft.name.trim();
  const symbol = draft.symbol.trim();

  if (name === "") problems.push({ field: "name", message: "A token needs a name." });
  else if (byteLength(name) > MAX_NAME_BYTES)
    problems.push({ field: "name", message: `${byteLength(name)} of ${MAX_NAME_BYTES} bytes.` });

  if (symbol === "") problems.push({ field: "symbol", message: "A token needs a symbol." });
  else if (byteLength(symbol) > MAX_SYMBOL_BYTES)
    problems.push({ field: "symbol", message: `${byteLength(symbol)} of ${MAX_SYMBOL_BYTES} bytes.` });

  if (!Number.isInteger(draft.decimals) || draft.decimals < 0 || draft.decimals > MAX_DECIMALS)
    problems.push({ field: "decimals", message: `Between 0 and ${MAX_DECIMALS}.` });

  if (parseSupply(draft.supply, draft.decimals) === null)
    problems.push({
      field: "supply",
      message:
        draft.supply.trim() === ""
          ? "A token needs a supply, and it can never change."
          : `A positive number with at most ${draft.decimals} decimal places.`,
    });

  return problems;
}

/** Group thousands for display. The input itself stays unformatted so parsing never guesses. */
export function groupDigits(value: string): string {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}
