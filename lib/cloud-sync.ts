import type { PersistedLedgerState } from "@/lib/types";
import { acknowledgeOutbox, hasOutboxChanges, type LedgerOutbox } from "@/lib/sync-state";

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

type DrainLedgerOutboxOptions = {
  getCurrentState: () => PersistedLedgerState;
  isCurrent: () => boolean;
  loadOutbox: () => LedgerOutbox;
  onAcknowledged?: (acknowledged: LedgerOutbox, remaining: LedgerOutbox) => void;
  saveOutbox: (outbox: LedgerOutbox) => void;
  syncSnapshot: (state: PersistedLedgerState, outbox: LedgerOutbox) => Promise<void>;
};

export async function drainLedgerOutbox(options: DrainLedgerOutboxOptions) {
  while (options.isCurrent()) {
    const acknowledged = options.loadOutbox();
    if (!hasOutboxChanges(acknowledged)) return;
    const syncedState = options.getCurrentState();
    await options.syncSnapshot(syncedState, acknowledged);
    if (!options.isCurrent()) return;
    const remaining = acknowledgeOutbox(options.loadOutbox(), acknowledged, syncedState, options.getCurrentState());
    options.saveOutbox(remaining);
    options.onAcknowledged?.(acknowledged, remaining);
  }
}
