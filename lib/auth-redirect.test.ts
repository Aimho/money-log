import { describe, expect, it } from "vitest";

import { buildMagicLinkRedirect } from "@/lib/auth-redirect";

describe("magic-link redirect", () => {
  it("preserves a ledger invitation through email authentication", () => {
    expect(buildMagicLinkRedirect({ origin: "https://money.example", pathname: "/", search: "?invite=secret-token" })).toBe(
      "https://money.example/?invite=secret-token",
    );
  });
});
