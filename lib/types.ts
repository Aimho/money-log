export type SortMode = "latest" | "amount";

export type VoiceStep = "name" | "group" | "amount";

export type EntryInput = {
  amount: number;
  group: string;
  memo: string;
  name: string;
};

export type EventMeta = {
  date: string;
  name: string;
};

export type GiftEntry = EntryInput & {
  createdAt: string;
  createdBy?: string;
  id: string;
};

export type PersistedLedgerState = {
  entries: GiftEntry[];
  eventMeta: EventMeta;
  selectedGroup: string | null;
};

export type PendingDeletion = {
  deadline: number;
  entry: GiftEntry;
};

export type GroupSummary = {
  count: number;
  name: string;
};
