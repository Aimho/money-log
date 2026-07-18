import { describe, expect, it } from "vitest";

import { drainLedgerOutbox } from "@/lib/cloud-sync";
import { EMPTY_OUTBOX, mergeOutbox, type LedgerOutbox } from "@/lib/sync-state";
import type { GiftEntry, PersistedLedgerState } from "@/lib/types";

const entry = (id: string): GiftEntry => ({ amount: 50000, createdAt: `2026-07-18T00:00:0${id}.000Z`, group: "친구", id, memo: "", name: id });
const state = (entries: GiftEntry[]): PersistedLedgerState => ({ entries, eventMeta: { date: "", name: "행사" }, selectedGroup: null });

describe("cloud sync outbox drain", () => {
  it("coalesces a mutation burst into one latest snapshot", async () => {
    const currentState = state(Array.from({ length: 20 }, (_, index) => entry(String(index))));
    let outbox = EMPTY_OUTBOX;
    for (const item of currentState.entries) outbox = mergeOutbox(outbox, currentState, { upsertEntryIds: [item.id] });
    const snapshots: LedgerOutbox[] = [];

    await drainLedgerOutbox({
      getCurrentState: () => currentState,
      isCurrent: () => true,
      loadOutbox: () => outbox,
      saveOutbox: (next) => { outbox = next; },
      syncSnapshot: async (_state, snapshot) => { snapshots.push(snapshot); },
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].upsertEntries).toHaveLength(20);
    expect(outbox).toEqual(EMPTY_OUTBOX);
  });

  it("drains a change queued while the first snapshot is in flight without resending acknowledged entries", async () => {
    const stateA = state([entry("a")]);
    const stateB = state([entry("b"), entry("a")]);
    let currentState = stateA;
    let outbox = mergeOutbox(EMPTY_OUTBOX, stateA, { importPending: true, importRevision: "import-1", metadataPending: true, upsertEntryIds: ["a"] });
    const snapshots: LedgerOutbox[] = [];

    await drainLedgerOutbox({
      getCurrentState: () => currentState,
      isCurrent: () => true,
      loadOutbox: () => outbox,
      saveOutbox: (next) => { outbox = next; },
      syncSnapshot: async (_state, snapshot) => {
        snapshots.push(snapshot);
        if (snapshots.length === 1) {
          currentState = stateB;
          outbox = mergeOutbox(outbox, stateB, { upsertEntryIds: ["b"] });
        }
      },
    });

    expect(snapshots.map((snapshot) => snapshot.upsertEntries.map((item) => item.id))).toEqual([["a"], ["b"]]);
    expect(snapshots[0].importPending).toBe(true);
    expect(snapshots[1].importPending).toBe(false);
    expect(outbox).toEqual(EMPTY_OUTBOX);
  });

  it("leaves the outbox untouched when its generation becomes stale during sync", async () => {
    const currentState = state([entry("a")]);
    let outbox = mergeOutbox(EMPTY_OUTBOX, currentState, { deletedEntryIds: ["old"], upsertEntryIds: ["a"] });
    let current = true;

    await drainLedgerOutbox({
      getCurrentState: () => currentState,
      isCurrent: () => current,
      loadOutbox: () => outbox,
      saveOutbox: (next) => { outbox = next; },
      syncSnapshot: async () => { current = false; },
    });

    expect(outbox.deletedEntryIds).toEqual(["old"]);
    expect(outbox.upsertEntries.map((item) => item.id)).toEqual(["a"]);
  });
});
