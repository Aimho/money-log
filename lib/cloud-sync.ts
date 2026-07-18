import type { PersistedLedgerState } from "@/lib/types";

export type CloudSyncChanges = { deletedEntryIds?: string[]; importPending?: boolean; importRevision?: string; metadataPending?: boolean; upsertEntryIds?: string[] };
type SyncHandler = (state: PersistedLedgerState, changes?: CloudSyncChanges) => void;

let syncHandler: SyncHandler | null = null;

export function configureCloudSync(handler: SyncHandler | null) {
  syncHandler = handler;
  return () => {
    if (syncHandler === handler) syncHandler = null;
  };
}

export function requestCloudSync(state: PersistedLedgerState, changes?: CloudSyncChanges) {
  syncHandler?.(state, changes);
}
