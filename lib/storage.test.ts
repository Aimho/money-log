import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/constants";
import { clearLocalLedgerState, getActiveLedgerId, loadLedgerOutbox, loadUserLedger, saveLedgerOutbox, saveSelectedGroup, saveUserLedger, setActiveLedgerId } from "@/lib/storage";
import { EMPTY_OUTBOX } from "@/lib/sync-state";
import type { PersistedLedgerState } from "@/lib/types";

afterEach(() => vi.unstubAllGlobals());

function stubLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return values;
}

describe("ledger-scoped local cleanup", () => {
  it("stores filter selection without rewriting the full ledger snapshot", () => {
    const values = stubLocalStorage();
    const state: PersistedLedgerState = { entries: [], eventMeta: { date: "", name: "행사" }, selectedGroup: null };
    saveUserLedger("user", "ledger", state);
    const ledgerKey = `${STORAGE_KEY}:user:user:ledger:ledger`;
    const originalSnapshot = values.get(ledgerKey);

    saveSelectedGroup("user", "ledger", "친구");

    expect(values.get(ledgerKey)).toBe(originalSnapshot);
    expect(loadUserLedger("user", "ledger").selectedGroup).toBe("친구");
  });

  it("removes only the deleted ledger cache, outbox, and active pointer", () => {
    const values = stubLocalStorage();
    const state: PersistedLedgerState = { entries: [], eventMeta: { date: "", name: "행사" }, selectedGroup: null };
    saveUserLedger("user", "deleted", state);
    saveLedgerOutbox("user", "deleted", { ...EMPTY_OUTBOX, metadataPending: true });
    saveUserLedger("user", "kept", state);
    setActiveLedgerId("user", "deleted");

    clearLocalLedgerState("user", "deleted");

    expect(loadUserLedger("user", "deleted").entries).toEqual([]);
    expect(loadLedgerOutbox("user", "deleted")).toEqual(EMPTY_OUTBOX);
    expect(getActiveLedgerId("user")).toBeNull();
    expect(values.has(`${STORAGE_KEY}:user:user:ledger:kept`)).toBe(true);
  });
});
