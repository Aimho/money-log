import { describe, expect, it } from "vitest";

import { EMPTY_OUTBOX, acknowledgeOutbox, mergeOutbox, reconcileRemote, reIdForImport } from "@/lib/sync-state";
import type { GiftEntry, PersistedLedgerState } from "@/lib/types";

const entry = (id: string, amount = 50000): GiftEntry => ({ amount, createdAt: `2026-07-18T00:00:0${id}.000Z`, group: "친구", id, memo: "", name: id });
const state = (entries: GiftEntry[]): PersistedLedgerState => ({ entries, eventMeta: { date: "", name: "행사" }, selectedGroup: null });

describe("durable ledger reconciliation", () => {
  it("keeps offline additions and deletions over a remote snapshot", () => {
    const cached = state([entry("2")]);
    const outbox = mergeOutbox(EMPTY_OUTBOX, cached, { deletedEntryIds: ["1"], upsertEntryIds: ["2"] });
    expect(reconcileRemote(state([entry("1")]), cached, outbox).entries.map((item) => item.id)).toEqual(["2"]);
  });

  it("re-IDs every anonymous import so account imports cannot collide", () => {
    let next = 0;
    const imported = reIdForImport(state([entry("same"), entry("same")]), () => `new-${++next}`);
    expect(imported.entries.map((item) => item.id)).toEqual(["new-1", "new-2"]);
  });

  it("acknowledges sync A without erasing change B queued while A was in flight", () => {
    const stateA = state([entry("a")]);
    const outboxA = mergeOutbox(EMPTY_OUTBOX, stateA, { metadataPending: true, upsertEntryIds: ["a"] });
    const stateB = { ...state([entry("b"), entry("a")]), eventMeta: { date: "", name: "행사 B" } };
    const latest = mergeOutbox(outboxA, stateB, { metadataPending: true, upsertEntryIds: ["b"] });

    const remaining = acknowledgeOutbox(latest, outboxA, stateA, stateB);

    expect(remaining.upsertEntries.map((item) => item.id)).toEqual(["b"]);
    expect(remaining.metadataPending).toBe(true);
  });
});
