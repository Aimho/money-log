import type { SupabaseBrowserClient } from "@/lib/supabase/client";
import type { EventMeta, GiftEntry, PersistedLedgerState } from "@/lib/types";

type LedgerRow = {
  event_date: string | null;
  id: string;
  name: string;
  owner_id: string;
};

type EntryRow = {
  amount: number;
  created_at: string;
  created_by: string;
  group_name: string;
  id: string;
  memo: string;
  name: string;
};

export type CloudLedger = PersistedLedgerState & { isOwner: boolean; ledgerId: string };
export type LedgerListItem = { id: string; isOwner: boolean; name: string; role: "owner" | "editor" };

export function canConfirmLedgerDeletion(confirmation: string, ledgerName: string) {
  return confirmation === ledgerName;
}

export function canDeleteCloudEntry(entry: GiftEntry, userId: string | undefined, isOwner: boolean) {
  return isOwner || Boolean(userId && entry.createdBy === userId);
}

export async function listCloudLedgers(client: SupabaseBrowserClient): Promise<LedgerListItem[]> {
  const user = (await client.auth.getUser()).data.user;
  if (!user) throw new Error("Authentication required");
  const { data, error } = await client.from("ledger_members").select("role,ledgers!inner(id,name,owner_id)").eq("user_id", user.id);
  if (error) throw error;
  return (data ?? []).map((item) => {
    const ledger = item.ledgers as unknown as { id: string; name: string; owner_id: string };
    return { id: ledger.id, isOwner: ledger.owner_id === user.id, name: ledger.name || "이름 없는 행사", role: item.role as "owner" | "editor" };
  });
}

export function entryToRow(entry: GiftEntry, ledgerId: string, userId: string) {
  return {
    amount: entry.amount,
    created_at: entry.createdAt,
    group_name: entry.group,
    id: entry.id,
    ledger_id: ledgerId,
    memo: entry.memo,
    name: entry.name,
    created_by: userId,
  };
}

export function rowToEntry(row: EntryRow): GiftEntry {
  return {
    amount: Number(row.amount),
    createdAt: row.created_at,
    createdBy: row.created_by,
    group: row.group_name,
    id: row.id,
    memo: row.memo,
    name: row.name,
  };
}

export function mergeForImport(remote: CloudLedger | null, local: PersistedLedgerState): PersistedLedgerState {
  if (!remote) {
    return local;
  }

  const byId = new Map(remote.entries.map((entry) => [entry.id, entry]));
  local.entries.forEach((entry) => {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
    }
  });

  return {
    entries: [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    eventMeta: {
      date: remote.eventMeta.date || local.eventMeta.date,
      name: remote.eventMeta.name || local.eventMeta.name,
    },
    selectedGroup: null,
  };
}

export async function fetchCloudLedger(client: SupabaseBrowserClient, requestedLedgerId?: string): Promise<CloudLedger | null> {
  let query = client
    .from("ledgers")
    .select("id,name,event_date,owner_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (requestedLedgerId) query = query.eq("id", requestedLedgerId);
  const { data: ledger, error: ledgerError } = await query.maybeSingle<LedgerRow>();

  if (ledgerError) throw ledgerError;
  if (!ledger) return null;

  const { data: entries, error: entriesError } = await client
    .from("entries")
    .select("id,name,group_name,amount,memo,created_at,created_by")
    .eq("ledger_id", ledger.id)
    .order("created_at", { ascending: false })
    .returns<EntryRow[]>();

  if (entriesError) throw entriesError;

  return {
    entries: (entries ?? []).map(rowToEntry),
    eventMeta: { date: ledger.event_date ?? "", name: ledger.name },
    isOwner: (await client.auth.getUser()).data.user?.id === ledger.owner_id,
    ledgerId: ledger.id,
    selectedGroup: null,
  };
}

export async function createLedgerInvite(client: SupabaseBrowserClient, ledgerId: string) {
  const { data, error } = await client.rpc("create_ledger_invite", { target_ledger_id: ledgerId });
  if (error) throw error;
  return data as string;
}

export async function acceptLedgerInvite(client: SupabaseBrowserClient, token: string) {
  const { data, error } = await client.rpc("accept_ledger_invite", { raw_token: token });
  if (error) throw error;
  return data as string;
}

export function isInvalidInviteError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "P0001" && candidate.message === "Invite is invalid or expired";
}

export async function createCloudLedger(client: SupabaseBrowserClient, eventMeta: EventMeta) {
  const { data, error } = await client.rpc("create_ledger", {
    ledger_event_date: eventMeta.date,
    ledger_name: eventMeta.name,
  });

  if (error) throw error;
  return data as string;
}

export async function deleteCloudLedger(client: SupabaseBrowserClient, ledgerId: string, confirmedLedgerName: string) {
  const { error } = await client.rpc("delete_ledger", {
    confirmed_ledger_name: confirmedLedgerName,
    target_ledger_id: ledgerId,
  });
  if (error) throw error;
}

export async function syncCloudLedger(
  client: SupabaseBrowserClient,
  userId: string,
  ledgerId: string,
  state: PersistedLedgerState,
  canEditLedger = true,
  deletedEntryIds: string[] = [],
  upsertEntryIds: string[] = [],
) {
  if (canEditLedger) {
    const { error: ledgerError } = await client
      .from("ledgers")
      .update({ event_date: state.eventMeta.date || null, name: state.eventMeta.name || "이름 없는 행사" })
      .eq("id", ledgerId);
    if (ledgerError) throw ledgerError;
  }

  const entriesToUpsert = state.entries.filter((entry) => upsertEntryIds.includes(entry.id));
  if (entriesToUpsert.length > 0) {
    const { error: upsertError } = await client.from("entries").upsert(
      entriesToUpsert.map((entry) => entryToRow(entry, ledgerId, userId)),
      { onConflict: "id" },
    );
    if (upsertError) throw upsertError;
  }

  if (deletedEntryIds.length > 0) {
    const { error: deleteError } = await client.from("entries").delete().eq("ledger_id", ledgerId).in("id", deletedEntryIds);
    if (deleteError) throw deleteError;
  }
}
