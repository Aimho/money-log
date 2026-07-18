import { describe, expect, it } from "vitest";

import { buildAuthRedirect } from "@/lib/auth-redirect";

describe("auth redirect", () => {
  it("does not forward a ledger invitation to the OAuth provider", () => {
    expect(buildAuthRedirect({ origin: "https://money.example", pathname: "/" })).toBe(
      "https://money.example/",
    );
  });
});
