import { afterEach, describe, expect, it } from "vitest";

import type { GiftEntry } from "@/lib/types";
import { useGiftLedgerStore } from "@/store/useGiftLedgerStore";

const sampleEntries: GiftEntry[] = [
  {
    amount: 100000,
    createdAt: "2026-07-14T00:00:00.000Z",
    group: "친구",
    id: "a",
    memo: "A",
    name: "홍길동",
  },
  {
    amount: 50000,
    createdAt: "2026-07-14T00:00:01.000Z",
    group: "가족",
    id: "b",
    memo: "B",
    name: "김영희",
  },
];

afterEach(() => {
  useGiftLedgerStore.setState({
    entries: [],
    eventMeta: { date: "", name: "" },
    isHydrated: false,
    pendingDeletion: null,
    selectedGroup: null,
    storageError: null,
  });
});

describe("useGiftLedgerStore delete flow", () => {
  it("keeps the first pending deletion locked until the undo window resolves", () => {
    useGiftLedgerStore.setState({
      entries: sampleEntries,
      eventMeta: { date: "", name: "" },
      isHydrated: true,
      pendingDeletion: null,
      selectedGroup: null,
      storageError: null,
    });

    useGiftLedgerStore.getState().requestDeleteEntry("a");
    const firstPending = useGiftLedgerStore.getState().pendingDeletion;

    useGiftLedgerStore.getState().requestDeleteEntry("b");
    const secondPending = useGiftLedgerStore.getState().pendingDeletion;

    expect(firstPending?.entry.id).toBe("a");
    expect(secondPending?.entry.id).toBe("a");
  });
});
