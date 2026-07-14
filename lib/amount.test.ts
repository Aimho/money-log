import { describe, expect, it } from "vitest";

import { formatAmountCompact, formatAmountField, parseAmountInput } from "./amount";

describe("parseAmountInput", () => {
  it("parses numeric and comma-separated values", () => {
    expect(parseAmountInput("150000")).toBe(150000);
    expect(parseAmountInput("150,000원")).toBe(150000);
  });

  it("parses korean large-unit amounts", () => {
    expect(parseAmountInput("오만 원")).toBe(50000);
    expect(parseAmountInput("십오만")).toBe(150000);
    expect(parseAmountInput("1만 5천")).toBe(15000);
  });
});

describe("amount formatters", () => {
  it("formats input fields and compact display values", () => {
    expect(formatAmountField(150000)).toBe("15만");
    expect(formatAmountCompact(150000)).toBe("15만 원");
    expect(formatAmountCompact(0)).toBe("0원");
  });
});
