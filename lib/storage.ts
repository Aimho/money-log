import { DEFAULT_EVENT_META, STORAGE_KEY } from "@/lib/constants";
import type { EventMeta, GiftEntry, PersistedLedgerState } from "@/lib/types";

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
  if (!hasStorage()) {
    return {
      entries: [],
      eventMeta: DEFAULT_EVENT_META,
      selectedGroup: null,
    };
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

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

export function savePersistedLedger(state: PersistedLedgerState) {
  if (!hasStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
