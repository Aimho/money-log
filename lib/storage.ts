import { DEFAULT_EVENT_META, STORAGE_KEY } from "@/lib/constants";
import type { EventMeta, GiftEntry, PersistedLedgerState } from "@/lib/types";
import { EMPTY_OUTBOX, type LedgerOutbox } from "@/lib/sync-state";

const IMPORT_MARKER_PREFIX = "gift-ledger-imported-v1:";
const ACTIVE_LEDGER_PREFIX = "gift-ledger-active-v1:";

function storageKeyForLedger(userId: string, ledgerId: string) {
  return `${STORAGE_KEY}:user:${userId}:ledger:${ledgerId}`;
}

function outboxKey(userId: string, ledgerId: string) { return `${STORAGE_KEY}:outbox:${userId}:${ledgerId}`; }

function isEntry(value: unknown): value is GiftEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.group === "string" &&
    typeof candidate.memo === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.createdAt === "string"
  );
}

function isCurrentEventMeta(value: unknown): value is EventMeta {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" && typeof candidate.date === "string";
}

function isLegacyEventMeta(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string" && typeof candidate.eventDateLabel === "string";
}

function parseEventMeta(value: unknown) {
  if (value === undefined) {
    return DEFAULT_EVENT_META;
  }

  if (isCurrentEventMeta(value)) {
    return value;
  }

  if (isLegacyEventMeta(value)) {
    const legacy = value as Record<string, string>;

    return {
      date: legacy.eventDateLabel,
      name: legacy.title,
    };
  }

  throw new Error("행사 메타데이터 형식이 올바르지 않습니다.");
}

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadPersistedLedger(): PersistedLedgerState {
  return loadLedgerAtKey(STORAGE_KEY);
}

function loadLedgerAtKey(storageKey: string): PersistedLedgerState {
  if (!hasStorage()) {
    return {
      entries: [],
      eventMeta: DEFAULT_EVENT_META,
      selectedGroup: null,
    };
  }

  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return {
      entries: [],
      eventMeta: DEFAULT_EVENT_META,
      selectedGroup: null,
    };
  }

  const parsed = JSON.parse(rawValue) as Partial<PersistedLedgerState>;

  if (!Array.isArray(parsed.entries) || !parsed.entries.every(isEntry)) {
    throw new Error("저장된 항목 형식이 올바르지 않습니다.");
  }

  return {
    entries: parsed.entries,
    eventMeta: parseEventMeta(parsed.eventMeta),
    selectedGroup: typeof parsed.selectedGroup === "string" ? parsed.selectedGroup : null,
  };
}

export function loadUserLedger(userId: string, ledgerId: string) {
  return loadLedgerAtKey(storageKeyForLedger(userId, ledgerId));
}

export function savePersistedLedger(state: PersistedLedgerState) {
  if (!hasStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveUserLedger(userId: string, ledgerId: string, state: PersistedLedgerState) {
  if (!hasStorage()) return;
  window.localStorage.setItem(storageKeyForLedger(userId, ledgerId), JSON.stringify(state));
}

export function clearUserLedger(userId: string, ledgerId: string) {
  if (!hasStorage()) return;
  window.localStorage.removeItem(storageKeyForLedger(userId, ledgerId));
}

export function loadLedgerOutbox(userId: string, ledgerId: string): LedgerOutbox {
  if (!hasStorage()) return EMPTY_OUTBOX;
  const raw = window.localStorage.getItem(outboxKey(userId, ledgerId));
  if (!raw) return EMPTY_OUTBOX;
  try { return { ...EMPTY_OUTBOX, ...(JSON.parse(raw) as LedgerOutbox) }; } catch { return EMPTY_OUTBOX; }
}

export function saveLedgerOutbox(userId: string, ledgerId: string, outbox: LedgerOutbox) {
  if (!hasStorage()) return;
  window.localStorage.setItem(outboxKey(userId, ledgerId), JSON.stringify(outbox));
}

export function hasCompletedLocalImport(userId: string) {
  return hasStorage() && window.localStorage.getItem(`${IMPORT_MARKER_PREFIX}${userId}`) === "true";
}

export function markLocalImportComplete(userId: string) {
  if (!hasStorage()) return;
  window.localStorage.setItem(`${IMPORT_MARKER_PREFIX}${userId}`, "true");
}

export function getActiveLedgerId(userId: string) {
  return hasStorage() ? window.localStorage.getItem(`${ACTIVE_LEDGER_PREFIX}${userId}`) : null;
}

export function setActiveLedgerId(userId: string, ledgerId: string) {
  if (!hasStorage()) return;
  window.localStorage.setItem(`${ACTIVE_LEDGER_PREFIX}${userId}`, ledgerId);
}

export function clearLocalLedgerState(userId: string, ledgerId: string) {
  if (!hasStorage()) return;
  window.localStorage.removeItem(storageKeyForLedger(userId, ledgerId));
  window.localStorage.removeItem(outboxKey(userId, ledgerId));
  if (getActiveLedgerId(userId) === ledgerId) {
    window.localStorage.removeItem(`${ACTIVE_LEDGER_PREFIX}${userId}`);
  }
}

export function clearPersistedLedger() {
  if (!hasStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
