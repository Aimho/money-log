import type { GiftEntry, PersistedLedgerState } from "@/lib/types";

export type LedgerOutbox = {
  deletedEntryIds: string[];
  importPending: boolean;
  importRevision: string | null;
  metadataPending: boolean;
  upsertEntries: GiftEntry[];
};

export const EMPTY_OUTBOX: LedgerOutbox = { deletedEntryIds: [], importPending: false, importRevision: null, metadataPending: false, upsertEntries: [] };

export function mergeOutbox(current: LedgerOutbox, state: PersistedLedgerState, changes: { deletedEntryIds?: string[]; importPending?: boolean; importRevision?: string; metadataPending?: boolean; upsertEntryIds?: string[] }): LedgerOutbox {
  const deleted = new Set([...current.deletedEntryIds, ...(changes.deletedEntryIds ?? [])]);
  const upserts = new Map(current.upsertEntries.map((entry) => [entry.id, entry]));
  for (const id of changes.upsertEntryIds ?? []) {
    const entry = state.entries.find((item) => item.id === id);
    if (entry) upserts.set(id, entry);
  }
  deleted.forEach((id) => upserts.delete(id));
  return {
    deletedEntryIds: [...deleted],
    importPending: current.importPending || Boolean(changes.importPending),
    importRevision: changes.importRevision ?? current.importRevision,
    metadataPending: current.metadataPending || Boolean(changes.metadataPending),
    upsertEntries: [...upserts.values()],
  };
}

export function acknowledgeOutbox(
  latest: LedgerOutbox,
  acknowledged: LedgerOutbox,
  syncedState: PersistedLedgerState,
  currentState: PersistedLedgerState,
): LedgerOutbox {
  const acknowledgedDeletes = new Set(acknowledged.deletedEntryIds);
  const acknowledgedUpserts = new Map(acknowledged.upsertEntries.map((entry) => [entry.id, JSON.stringify(entry)]));
  const upsertEntries = latest.upsertEntries.filter(
    (entry) => acknowledgedUpserts.get(entry.id) !== JSON.stringify(entry),
  );
  const metadataWasUnchanged = JSON.stringify(currentState.eventMeta) === JSON.stringify(syncedState.eventMeta);
  const importWasAcknowledged = Boolean(
    acknowledged.importPending && acknowledged.importRevision && latest.importRevision === acknowledged.importRevision,
  );

  return {
    deletedEntryIds: latest.deletedEntryIds.filter((id) => !acknowledgedDeletes.has(id)),
    importPending: latest.importPending && !importWasAcknowledged,
    importRevision: importWasAcknowledged ? null : latest.importRevision,
    metadataPending: latest.metadataPending && !(acknowledged.metadataPending && metadataWasUnchanged),
    upsertEntries,
  };
}

export function reconcileRemote(remote: PersistedLedgerState, cached: PersistedLedgerState, outbox: LedgerOutbox): PersistedLedgerState {
  const entries = new Map(remote.entries.map((entry) => [entry.id, entry]));
  outbox.deletedEntryIds.forEach((id) => entries.delete(id));
  outbox.upsertEntries.forEach((entry) => entries.set(entry.id, entry));
  return {
    entries: [...entries.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    eventMeta: outbox.metadataPending ? cached.eventMeta : remote.eventMeta,
    selectedGroup: cached.selectedGroup,
  };
}

export function reIdForImport(state: PersistedLedgerState, createId = () => crypto.randomUUID()): PersistedLedgerState {
  return { ...state, entries: state.entries.map((entry) => ({ ...entry, id: createId() })) };
}
