"use client";

import { create } from "zustand";

import { DEFAULT_EVENT_META } from "@/lib/constants";
import { requestCloudSync } from "@/lib/cloud-sync";
import { clearPersistedLedger, clearUserLedger, loadPersistedLedger, loadUserLedger, savePersistedLedger, saveUserLedger } from "@/lib/storage";
import type { EntryInput, EventMeta, GiftEntry, PendingDeletion, PersistedLedgerState } from "@/lib/types";
import { createEntryId } from "@/lib/utils";

type GiftLedgerState = {
  addEntry: (input: EntryInput) => void;
  clearStorageError: () => void;
  confirmPendingDeletion: () => void;
  entries: GiftEntry[];
  eventMeta: EventMeta;
  hydrate: () => void;
  hydrateForUser: (userId: string) => void;
  hydrateForLedger: (userId: string, ledgerId: string) => void;
  hydrationError: string | null;
  isHydrated: boolean;
  pendingDeletion: PendingDeletion | null;
  requestDeleteEntry: (entryId: string) => void;
  resetPersistedLedger: () => void;
  replaceLedger: (state: PersistedLedgerState) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  storageError: string | null;
  undoPendingDeletion: () => void;
  updateEventMeta: (eventMeta: EventMeta) => void;
};

let activeUserId: string | null = null;
let activeLedgerId: string | null = null;

function persistState(entries: GiftEntry[], selectedGroup: string | null, eventMeta: EventMeta, changes?: { deletedEntryIds?: string[]; importPending?: boolean; importRevision?: string; metadataPending?: boolean; upsertEntryIds?: string[] }) {
  const state = { entries, eventMeta, selectedGroup };
  if (activeUserId && activeLedgerId) {
    saveUserLedger(activeUserId, activeLedgerId, state);
    requestCloudSync(state, changes);
  } else {
    savePersistedLedger(state);
  }
}

export const useGiftLedgerStore = create<GiftLedgerState>((set, get) => ({
  addEntry: (input) => {
    const entry: GiftEntry = {
      ...input,
      createdAt: new Date().toISOString(),
      id: createEntryId(),
    };
    const nextEntries = [entry, ...get().entries];

    try {
      persistState(nextEntries, get().selectedGroup, get().eventMeta, { upsertEntryIds: [entry.id] });
      set({ entries: nextEntries, storageError: null });
    } catch {
      set({ entries: nextEntries, storageError: "브라우저에 장부를 저장하지 못했습니다." });
    }
  },
  clearStorageError: () => {
    set({ storageError: null });
  },
  confirmPendingDeletion: () => {
    const pendingDeletion = get().pendingDeletion;

    if (!pendingDeletion) {
      return;
    }

    const nextEntries = get().entries.filter((entry) => entry.id !== pendingDeletion.entry.id);

    try {
      persistState(nextEntries, get().selectedGroup, get().eventMeta, { deletedEntryIds: [pendingDeletion.entry.id] });
      set({ entries: nextEntries, pendingDeletion: null, storageError: null });
    } catch {
      set({ entries: nextEntries, pendingDeletion: null, storageError: "삭제 내용을 브라우저에 저장하지 못했습니다." });
    }
  },
  entries: [],
  eventMeta: DEFAULT_EVENT_META,
  hydrate: () => {
    activeUserId = null;
    activeLedgerId = null;
    try {
      const persisted = loadPersistedLedger();
      set({
        entries: persisted.entries,
        eventMeta: persisted.eventMeta,
        hydrationError: null,
        isHydrated: true,
        selectedGroup: persisted.selectedGroup,
        storageError: null,
      });
    } catch {
      set({ hydrationError: "저장된 장부 데이터가 손상되어 읽을 수 없습니다.", isHydrated: true });
    }
  },
  hydrateForUser: (userId) => {
    activeUserId = userId;
    activeLedgerId = null;
    set({ entries: [], eventMeta: DEFAULT_EVENT_META, hydrationError: null, isHydrated: true, pendingDeletion: null, selectedGroup: null, storageError: null });
  },
  hydrateForLedger: (userId, ledgerId) => {
    activeUserId = userId;
    activeLedgerId = ledgerId;
    try {
      const persisted = loadUserLedger(userId, ledgerId);
      set({
        entries: persisted.entries,
        eventMeta: persisted.eventMeta,
        hydrationError: null,
        isHydrated: true,
        pendingDeletion: null,
        selectedGroup: persisted.selectedGroup,
        storageError: null,
      });
    } catch {
      set({ hydrationError: "이 계정의 기기 캐시를 읽을 수 없습니다.", isHydrated: true });
    }
  },
  hydrationError: null,
  isHydrated: false,
  pendingDeletion: null,
  requestDeleteEntry: (entryId) => {
    if (get().pendingDeletion) {
      return;
    }

    const entry = get().entries.find((item) => item.id === entryId);

    if (!entry) {
      return;
    }

    set({ pendingDeletion: { deadline: Date.now() + 3500, entry } });
  },
  resetPersistedLedger: () => {
    try {
      if (activeUserId && activeLedgerId) clearUserLedger(activeUserId, activeLedgerId);
      else clearPersistedLedger();
      set({
        entries: [],
        eventMeta: DEFAULT_EVENT_META,
        hydrationError: null,
        pendingDeletion: null,
        selectedGroup: null,
        storageError: null,
      });
    } catch {
      set({ hydrationError: "손상된 장부 데이터를 초기화하지 못했습니다." });
    }
  },
  replaceLedger: (state) => {
    try {
      persistState(state.entries, state.selectedGroup, state.eventMeta);
      set({ ...state, hydrationError: null, isHydrated: true, pendingDeletion: null, storageError: null });
    } catch {
      set({ ...state, hydrationError: null, isHydrated: true, pendingDeletion: null, storageError: "장부를 기기에 저장하지 못했습니다." });
    }
  },
  selectedGroup: null,
  setSelectedGroup: (group) => {
    try {
      persistState(get().entries, group, get().eventMeta);
      set({ selectedGroup: group, storageError: null });
    } catch {
      set({ selectedGroup: group, storageError: "필터 상태를 브라우저에 저장하지 못했습니다." });
    }
  },
  storageError: null,
  undoPendingDeletion: () => {
    set({ pendingDeletion: null });
  },
  updateEventMeta: (eventMeta) => {
    try {
      persistState(get().entries, get().selectedGroup, eventMeta, { metadataPending: true });
      set({ eventMeta, storageError: null });
    } catch {
      set({ eventMeta, storageError: "행사 정보를 브라우저에 저장하지 못했습니다." });
    }
  },
}));
