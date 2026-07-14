import { describe, expect, it } from "vitest";

import { getGroupDisplayName } from "./group";
import { buildGroupSummaries, buildLedgerSummary, filterEntries, sortEntries } from "./selectors";
import type { GiftEntry } from "./types";

const entries: GiftEntry[] = [
  {
    amount: 50000,
    createdAt: "2026-06-26T10:00:00.000Z",
    group: "",
    id: "1",
    memo: "",
    name: "김민지",
  },
  {
    amount: 100000,
    createdAt: "2026-06-26T11:00:00.000Z",
    group: "친구",
    id: "2",
    memo: "",
    name: "박준호",
  },
];

describe("group helpers", () => {
  it("maps empty groups to the uncategorized label", () => {
    expect(getGroupDisplayName("")).toBe("미분류");
  });
});

describe("ledger selectors", () => {
  it("filters by displayed group label", () => {
    expect(filterEntries(entries, "미분류")).toHaveLength(1);
    expect(filterEntries(entries, "친구")).toHaveLength(1);
  });

  it("sorts by amount descending with latest as tiebreaker", () => {
    expect(sortEntries(entries, "amount")[0]?.id).toBe("2");
  });

  it("builds summaries without losing uncategorized entries", () => {
    expect(buildGroupSummaries(entries)).toEqual([
      { count: 1, name: "미분류" },
      { count: 1, name: "친구" },
    ]);

    expect(buildLedgerSummary(entries, entries)).toMatchObject({
      averageAmount: 75000,
      filteredCount: 2,
      groupCount: 2,
      totalAmount: 150000,
      totalPeople: 2,
    });
  });
});
