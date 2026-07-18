import { describe, expect, it, vi } from "vitest";

import { canConfirmLedgerDeletion, deleteCloudLedger, entryToRow, mergeForImport, rowToEntry, type CloudLedger } from "@/lib/supabase/ledger";
import type { SupabaseBrowserClient } from "@/lib/supabase/client";
import type { GiftEntry, PersistedLedgerState } from "@/lib/types";

const localEntry: GiftEntry = {
  amount: 150000,
  createdAt: "2026-07-18T01:00:00.000Z",
  group: "친구",
  id: "11111111-1111-4111-8111-111111111111",
  memo: "",
  name: "민지",
};

describe("Supabase ledger mapping", () => {
  it("requires an exact ledger name before permanent deletion", () => {
    expect(canConfirmLedgerDeletion("민지 결혼식", "민지 결혼식")).toBe(true);
    expect(canConfirmLedgerDeletion(" 민지 결혼식", "민지 결혼식")).toBe(false);
    expect(canConfirmLedgerDeletion("민지 결혼식 ", "민지 결혼식")).toBe(false);
  });

  it("passes the exact confirmed name to the server deletion RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as SupabaseBrowserClient;

    await deleteCloudLedger(client, "ledger-id", "민지 결혼식");

    expect(rpc).toHaveBeenCalledWith("delete_ledger", {
      confirmed_ledger_name: "민지 결혼식",
      target_ledger_id: "ledger-id",
    });
  });

  it("round-trips an entry without changing public app fields", () => {
    const row = entryToRow(localEntry, "ledger-id", "user-id");
    expect(row).toMatchObject({ created_by: "user-id", group_name: "친구", ledger_id: "ledger-id" });
    expect(rowToEntry(row)).toEqual(localEntry);
  });

  it("merges a confirmed local import without overwriting remote metadata or duplicate IDs", () => {
    const remote: CloudLedger = {
      entries: [{ ...localEntry, amount: 50000 }],
      eventMeta: { date: "2026.07.18", name: "클라우드 행사" },
      isOwner: true,
      ledgerId: "ledger-id",
      selectedGroup: null,
    };
    const local: PersistedLedgerState = {
      entries: [localEntry, { ...localEntry, id: "22222222-2222-4222-8222-222222222222", name: "서준" }],
      eventMeta: { date: "", name: "로컬 행사" },
      selectedGroup: "친구",
    };

    const merged = mergeForImport(remote, local);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries.find((entry) => entry.id === localEntry.id)?.amount).toBe(50000);
    expect(merged.eventMeta).toEqual(remote.eventMeta);
    expect(merged.selectedGroup).toBeNull();
  });
});
