import { describe, expect, it } from "vitest";
import { byteLength, groupDigits, parseSupply, validateDraft } from "../token";

/**
 * A token's supply can never change — nothing in the contract can mint or burn — so a conversion
 * that is wrong by a factor of 10^18 is permanent. This is the most expensive thing in the app to
 * get wrong, hence the coverage.
 */
describe("parseSupply", () => {
  it("scales by the token's own decimals, not by 18", () => {
    expect(parseSupply("1", 18)).toBe(10n ** 18n);
    expect(parseSupply("1", 6)).toBe(1_000_000n);
    expect(parseSupply("1", 0)).toBe(1n);
  });

  it("handles fractional input", () => {
    expect(parseSupply("1.5", 2)).toBe(150n);
    expect(parseSupply("0.000001", 6)).toBe(1n);
  });

  it("ignores thousands separators a user pasted", () => {
    expect(parseSupply("1,000,000", 0)).toBe(1_000_000n);
  });

  // parseUnits truncates silently past the token's decimals, which would show the user one number
  // and deploy another — permanently.
  it("rejects more decimal places than the token has", () => {
    expect(parseSupply("1.123", 2)).toBeNull();
    expect(parseSupply("0.1", 0)).toBeNull();
  });

  it("rejects what a form must not accept", () => {
    expect(parseSupply("", 18)).toBeNull();
    expect(parseSupply(".", 18)).toBeNull();
    expect(parseSupply("-1", 18)).toBeNull();
    expect(parseSupply("1e18", 18)).toBeNull();
    expect(parseSupply("abc", 18)).toBeNull();
  });

  // The contract rejects a zero supply, and nothing can ever mint more, so it would be a token
  // that is permanently unusable.
  it("rejects zero", () => {
    expect(parseSupply("0", 18)).toBeNull();
    expect(parseSupply("0.0", 18)).toBeNull();
  });
});

describe("byteLength", () => {
  it("counts UTF-8 bytes, as the contract does", () => {
    expect(byteLength("ACME")).toBe(4);
    expect(byteLength("café")).toBe(5);
    expect(byteLength("🪙")).toBe(4);
  });
});

describe("validateDraft", () => {
  const good = { name: "Acme Token", symbol: "ACME", decimals: 18, supply: "1000000" };

  it("passes a sound draft", () => {
    expect(validateDraft(good)).toEqual([]);
  });

  it("catches each empty field", () => {
    expect(validateDraft({ ...good, name: "  " })[0].field).toBe("name");
    expect(validateDraft({ ...good, symbol: "" })[0].field).toBe("symbol");
    expect(validateDraft({ ...good, supply: "" })[0].field).toBe("supply");
  });

  it("mirrors the contract's limits", () => {
    expect(validateDraft({ ...good, name: "a".repeat(65) })[0].field).toBe("name");
    expect(validateDraft({ ...good, symbol: "a".repeat(17) })[0].field).toBe("symbol");
    expect(validateDraft({ ...good, decimals: 19 })[0].field).toBe("decimals");
    expect(validateDraft({ ...good, decimals: -1 })[0].field).toBe("decimals");
  });

  it("accepts the boundaries the contract accepts", () => {
    expect(validateDraft({ ...good, name: "a".repeat(64) })).toEqual([]);
    expect(validateDraft({ ...good, symbol: "a".repeat(16) })).toEqual([]);
    expect(validateDraft({ ...good, decimals: 0, supply: "1" })).toEqual([]);
    expect(validateDraft({ ...good, decimals: 18 })).toEqual([]);
  });
});

describe("groupDigits", () => {
  it("groups thousands without touching the fraction", () => {
    expect(groupDigits("1000000")).toBe("1,000,000");
    expect(groupDigits("1234.5678")).toBe("1,234.5678");
    expect(groupDigits("100")).toBe("100");
  });
});
